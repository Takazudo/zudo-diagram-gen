import { test } from 'vitest';
import assert from 'node:assert/strict';
import worker, { mapLegacyUrl } from '../worker/index.mjs';

const documentationOrigin = 'https://zudo-diagram-gen-doc.zudolab.dev';
const legacyOrigin = 'https://zudo-diagram-gen.zudolab.dev';

test('legacy URLs map the moved pages, including slashless paths and query strings', () => {
  const cases = [
    ['/', '/'],
    ['/tones', '/docs/tones/'],
    ['/tones/', '/docs/tones/'],
    ['/examples', '/docs/examples/'],
    ['/examples/', '/docs/examples/'],
    ['/examples/project-text', '/docs/examples/project-text/'],
    ['/examples/project-text/', '/docs/examples/project-text/'],
    ['/workbench', '/docs/workbench/'],
    ['/workbench/', '/docs/workbench/'],
    ['/assets/site.css', '/assets/site.css'],
    ['/docs/getting-started/', '/docs/getting-started/'],
    ['/does-not-exist', '/does-not-exist'],
  ];

  for (const [path, expectedPath] of cases) {
    assert.equal(mapLegacyUrl(`${legacyOrigin}${path}`), `${documentationOrigin}${expectedPath}`);
  }

  assert.equal(
    mapLegacyUrl(`${legacyOrigin}/docs/getting-started/?q=1`),
    `${documentationOrigin}/docs/getting-started/?q=1`,
  );
  assert.equal(mapLegacyUrl(`${documentationOrigin}/tones/`), null);
});

test('legacy requests redirect and requests on other hosts pass through to assets', async () => {
  const legacyRequest = new Request(`${legacyOrigin}/examples/project-text?view=full`);
  const redirect = await worker.fetch(legacyRequest, {
    ASSETS: { fetch: () => assert.fail('legacy requests should redirect before asset lookup') },
  });
  assert.equal(redirect.status, 301);
  assert.equal(
    redirect.headers.get('location'),
    `${documentationOrigin}/docs/examples/project-text/?view=full`,
  );

  const assetRequest = new Request(`${documentationOrigin}/assets/site.css`);
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
});
