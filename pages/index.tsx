/// <reference types="@takazudo/zudo-doc/virtual-modules.d.ts" />
import { routeContext } from 'virtual:zudo-doc-route-context';
import { createRouteContext, type RouteContextPayload } from '@takazudo/zudo-doc/route-context';
import { createDocumentationChrome } from '../src/documentation-chrome';
import { DocLayoutWithDefaults } from '@takazudo/zudo-doc/doclayout';
import { chromeBindings } from '../src/chrome-bindings';
import { featuredTones, exampleSessions } from '../src/generated/site-data';

const context = createRouteContext(routeContext as unknown as RouteContextPayload);
const { HeadWithDefaults, HeaderWithDefaults, FooterWithDefaults, BodyEndIslands } =
  createDocumentationChrome(context, chromeBindings);
export const frontmatter = { title: 'Create, compare, and refine SVG diagrams with an agent' };

export default function Home() {
  const locale = context.defaultLocale;
  const description =
    'Agents author the SVG. Skills guide the workflow. An optional local engine helps you review, refine and export saved drawings.';
  return (
    <DocLayoutWithDefaults
      title="zudo-diagram-gen — SVG diagrams with an agent"
      description={description}
      head={<HeadWithDefaults title="SVG diagrams with an agent" description={description} />}
      lang={locale}
      hideSidebar
      hideToc
      contentWide
      enableClientRouter={false}
      headerOverride={<HeaderWithDefaults lang={locale} currentPath="/" />}
      footerOverride={<FooterWithDefaults lang={locale} />}
      bodyEndComponents={<BodyEndIslands basePath="/" />}
    >
      <div class="zd-product-home">
        <section class="zd-product-hero" aria-labelledby="product-heading">
          <img
            class="zd-product-logo"
            src="/img/logo.svg"
            alt="ZDG — zudo-diagram-gen"
            width="1200"
            height="630"
          />
          <div>
            <p class="text-small text-muted">SVG authoring · saved drawings · explicit review</p>
            <h1 id="product-heading">Create, compare, and refine SVG diagrams with an agent.</h1>
            <p>{description}</p>
            <div class="zd-product-actions">
              <a href="/docs/getting-started/">
                Start here <span aria-hidden="true">→</span>
              </a>
              <a href="/docs/workbench/">
                Try workbench <span aria-hidden="true">→</span>
              </a>
            </div>
            <p class="text-small text-muted">
              The public workbench demonstrates an existing session. It does not call a model.
            </p>
          </div>
        </section>

        <section aria-labelledby="workflow-heading">
          <h2 id="workflow-heading">Choose where you work</h2>
          <div class="zd-product-paths">
            <div>
              <h3>
                <a href="/docs/getting-started/chatgpt-plugin/">Skills-only plugin</a>
              </h3>
              <p>
                Ask in a capable host, inspect actual saved artifacts, and refine with Keep/Change
                notes. The assembled plugin bundles workflow guidance and all 24 tone references.
              </p>
              <p class="text-small text-muted">
                Your host supplies file, render and image-viewing tools. This package's ChatGPT
                installation remains unverified; no local server is required.
              </p>
            </div>
            <div>
              <h3>
                <a href="/docs/getting-started/first-session/">Local coding agent and workbench</a>
              </h3>
              <p>
                Keep SVG, JSON and Markdown in your workspace. Use a coding agent with the packaged
                skill, then compare candidates and transfer review from your local browser.
              </p>
              <p class="text-small text-muted">
                Requires Node.js 22–24, pnpm 10.30.3 and local archives. The CLI supplies tools; the
                agent authors the artwork.
              </p>
            </div>
          </div>
          <p class="text-small">
            Prefer to author files yourself? Follow the{' '}
            <a href="/docs/getting-started/manual-session/">manual tutorial</a>.
          </p>
        </section>

        <section aria-labelledby="loop-heading">
          <h2 id="loop-heading">Keep the drawing through every step</h2>
          <ol class="zd-product-loop">
            <li>
              <h3>Create</h3>
              <p>Ground facts and labels. Save concrete SVG candidates at a known target size.</p>
            </li>
            <li>
              <h3>Review</h3>
              <p>Inspect actual images, compare alternatives and name the drawing to keep.</p>
            </li>
            <li>
              <h3>Refine</h3>
              <p>Start from that saved SVG. Preserve the original and make a new revision.</p>
            </li>
            <li>
              <h3>Export</h3>
              <p>Deliver the selected saved bytes. Check the result in its real placement.</p>
            </li>
          </ol>
          <p>
            <a href="/docs/guides/">Follow the practical guides →</a>
          </p>
        </section>

        <section aria-labelledby="tones-heading">
          <h2 id="tones-heading">Find a useful visual direction</h2>
          <p>Existing authored references, ready to study and adapt to your explanation.</p>
          <div class="zd-product-previews">
            {featuredTones.map((tone) => (
              <a href={`/docs/tones/#candidate=${tone.candidateId}&view=inspect`} key={tone.id}>
                <img
                  src={tone.preview}
                  alt={`${tone.name} reference: pattern and text become a composition`}
                  width="720"
                  height="400"
                  loading="lazy"
                />
                <span>{tone.name}</span>
              </a>
            ))}
          </div>
          <p>
            <a href="/docs/tones/">Browse all 24 tones →</a> ·{' '}
            <a href="/docs/authoring/tone-collection/">Choose and apply a tone</a>
          </p>
        </section>

        <section aria-labelledby="examples-heading">
          <h2 id="examples-heading">Learn from complete sessions</h2>
          <div class="zd-product-examples">
            {exampleSessions
              .filter((session) => ['tone-exploration', 'project-text'].includes(session.slug))
              .map((session) => (
                <a href={session.href} key={session.slug}>
                  <img
                    src={session.preview}
                    alt={`Saved drawing from ${session.title}`}
                    width="720"
                    height="400"
                    loading="lazy"
                  />
                  <span>{session.title}</span>
                  <p class="text-small text-muted">{session.description}</p>
                </a>
              ))}
          </div>
          <p>
            <a href="/docs/examples/">Explore the worked examples →</a>
          </p>
        </section>
        <nav class="zd-product-secondary" aria-label="More resources">
          <a href="/docs/reference/">Technical reference</a>
          <a href="/docs/development/">Contributors</a>
          <a href="/docs/changelog/">Changelog</a>
        </nav>
      </div>
    </DocLayoutWithDefaults>
  );
}
