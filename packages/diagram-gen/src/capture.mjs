import { createServer } from 'node:http';
import { access, lstat, realpath, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { inspectCaptureSvg } from './capture-inputs.mjs';
import { loadSession } from './model.mjs';
import { assertSourceOutput } from './source-protection.mjs';
import {
  loadPlacement,
  renderPlacement,
  hashBytes,
  canonicalHash,
  CaptureError,
  contained,
  readCaptureInput,
} from './placement.mjs';
import { loadCaptureCapability, captureSetup as setup } from './capture-runtime.mjs';
const fail = (code, message) => {
  throw new CaptureError(code, message);
};
async function outputDestination(file, root, protectedFiles, force) {
  const absolute = path.resolve(file);
  let ancestor = path.dirname(absolute);
  const suffix = [];
  while (true) {
    try {
      ancestor = await realpath(ancestor);
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      suffix.unshift(path.basename(ancestor));
      const next = path.dirname(ancestor);
      if (next === ancestor) throw error;
      ancestor = next;
    }
  }
  const resolved = path.join(ancestor, ...suffix, path.basename(absolute));
  // Only exports/ is an output area inside source; all other source trees are protected.
  if (
    (contained(root, absolute) && !contained(path.join(root, 'exports'), absolute)) ||
    (contained(root, resolved) && !contained(path.join(root, 'exports'), resolved)) ||
    protectedFiles.includes(resolved)
  )
    fail('RESOURCE_UNSAFE', 'Output overlaps protected session/placement/reference source.');
  try {
    const info = await lstat(absolute);
    if (info.isSymbolicLink() || !info.isFile())
      fail('RESOURCE_UNSAFE', 'Output must not be a symlink or non-file.');
    if (!force) fail('OUTPUT_CONFLICT', 'Output or provenance sidecar already exists.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return resolved;
}
async function runCapture(sessionRoot, candidateId, options = {}) {
  const {
    theme = 'light',
    dpr = 1,
    crop = 'frame',
    timeoutMs = 30000,
    output,
    force = false,
    signal,
    browserExecutablePath,
  } = options;
  if (
    typeof output !== 'string' ||
    !output ||
    typeof force !== 'boolean' ||
    (browserExecutablePath !== undefined && typeof browserExecutablePath !== 'string') ||
    !/\.png$/i.test(output) ||
    !['light', 'dark'].includes(theme) ||
    !['frame', 'slot'].includes(crop) ||
    !Number.isFinite(dpr) ||
    dpr < 0.5 ||
    dpr > 4 ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 60000
  )
    fail(
      'INVALID_ARGUMENT',
      'Supply PNG output, light/dark theme, frame/slot crop, DPR 0.5–4 and timeout 1000–60000ms.',
    );
  const root = await realpath(sessionRoot);
  const resourceRoot = options.resourceRoot ? await realpath(options.resourceRoot) : root;
  if (!contained(resourceRoot, root))
    fail('RESOURCE_UNSAFE', 'Session escapes explicit resourceRoot.');
  let data;
  try {
    data = await loadSession(root);
  } catch (error) {
    fail('VALIDATION_FAILED', error.message);
  }
  const candidate = data.candidates.find((c) => c.id === candidateId);
  if (!candidate || !candidate.assets[theme])
    fail('VALIDATION_FAILED', 'Candidate or explicit theme asset unavailable.');
  const svg = candidate.assets[theme];
  const metadataInput = await readCaptureInput(
    root,
    path.join(root, candidate.sourcePath),
    1048576,
    'Candidate metadata',
  );
  const metadata = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(metadataInput.bytes),
  );
  const styleHash = metadata.provenance?.styleHash ?? null;
  if (styleHash !== null && !/^[a-f0-9]{64}$/.test(styleHash))
    fail('VALIDATION_FAILED', 'Invalid optional styleHash.');
  const { embeddedBytes } = inspectCaptureSvg(svg);
  const placement = await loadPlacement(resourceRoot, data.session.target, options);
  const frame = placement.descriptor.frame;
  const rect =
    crop === 'slot'
      ? placement.descriptor.slot
      : { x: 0, y: 0, width: frame.width, height: frame.height };
  if (
    Math.ceil(frame.width * dpr) * Math.ceil(frame.height * dpr) > 40000000 ||
    placement.inputBytes + Buffer.byteLength(svg) + embeddedBytes > 64 * 1024 * 1024
  )
    fail('RESOURCE_UNSAFE', 'Capture exceeds 40 million physical pixels or 64 MiB input budget.');
  const protectedFiles = [placement.placementFile, ...placement.images.map((i) => i.file)].filter(
    Boolean,
  );
  const out = await outputDestination(output, resourceRoot, protectedFiles, force);
  const sidecar = await outputDestination(`${output}.json`, resourceRoot, protectedFiles, force);
  await assertSourceOutput(resourceRoot, out, { sessionRoot: root });
  await assertSourceOutput(resourceRoot, sidecar, { sessionRoot: root });
  if (browserExecutablePath) {
    try {
      const info = await lstat(browserExecutablePath);
      if (!info.isFile()) throw new Error('not regular');
      await access(browserExecutablePath, constants.X_OK);
    } catch {
      fail(
        'CAPTURE_UNAVAILABLE',
        'browserExecutablePath must name an executable regular file. ' + setup,
      );
    }
  }
  const chromium = await loadCaptureCapability();
  let browser, context, server;
  let cancelled = false;
  let timedOut = false;
  let rejectStop;
  const stop = new Promise((_, reject) => {
    rejectStop = reject;
  });
  const onAbort = () => {
    cancelled = true;
    rejectStop(new CaptureError('CANCELLED', 'Capture cancelled.'));
  };
  if (signal?.aborted) fail('CANCELLED', 'Capture cancelled.');
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    rejectStop(new CaptureError('VALIDATION_FAILED', 'Capture readiness timed out.'));
  }, timeoutMs);
  const temporary = [];
  try {
    const task = (async () => {
      try {
        browser = await chromium.launch({
          headless: true,
          ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
          timeout: timeoutMs,
        });
      } catch (error) {
        fail(
          'CAPTURE_UNAVAILABLE',
          `Browser launch failed: ${error.message.split('\n')[0]}. ${setup}`,
        );
      }
      if (cancelled || timedOut) {
        await browser.close();
        fail(cancelled ? 'CANCELLED' : 'VALIDATION_FAILED', 'Capture stopped.');
      }
      context = await browser.newContext({
        viewport: { width: Math.ceil(frame.width), height: Math.ceil(frame.height) },
        deviceScaleFactor: dpr,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      const svgUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style>${renderPlacement(placement.descriptor, { svgUrl, title: candidate.title, images: placement.images })}`;
      server = createServer((req, res) => {
        if (req.url !== '/') {
          res.writeHead(404);
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src 'none'; script-src 'none'",
        );
        res.end(html);
      });
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const url = `http://127.0.0.1:${server.address().port}/`;
      let blocked = false;
      await context.route('**/*', (route) =>
        route.request().url() === url ? route.continue() : ((blocked = true), route.abort()),
      );
      const page = await context.newPage();
      page.setDefaultTimeout(timeoutMs);
      await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
      const readiness = await page.evaluate(async (fonts) => {
        await document.fonts.ready;
        for (const family of fonts) {
          if (
            [
              'serif',
              'sans-serif',
              'monospace',
              'cursive',
              'fantasy',
              'system-ui',
              'ui-serif',
              'ui-sans-serif',
              'ui-monospace',
              'ui-rounded',
              'emoji',
              'math',
              'fangsong',
            ].includes(family.toLowerCase())
          )
            continue;
          const face = new FontFace(`capture-check-${fonts.indexOf(family)}`, `local("${family}")`);
          try {
            await face.load();
          } catch {
            throw new Error(`Declared font unavailable: ${family}`);
          }
        }
        for (const image of document.images) {
          await image.decode();
          if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image decode failed');
          if (image.naturalWidth * image.naturalHeight > 40000000)
            throw new Error('Decoded image exceeds pixel budget');
        }
        const context = document.querySelector('[data-placement-context]');
        const frame = document.querySelector('[data-placement-frame]').getBoundingClientRect();
        if (context) {
          const r = context.getBoundingClientRect();
          if (
            r.left < frame.left ||
            r.top < frame.top ||
            r.right > frame.right ||
            r.bottom > frame.bottom ||
            context.scrollWidth > context.clientWidth
          )
            throw new Error('Placement context overflows frame');
        }
        const contextOverlapsSlot = context
          ? (() => {
              const a = context.getBoundingClientRect(),
                b = document.querySelector('[data-placement-diagram]').getBoundingClientRect();
              return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            })()
          : false;
        if (contextOverlapsSlot) throw new Error('Placement context overlaps diagram slot');
        return {
          fonts: fonts.map((family) => ({
            family,
            ready: true,
            generic: [
              'serif',
              'sans-serif',
              'monospace',
              'cursive',
              'fantasy',
              'system-ui',
              'ui-serif',
              'ui-sans-serif',
              'ui-monospace',
              'ui-rounded',
              'emoji',
              'math',
              'fangsong',
            ].includes(family.toLowerCase()),
          })),
          slot: document.querySelector('[data-placement-diagram]').getBoundingClientRect().toJSON(),
        };
      }, placement.descriptor.fonts || []);
      if (blocked) fail('RESOURCE_UNSAFE', 'Capture attempted an unexpected network request.');
      const png = await page.screenshot({
        type: 'png',
        clip: rect,
        omitBackground: frame.background === 'transparent',
        animations: 'disabled',
        timeout: timeoutMs,
      });
      // PNG IHDR gives actual physical dimensions, including fractional DPR rounding.
      const pixelDimensions = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
      const provenance = {
        schemaVersion: 1,
        sessionId: data.session.id,
        candidateId,
        fingerprint: candidate.fingerprint,
        assetHash: hashBytes(svg),
        styleHash,
        placementHash: placement.placementHash,
        theme,
        crop,
        frame,
        slot: placement.descriptor.slot,
        dpr,
        pixelDimensions,
        viewport: { width: Math.ceil(frame.width), height: Math.ceil(frame.height) },
        browser: {
          name: 'chromium',
          version: browser.version(),
          systemExecutable: Boolean(browserExecutablePath),
        },
        environment: {
          os: `${os.platform()} ${os.release()} ${os.arch()}`,
          fonts: readiness.fonts,
        },
        referenceImages: placement.imageHashes,
        imageHash: hashBytes(png),
        capturedAt: new Date().toISOString(),
        inspected: false,
        limitations: [
          'Font readiness does not certify Japanese glyph coverage, text shaping, readable labels, SVG internal clipping or semantic correctness.',
        ],
      };
      provenance.captureHash = canonicalHash({ ...provenance, capturedAt: null });
      return { png, provenance };
    })();
    // Wait for task settlement after closing resources on cancellation, avoiding leaked launches/servers.
    let result;
    try {
      result = await Promise.race([task, stop]);
    } catch (error) {
      await context?.close().catch(() => {});
      await browser?.close().catch(() => {});
      await task.catch(() => {});
      throw error;
    }
    if (cancelled || timedOut)
      fail(
        cancelled ? 'CANCELLED' : 'VALIDATION_FAILED',
        'Capture stopped before output publication.',
      );
    await mkdir(path.dirname(out), { recursive: true });
    await mkdir(path.dirname(sidecar), { recursive: true });
    const pngTemp = `${out}.${randomUUID()}.tmp`;
    const jsonTemp = `${sidecar}.${randomUUID()}.tmp`;
    temporary.push(pngTemp, jsonTemp);
    await writeFile(pngTemp, result.png, { flag: 'wx' });
    await writeFile(jsonTemp, JSON.stringify(result.provenance, null, 2) + '\n', { flag: 'wx' });
    // Revalidate immediately before publishing; no-force uses exclusive destination creation.
    await outputDestination(output, resourceRoot, protectedFiles, force);
    await outputDestination(`${output}.json`, resourceRoot, protectedFiles, force);
    await assertSourceOutput(resourceRoot, out, { sessionRoot: root });
    await assertSourceOutput(resourceRoot, sidecar, { sessionRoot: root });
    if (cancelled || timedOut)
      fail(
        cancelled ? 'CANCELLED' : 'VALIDATION_FAILED',
        'Capture stopped before output publication.',
      );
    if (force) {
      await rename(pngTemp, out);
      await rename(jsonTemp, sidecar);
    } else {
      await writeFile(out, result.png, { flag: 'wx' });
      try {
        await writeFile(sidecar, JSON.stringify(result.provenance, null, 2) + '\n', { flag: 'wx' });
      } catch (error) {
        await rm(out);
        throw error;
      }
    }
    return { output: out, sidecar, provenance: result.provenance };
  } catch (error) {
    if (error instanceof CaptureError) throw error;
    throw new CaptureError(
      error.code === 'RESOURCE_UNSAFE'
        ? 'RESOURCE_UNSAFE'
        : error.code === 'EEXIST'
          ? 'OUTPUT_CONFLICT'
          : error.code?.startsWith('E')
            ? 'IO_ERROR'
            : 'VALIDATION_FAILED',
      error.code?.startsWith('E')
        ? 'Capture I/O failed; check the supplied paths and permissions.'
        : error.message,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    if (server)
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
    await Promise.all(temporary.map((file) => rm(file, { force: true })));
  }
}

export async function captureCandidate(sessionRoot, candidateId, options = {}) {
  try {
    return await runCapture(sessionRoot, candidateId, options);
  } catch (error) {
    if (error instanceof CaptureError) throw error;
    throw new CaptureError(
      error.code === 'RESOURCE_UNSAFE'
        ? 'RESOURCE_UNSAFE'
        : error.code?.startsWith('E')
          ? 'IO_ERROR'
          : 'VALIDATION_FAILED',
      error.code?.startsWith('E')
        ? 'Capture input/output could not be accessed safely.'
        : error.message,
    );
  }
}
