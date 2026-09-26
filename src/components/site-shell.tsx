/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

export function SiteShell({title,active,children}:{title:string;active?:string;children:ComponentChildren}) {
  return <html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>{title} · zudo-diagram-gen</title><link rel="stylesheet" href="/site.css"/></head><body class="dg-site">
    <header class="site-header"><a class="wordmark" href="/"><span class="site-glyph" aria-hidden="true">▧</span>zudo-diagram-gen<span class="site-version">0.1</span></a><nav aria-label="Main navigation">{[['Docs','/docs/getting-started/'],['Tones','/tones/'],['Examples','/examples/'],['Workbench','/workbench/']].map(([label,href])=><a href={href} aria-current={active===label?'page':undefined}>{label}</a>)}</nav></header>
    <main class="site-main">{children}</main>
    <footer class="site-footer"><span>SVG sources. Visible choices. Preserved revisions.</span><span>Built with zfb + zudo-doc</span></footer>
  </body></html>;
}
