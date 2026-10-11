import { afterEach, test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { h, flush } from '@takazudo/zfb/zudo-react';
import { mount } from '@takazudo/zfb/zudo-react/client';
import { mountDiagramApp } from '@takazudo/zudo-diagram-gen/client/mount';
import DiagramWorkbench from '../src/components/diagram-workbench.tsx';

vi.mock('@takazudo/zudo-diagram-gen/client/mount', () => ({ mountDiagramApp: vi.fn() }));

const cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

function pending() {
  let resolve;
  const promise = new Promise((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

function setup(fetch) {
  const window = new Window({ url: 'https://diagram.test/' });
  cleanups.push(() => window.happyDOM.abort());
  for (const name of [
    'Node',
    'Element',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLSelectElement',
    'HTMLTextAreaElement',
    'document',
  ])
    vi.stubGlobal(name, window[name]);
  vi.stubGlobal('fetch', fetch);
  const container = window.document.createElement('div');
  container.setAttribute('data-zfb-island-skip-ssr', 'DiagramWorkbench');
  container.setAttribute('data-zfb-protocol', 'zudo-react/1');
  container.setAttribute('data-zfb-build', 'lifecycle-test');
  container.setAttribute('data-zfb-transport', 'json/1');
  window.document.body.append(container);
  const diagnostics = [];
  const root = mount(h(DiagramWorkbench, { dataUrl: '/gallery.json' }), container, {
    identity: { component: 'DiagramWorkbench', build: 'lifecycle-test' },
    report: (diagnostic) => diagnostics.push(diagnostic),
  });
  assert.ok(root, JSON.stringify(diagnostics));
  cleanups.push(() => root.dispose());
  return { root, container, diagnostics };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  flush();
}

test('workbench activates once and disposes its mount and fetch on root cleanup', async () => {
  const response = pending();
  const fetch = vi.fn(() => response.promise);
  const dispose = vi.fn();
  mountDiagramApp.mockReturnValue(dispose);
  const { root, container, diagnostics } = setup(fetch);
  assert.match(container.querySelector('[role="status"]').textContent, /Loading/);
  assert.equal(fetch.mock.calls.length, 1);
  const signal = fetch.mock.calls[0][1].signal;
  assert.equal(signal.aborted, false);
  const data = { session: { id: 'fixture' } };
  response.resolve({ ok: true, json: async () => data });
  await settle();
  assert.equal(mountDiagramApp.mock.calls.length, 1);
  const [element, mountedData, options] = mountDiagramApp.mock.calls[0];
  assert.ok(container.contains(element));
  assert.equal(mountedData, data);
  assert.deepEqual(options, { embedded: true });
  assert.equal(container.querySelector('[role="status"]'), null);
  assert.deepEqual(diagnostics, []);
  root.dispose();
  root.dispose();
  assert.equal(signal.aborted, true);
  assert.equal(dispose.mock.calls.length, 1);
});

test('late JSON from a disposed workbench cannot mount into its former host', async () => {
  const json = pending();
  const fetch = vi.fn(async () => ({ ok: true, json: () => json.promise }));
  const { root, diagnostics } = setup(fetch);
  await settle();
  root.dispose();
  assert.equal(fetch.mock.calls[0][1].signal.aborted, true);
  json.resolve({ session: { id: 'stale' } });
  await settle();
  assert.equal(mountDiagramApp.mock.calls.length, 0);
  assert.deepEqual(diagnostics, []);
});

test('an HTTP failure replaces loading with the accessible recovery message', async () => {
  const { container, diagnostics } = setup(vi.fn(async () => ({ ok: false, status: 503 })));
  await settle();
  assert.equal(container.querySelector('[role="status"]'), null);
  assert.match(container.querySelector('[role="alert"]').textContent, /reload the page/);
  assert.equal(mountDiagramApp.mock.calls.length, 0);
  assert.deepEqual(diagnostics, []);
});
