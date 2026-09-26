import { defineConfig } from '@takazudo/zfb/config';
import { zudoDoc } from '@takazudo/zudo-doc/config';

export default defineConfig(
  zudoDoc({
    siteName: 'zudo-diagram-gen',
    siteDescription:
      'A local workbench for generating, comparing, and refining SVG diagrams with an agent.',
    base: '/',
    port: 4488,
    favicon: 'auto',
    logo: false,
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
            { label: 'Getting started', href: '/docs/getting-started/' },
            { label: 'Agent workflow', href: '/docs/agent-workflow/' },
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
        label: 'Docs',
        path: '/docs/getting-started',
        versioned: false,
        children: [
          {
            label: 'Getting started',
            path: '/docs/getting-started',
            categoryMatch: 'getting-started',
            versioned: false,
          },
          { label: 'Review', path: '/docs/gallery', categoryMatch: 'gallery', versioned: false },
          {
            label: 'Authoring',
            path: '/docs/authoring',
            categoryMatch: 'authoring',
            versioned: false,
          },
          {
            label: 'Agent workflow',
            path: '/docs/agent-workflow',
            categoryMatch: 'agent-workflow',
            versioned: false,
          },
          {
            label: 'Reference',
            path: '/docs/reference',
            categoryMatch: 'reference',
            versioned: false,
          },
          {
            label: 'Development',
            path: '/docs/development',
            categoryMatch: 'development',
            versioned: false,
          },
        ],
      },
      { label: 'Tones', path: '/docs/tones', versioned: false },
      { label: 'Examples', path: '/docs/examples', versioned: false },
      { label: 'Workbench', path: '/docs/workbench', versioned: false },
      { label: 'Changelog', path: '/docs/changelog', categoryMatch: 'changelog', versioned: false },
    ],
  }),
);
