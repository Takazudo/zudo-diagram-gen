const LEGACY_HOST = 'zudo-diagram-gen.zudolab.dev';
const DOCUMENTATION_HOST = 'zudo-diagram-gen-doc.zudolab.dev';

function mapLegacyPath(pathname) {
  if (pathname === '/tones' || pathname === '/tones/') return '/docs/tones/';
  if (pathname === '/examples' || pathname === '/examples/') return '/docs/examples/';
  if (pathname === '/workbench' || pathname === '/workbench/') return '/docs/workbench/';

  const exampleMatch = pathname.match(/^\/examples\/([^/]+)\/?$/);
  if (exampleMatch) return `/docs/examples/${exampleMatch[1]}/`;

  return pathname;
}

export function mapLegacyUrl(input) {
  const source = new URL(input);
  if (source.hostname !== LEGACY_HOST) return null;

  const destination = new URL(source.href);
  destination.protocol = 'https:';
  destination.hostname = DOCUMENTATION_HOST;
  destination.port = '';
  destination.pathname = mapLegacyPath(source.pathname);
  destination.hash = '';
  return destination.href;
}

export default {
  fetch(request, env) {
    const redirectUrl = mapLegacyUrl(request.url);
    if (redirectUrl) {
      return new Response(null, {
        status: 301,
        headers: { location: redirectUrl },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
