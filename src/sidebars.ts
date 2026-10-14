import type { SidebarDefinition, SidebarsConfig } from '@takazudo/zudo-doc/sidebar-utils';

// Keep filesystem-generated pages and ordering. Each section is its own ceiling,
// matching the native zudo-doc showcase; never broaden into another header section.
const section = (): SidebarDefinition => ({ items: [], scopeRoot: 'configured' });

const sidebars: SidebarsConfig = {
  'getting-started': section(),
  guides: section(),
  authoring: section(),
  gallery: section(),
  'agent-workflow': section(),
  tones: section(),
  examples: section(),
  reference: section(),
  development: section(),
  changelog: section(),
};

export default sidebars;
