import { defineConfig } from '@takazudo/zfb/config';
import { zudoDoc } from '@takazudo/zudo-doc/config';

export default defineConfig(
  zudoDoc({
    siteName: 'zudo-diagram-gen',
    siteDescription: 'Create, compare, and refine SVG diagrams with an agent.',
    base: '/',
    port: 4488,
    favicon: 'auto',
    logo: '/img/logo.svg',
    home: {
      introMarkdown:
        'Give an agent a brief, compare SVG drawings at their intended size, choose a direction, and refine the selected drawing together.',
    },
    mermaid: false,
    docHistory: false,
    designTokenPanel: false,
    assetViewer: false,
    chromeBindingsModule: './src/chrome-bindings.tsx',
    strictContentBridge: true,
    dynamicPageTransition: false,
    wind: { manifests: { showcase: { path: './.generated/showcase-wind.json' } } },
    colorScheme: 'Default Light',
    colorMode: {
      defaultMode: 'light',
      lightScheme: 'Default Light',
      darkScheme: 'Default Dark',
      respectPrefersColorScheme: true,
    },
    githubUrl: 'https://github.com/Takazudo/zudo-diagram-gen',
    headerRightItems: [
      { type: 'link', label: 'Try workbench', href: '/docs/workbench/' },
      { type: 'component', component: 'search' },
      { type: 'component', component: 'theme-toggle' },
      { type: 'component', component: 'github-link' },
    ],
    footer: {
      links: [
        {
          title: 'Learn',
          items: [
            { label: 'Start here', href: '/docs/getting-started/' },
            { label: 'Guides', href: '/docs/guides/' },
            { label: 'Contributors', href: '/docs/development/' },
            { label: 'Changelog', href: '/docs/changelog/' },
          ],
        },
        {
          title: 'Explore',
          items: [
            { label: 'Tone collection', href: '/docs/tones/' },
            { label: 'Examples', href: '/docs/examples/' },
            { label: 'Workbench', href: '/docs/workbench/' },
          ],
        },
      ],
      copyright:
        'Copyright © 2026 <a href="https://x.com/Takazudo">Takazudo</a>. Built with <a href="https://zudo-doc.takazudomodular.com/docs/getting-started/">zudo-doc</a>.',
    },
    headerNav: [
      {
        label: 'Start here',
        path: '/docs/getting-started',
        categoryMatch: 'getting-started',
        versioned: false,
      },
      { label: 'Guides', path: '/docs/guides', categoryMatch: 'guides', versioned: false },
      { label: 'Tones', path: '/docs/tones', categoryMatch: 'tones', versioned: false },
      { label: 'Examples', path: '/docs/examples', categoryMatch: 'examples', versioned: false },
      { label: 'Reference', path: '/docs/reference', categoryMatch: 'reference', versioned: false },
    ],
  }),
);
