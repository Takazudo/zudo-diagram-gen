import { test } from 'vitest';
import assert from 'node:assert/strict';
import worker, { mapShortPath } from '../worker/index.mjs';

const siteOrigin = 'https://zudo-diagram-gen.zudolab.dev';

test('short site paths map to their documentation routes', () => {
  const cases = [
    ['/tones', '/docs/tones/'],
    ['/tones/', '/docs/tones/'],
    ['/examples', '/docs/examples/'],
    ['/examples/', '/docs/examples/'],
    ['/examples/project-text', '/docs/examples/project-text/'],
    ['/examples/project-text/', '/docs/examples/project-text/'],
    ['/workbench', '/docs/workbench/'],
    ['/workbench/', '/docs/workbench/'],
  ];

  for (const [path, expectedPath] of cases) {
    assert.equal(mapShortPath(path), expectedPath);
  }

  assert.equal(mapShortPath('/'), null);
  assert.equal(mapShortPath('/assets/site.css'), null);
  assert.equal(mapShortPath('/examples/project-text/nested/'), null);
});

test('short paths redirect on the site host with their query string', async () => {
  const request = new Request(`${siteOrigin}/examples/project-text?view=full`);
  const redirect = await worker.fetch(request, {
    ASSETS: { fetch: () => assert.fail('short paths should redirect before asset lookup') },
  });
  assert.equal(redirect.status, 301);
  assert.equal(
    redirect.headers.get('location'),
    `${siteOrigin}/docs/examples/project-text/?view=full`,
  );
});

test('all other requests pass through to assets, including short paths on another host', async () => {
  const assetRequest = new Request(`${siteOrigin}/assets/site.css`);
  const assetResponse = new Response('asset');
  let forwarded;
  const response = await worker.fetch(assetRequest, {
    ASSETS: {
      fetch(request) {
        forwarded = request;
        return assetResponse;
      },
    },
  });
  assert.equal(response, assetResponse);
  assert.equal(forwarded, assetRequest);

  const previewRequest = new Request('https://preview.example.workers.dev/tones/');
  forwarded = undefined;
  const previewResponse = await worker.fetch(previewRequest, {
    ASSETS: {
      fetch(request) {
        forwarded = request;
        return assetResponse;
      },
    },
  });
  assert.equal(previewResponse, assetResponse);
  assert.equal(forwarded, previewRequest);
});
