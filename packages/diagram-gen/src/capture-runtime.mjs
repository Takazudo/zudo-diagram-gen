import { createRequire } from 'node:module';
import { CaptureError } from './placement.mjs';
export const captureSetup =
  'Run pnpm add -D playwright@1.59.1, then pnpm exec playwright install chromium (install OS dependencies separately if needed), or explicitly supply browserExecutablePath.';
/** Resolve the optional consumer peer lazily; handles both ESM and CJS entrypoints. */
export async function loadCaptureCapability() {
  try {
    const require = createRequire(import.meta.url);
    const capability = await import(require.resolve('playwright'));
    const chromium = capability.chromium ?? capability.default?.chromium;
    if (!chromium?.launch) throw new Error('Missing Chromium capability');
    return chromium;
  } catch {
    throw new CaptureError('CAPTURE_UNAVAILABLE', captureSetup);
  }
}
