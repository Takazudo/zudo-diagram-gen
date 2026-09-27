const SITE_HOST = 'zudo-diagram-gen.zudolab.dev';

export function mapShortPath(pathname) {
  if (pathname === '/tones' || pathname === '/tones/') return '/docs/tones/';
  if (pathname === '/examples' || pathname === '/examples/') return '/docs/examples/';
  if (pathname === '/workbench' || pathname === '/workbench/') return '/docs/workbench/';

  const exampleMatch = pathname.match(/^\/examples\/([^/]+)\/?$/);
  if (exampleMatch) return `/docs/examples/${exampleMatch[1]}/`;

  return null;
}

export default {
  fetch(request, env) {
    const destination = new URL(request.url);
    const destinationPath =
      destination.hostname === SITE_HOST ? mapShortPath(destination.pathname) : null;
    if (destinationPath) {
      destination.protocol = 'https:';
      destination.hostname = SITE_HOST;
      destination.port = '';
      destination.pathname = destinationPath;
      destination.hash = '';
      return new Response(null, {
        status: 301,
        headers: { location: destination.href },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
