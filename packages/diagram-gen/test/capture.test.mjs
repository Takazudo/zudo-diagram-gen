import { it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const state = vi.hoisted(() => ({
  mode: 'timeout',
  browserClosed: 0,
  contextClosed: 0,
  reject: null,
}));
vi.mock('../src/capture-runtime.mjs', () => ({
  captureSetup: 'Explicit setup required',
  loadCaptureCapability: async () => ({
    launch: async () => ({
      version: () => 'test-browser',
      close: async () => {
        state.browserClosed++;
        state.reject?.(new Error('Browser closed'));
      },
      newContext: async () => ({
        route: async () => {},
        close: async () => {
          state.contextClosed++;
          state.reject?.(new Error('Context closed'));
        },
        newPage: async () => ({
          setDefaultTimeout: () => {},
          goto: async () => {},
          evaluate: async () => {
            if (state.mode === 'decode') throw new Error('Image decode failed');
            return new Promise((_, reject) => {
              state.reject = reject;
            });
          },
        }),
      }),
    }),
  }),
}));
import { captureCandidate } from '../src/capture.mjs';
let root;
afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  state.reject = null;
  state.browserClosed = 0;
  state.contextClosed = 0;
});
async function fixture() {
  root = await mkdtemp(path.join(os.tmpdir(), 'capture-failure-'));
  const c = path.join(root, 'rounds', 'r01', 'c01');
  await mkdir(c, { recursive: true });
  for (const [file, data] of [
    [
      'session.json',
      { schemaVersion: 1, id: 'test', title: 'Test', target: { width: 480, height: 140 } },
    ],
    ['rounds/r01/round.json', { schemaVersion: 1, id: 'r01', title: 'Round', order: 1 }],
    [
      'rounds/r01/c01/candidate.json',
      {
        schemaVersion: 1,
        id: 'c01',
        title: 'Candidate',
        toneId: 'swiss-grid',
        order: 1,
        assets: { light: 'light.svg' },
      },
    ],
  ])
    await writeFile(path.join(root, file), JSON.stringify(data));
  await writeFile(
    path.join(c, 'light.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 140" aria-label="Test"><rect width="480" height="140" fill="#ffffff"/></svg>',
  );
  return path.join(root, 'exports', 'failure.png');
}
it('readiness timeout closes server/browser/context and leaves no output', async () => {
  state.mode = 'timeout';
  const output = await fixture();
  await expect(captureCandidate(root, 'c01', { output, timeoutMs: 1000 })).rejects.toMatchObject({
    code: 'VALIDATION_FAILED',
    message: 'Capture readiness timed out.',
  });
  expect(state.contextClosed).toBeGreaterThan(0);
  expect(state.browserClosed).toBeGreaterThan(0);
  expect(await readdir(root)).not.toContain('exports');
});
it('active cancellation interrupts readiness and cleans owned resources', async () => {
  state.mode = 'timeout';
  const output = await fixture();
  const controller = new AbortController();
  const capture = captureCandidate(root, 'c01', { output, signal: controller.signal });
  const timer = setInterval(() => {
    if (state.reject) {
      clearInterval(timer);
      controller.abort();
    }
  }, 5);
  try {
    await expect(capture).rejects.toMatchObject({ code: 'CANCELLED' });
  } finally {
    clearInterval(timer);
  }
  expect(state.contextClosed).toBeGreaterThan(0);
  expect(state.browserClosed).toBeGreaterThan(0);
  expect(await readdir(root)).not.toContain('exports');
});
it('decode failure cleans resources and retains structured diagnostic', async () => {
  state.mode = 'decode';
  const output = await fixture();
  await expect(captureCandidate(root, 'c01', { output })).rejects.toMatchObject({
    code: 'VALIDATION_FAILED',
    message: 'Image decode failed',
  });
  expect(state.contextClosed).toBeGreaterThan(0);
  expect(state.browserClosed).toBeGreaterThan(0);
  expect(await readdir(root)).not.toContain('exports');
});
