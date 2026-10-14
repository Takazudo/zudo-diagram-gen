import { createChrome } from '@takazudo/zudo-doc/chrome';
import { sections } from './documentation-navigation';

/** The framework's URL-prefix fallback cannot describe our retained, reclassified URLs. */
export function createDocumentationChrome(
  context: Parameters<typeof createChrome>[0],
  bindings: NonNullable<Parameters<typeof createChrome>[1]>,
) {
  return createChrome(context, {
    ...bindings,
    Header: (props) => {
      // Keep public framework utilities and the mobile sidebar. Only desktop primary
      // links use our editorial owner instead of category OR legacy URL matching.
      const defaults = createChrome(
        {
          ...context,
          settings: {
            ...context.settings,
            headerNav: [
              ...context.settings.headerNav,
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
            headerRightItems: [
              { type: 'component', component: 'product-navigation' },
              ...(context.settings.headerRightItems || []),
            ],
          },
        },
        {
          ...bindings,
          Header: undefined,
          headerRightComponents: {
            ...bindings.headerRightComponents,
            'product-navigation': () => (
              <nav class="zd-product-navigation" aria-label="Primary" data-product-nav>
                {(['getting-started', 'guides', 'tones', 'examples', 'reference'] as const).map(
                  (key) => (
                    <a
                      href={`/docs/${sections[key].slug}/`}
                      aria-current={props.navSection === key ? 'page' : undefined}
                    >
                      {sections[key].label}
                    </a>
                  ),
                )}
              </nav>
            ),
          },
        },
      );
      return <defaults.HeaderWithDefaults {...props} />;
    },
  });
}
