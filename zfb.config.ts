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
    // Each categoryMatch names an actual top-level content directory. The stock
    // header and filesystem tree own active states, sidebar scope and ordering.
    headerNav: [
      {
        label: 'Start here',
        path: '/docs/getting-started',
        categoryMatch: 'getting-started',
        versioned: false,
      },
      {
        label: 'Guides',
        path: '/docs/guides',
        categoryMatch: 'guides',
        versioned: false,
        children: [
          {
            label: 'Practical guides',
            path: '/docs/guides',
            categoryMatch: 'guides',
            versioned: false,
          },
          {
            label: 'Authoring',
            path: '/docs/authoring',
            categoryMatch: 'authoring',
            versioned: false,
          },
          { label: 'Review', path: '/docs/gallery', categoryMatch: 'gallery', versioned: false },
          {
            label: 'Agent workflow',
            path: '/docs/agent-workflow',
            categoryMatch: 'agent-workflow',
            versioned: false,
          },
        ],
      },
      { label: 'Tones', path: '/docs/tones', categoryMatch: 'tones', versioned: false },
      { label: 'Examples', path: '/docs/examples', categoryMatch: 'examples', versioned: false },
      { label: 'Reference', path: '/docs/reference', categoryMatch: 'reference', versioned: false },
      {
        label: 'Develop',
        path: '/docs/development',
        categoryMatch: 'development',
        versioned: false,
        children: [
          {
            label: 'Contributors',
            path: '/docs/development',
            categoryMatch: 'development',
            versioned: false,
          },
          {
            label: 'Changelog',
            path: '/docs/changelog',
            categoryMatch: 'changelog',
            versioned: false,
          },
        ],
      },
    ],
  }),
);
