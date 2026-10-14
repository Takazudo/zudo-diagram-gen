/// <reference types="@takazudo/zudo-doc/virtual-modules.d.ts" />
import { routeContext } from 'virtual:zudo-doc-route-context';
import { createRouteContext, type RouteContextPayload } from '@takazudo/zudo-doc/route-context';
import { createDocumentationChrome } from '../../src/documentation-chrome';
import { chromeBindings } from 'virtual:zudo-doc-chrome-bindings';
// Keep the client island statically reachable by zfb's island scanner.
import '../../src/chrome-bindings';
import { documentationSection, editorialRoutes } from '../../src/documentation-navigation';

const routeCtx = createRouteContext(routeContext as unknown as RouteContextPayload);
const { renderDocPage } = createDocumentationChrome(
  { ...routeCtx, getNavSectionForSlug: documentationSection },
  chromeBindings,
);

export const frontmatter = { title: 'Documentation' };

export function paths(): Array<{ params: { slug: string[] }; props: unknown }> {
  const locale = routeCtx.defaultLocale;
  const source = routeCtx.resolveNavSource(locale, undefined);
  return editorialRoutes(
    routeCtx.buildDocRouteEntries({ source, locale, routeSig: `docs;${locale}` }),
  ).map((item) => ({
    params: { slug: item.slugParams },
    props: item.props,
  }));
}

type PageArgs = { params: { slug: string[] } } & Record<string, unknown>;

export default function DocsPage(props: PageArgs) {
  return renderDocPage(props as never, {
    locale: routeCtx.defaultLocale,
    docHistoryContentDir: routeCtx.settings.docsDir,
  });
}
