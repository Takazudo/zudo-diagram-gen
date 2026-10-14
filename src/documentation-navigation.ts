import type { SidebarsConfig } from '@takazudo/zudo-doc/sidebar-utils';
import type { DocRouteEntry } from '@takazudo/zudo-doc/doc-route-entries';

export const sections = {
  'getting-started': { label: 'Start here', slug: 'getting-started' },
  guides: { label: 'Guides', slug: 'guides' },
  tones: { label: 'Tones', slug: 'tones' },
  examples: { label: 'Examples', slug: 'examples' },
  reference: { label: 'Reference', slug: 'reference' },
  development: { label: 'Contributors', slug: 'development' },
  changelog: { label: 'Changelog', slug: 'changelog' },
  workbench: { label: 'Try workbench', slug: 'workbench' },
};

const readingOrder = {
  'getting-started': [
    'getting-started',
    'getting-started/chatgpt-plugin',
    'getting-started/first-session',
    'getting-started/local-archives',
    'getting-started/introduction',
  ],
  guides: [
    'guides',
    'getting-started/manual-session',
    'gallery/reviewing',
    'guides/refine-export',
    'authoring/projects',
    'authoring/tone-collection',
    'guides/saved-styles',
    'authoring/svg-authoring',
    'agent-workflow/core-and-wrapper',
    'agent-workflow/iteration',
  ],
  reference: [
    'reference',
    'reference/cli',
    'authoring/session-files',
    'reference/api',
    'authoring/tone-context',
    'reference/placement-capture',
    'reference/glossary',
    'reference/troubleshooting',
  ],
  development: [
    'development',
    'getting-started/local-development',
    'reference/architecture',
    'development/quality-and-handoff',
    'development/sources',
    'development/plugin-maintenance',
  ],
};

export function documentationSection(slug: string): keyof typeof sections | undefined {
  for (const [section, slugs] of Object.entries(readingOrder)) {
    if (slugs.includes(slug)) return section as keyof typeof sections;
  }
  const prefix = slug.split('/')[0];
  if (['authoring', 'gallery', 'agent-workflow'].includes(prefix)) return 'guides';
  return prefix in sections ? (prefix as keyof typeof sections) : undefined;
}

const secondary = [
  { type: 'link' as const, label: 'Contributors', href: '/docs/development/' },
  { type: 'link' as const, label: 'Changelog', href: '/docs/changelog/' },
];
export const documentationSidebars: SidebarsConfig = Object.fromEntries(
  Object.entries(readingOrder).map(([section, items]) => [section, [...items, ...secondary]]),
);

export function editorialRoutes(entries: DocRouteEntry[]): DocRouteEntry[] {
  const slugOf = (entry: DocRouteEntry) => entry.slugParams.join('/');
  return entries.map((entry) => {
    const slug = slugOf(entry);
    const key = documentationSection(slug);
    if (!key) return entry;
    const section = sections[key];
    const title =
      entry.props.kind === 'entry' ? entry.props.entry.data.title : entry.props.autoIndex.label;
    const order =
      key in readingOrder
        ? readingOrder[key as keyof typeof readingOrder]
        : entries.filter((item) => documentationSection(slugOf(item)) === key).map(slugOf);
    const index = order.indexOf(slug);
    const neighbor = (offset: number) => {
      if (index < 0) return null;
      const item = entries.find((candidate) => slugOf(candidate) === order[index + offset]);
      if (!item) return null;
      return {
        slug: slugOf(item),
        position: index + offset,
        label:
          item.props.kind === 'entry' ? item.props.entry.data.title : item.props.autoIndex.label,
        href: `/docs/${slugOf(item)}/`,
        children: [],
        hasPage: true,
      };
    };
    return {
      ...entry,
      props: {
        ...entry.props,
        breadcrumbs: [
          { label: 'Home', href: '/' },
          ...(slug === section.slug
            ? []
            : [{ label: section.label, href: `/docs/${section.slug}/` }]),
          { label: title },
        ],
        prev: neighbor(-1),
        next: neighbor(1),
      },
    };
  });
}
