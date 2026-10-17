import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

/** Reader journeys supplement (and never replace) the workbench interaction suite. */
export async function checkDocumentationBrowser(browser, origin) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 844 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const devtools = await context.newCDPSession(page);
  const matrix = [];
  const reflowFailures = [];
  const capture = async (path) => {
    // Preserve the tested CSS viewport and DPR when capturing zoom-equivalent reflow.
    const { data } = await devtools.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });
    await writeFile(path, Buffer.from(data, 'base64'));
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const goto = async (route) => {
    const response = await page.goto(origin + route);
    assert.equal(response.status(), 200, route);
  };
  const linkTo = (scope, href) =>
    page
      .locator(`${scope} a[href="${href}"], ${scope} a[href="${href.replace(/\/$/, '')}"]`)
      .first();
  const activate = async (scope, href) => {
    await linkTo(scope, href).click();
    await page.waitForURL(
      (url) => url.pathname.replace(/\/$/, '') === href.replace(/\/$/, '').split('#')[0],
    );
  };
  const checkArrows = async () => {
    const measurements = await page.locator('[data-example-title-link]').evaluateAll((links) =>
      links.map((link) => {
        const icon = link.querySelector('[data-example-title-icon]');
        const svg = icon.querySelector('svg');
        const title = icon.nextElementSibling;
        const shape = svg.getBoundingClientRect();
        const text = title.getBoundingClientRect();
        const style = getComputedStyle(title);
        const lineHeight = parseFloat(style.lineHeight);
        return {
          title: title.textContent,
          hidden: icon.getAttribute('aria-hidden'),
          width: shape.width,
          height: shape.height,
          fontSize: parseFloat(style.fontSize),
          firstLineDelta: Math.abs(shape.top + shape.height / 2 - (text.top + lineHeight / 2)),
          lines: text.height / lineHeight,
        };
      }),
    );
    assert.ok(measurements.length > 0, 'Examples retain title links');
    for (const measurement of measurements) {
      assert.equal(measurement.hidden, 'true', measurement.title);
      assert.ok(Math.abs(measurement.width - measurement.height) < 1, measurement.title);
      assert.ok(Math.abs(measurement.height - measurement.fontSize) < 1, measurement.title);
      assert.ok(measurement.firstLineDelta < 1.5, JSON.stringify(measurement));
    }
    return measurements;
  };

  await goto('/');
  const nativeNav = page.locator('[data-header-nav]');
  assert.equal(await nativeNav.isVisible(), true, 'Use the native left header navigation');
  assert.equal(await page.locator('[data-product-nav], .zd-product-home').count(), 0);
  assert.equal(await page.locator('[data-header-right] [data-header-nav]').count(), 0);
  const headerGeometry = await page.evaluate(() => {
    const logo = document.querySelector('[data-header-logo]').getBoundingClientRect();
    const nav = document.querySelector('[data-header-nav]').getBoundingClientRect();
    const right = document.querySelector('[data-header-right]').getBoundingClientRect();
    return { logoRight: logo.right, navLeft: nav.left, navRight: nav.right, rightLeft: right.left };
  });
  assert.ok(headerGeometry.navLeft >= headerGeometry.logoRight, JSON.stringify(headerGeometry));
  assert.ok(
    headerGeometry.navRight <= headerGeometry.rightLeft + 1,
    JSON.stringify(headerGeometry),
  );
  const startLink = linkTo('[data-header-nav]', '/docs/getting-started/');
  await startLink.focus();
  assert.equal(await startLink.evaluate((el) => document.activeElement === el), true);
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/docs\/getting-started\/?$/);
  assert.equal(
    await linkTo('[data-header-nav]', '/docs/getting-started/').getAttribute('aria-current'),
    'page',
  );
  console.log('PASS native left header geometry and keyboard navigation');

  for (const quickstart of ['chatgpt-plugin', 'first-session']) {
    await goto('/');
    await activate('main', '/docs/getting-started/');
    await activate('article.zd-content', `/docs/getting-started/${quickstart}/`);
    assert.equal(
      await linkTo('[data-header-nav]', '/docs/getting-started/').getAttribute('aria-current'),
      'page',
    );
    assert.match(
      await page.locator('#desktop-sidebar a[aria-current="page"]').first().getAttribute('href'),
      new RegExp(quickstart),
    );
    assert.match(
      await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).innerText(),
      /Start here/,
    );
    assert.ok(await page.locator('[data-doc-pager] a').count());
    await page.reload();
    await page.goBack();
    assert.match(page.url(), /\/getting-started\/?$/);
  }
  console.log(
    'PASS standard Home → category → leaf journeys, active sidebar, breadcrumbs, pager, reload and Back',
  );

  const journeys = [
    ['/docs/getting-started/', '/docs/getting-started/manual-session/'],
    ['/docs/guides/', '/docs/guides/workflow-overview/'],
    ['/docs/guides/workflow-overview/', '/docs/gallery/reviewing/'],
    ['/docs/guides/', '/docs/guides/refine-export/'],
    ['/docs/tones/', '/docs/authoring/tone-collection/'],
    ['/docs/tones/', '/docs/guides/saved-styles/'],
    ['/docs/examples/', '/docs/examples/project-text/'],
    ['/docs/reference/', '/docs/reference/cli/'],
    ['/docs/development/', '/docs/development/contributing/'],
    ['/docs/development/contributing/', '/docs/getting-started/local-development/'],
    ['/docs/development/contributing/', '/docs/reference/architecture/'],
  ];
  for (const [from, to] of journeys) {
    await goto(from);
    await activate('article.zd-content', to);
    assert.match(await page.locator('article.zd-content').innerText(), /\S/);
  }
  // Real filesystem ownership, not an editorial override of retained URLs.
  for (const [route, category, label] of [
    ['/docs/getting-started/manual-session/', 'getting-started', 'Start here'],
    ['/docs/getting-started/local-development/', 'getting-started', 'Start here'],
    ['/docs/reference/architecture/', 'reference', 'Reference'],
    ['/docs/guides/refine-export/', 'guides', 'Guides'],
  ]) {
    await goto(route);
    assert.equal(
      await linkTo('[data-header-nav]', `/docs/${category}/`).getAttribute('aria-current'),
      'page',
    );
    assert.match(
      await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).innerText(),
      new RegExp(label),
    );
    assert.equal(await linkTo('#desktop-sidebar', route).getAttribute('aria-current'), 'page');
  }
  await goto('/docs/reference/cli');
  const anchor = page.locator('[data-zd-toc] a').first();
  const hash = await anchor.getAttribute('href');
  await anchor.click();
  await page.waitForURL((url) => url.hash === hash);
  assert.ok(await page.locator(hash).count());
  await page.reload();
  assert.ok(await page.locator(hash).count());
  console.log(
    'PASS category, guide, reference anchor and contributor journeys with filesystem ownership',
  );

  for (const [query, expected] of [
    ['plugin', '/docs/getting-started/chatgpt-plugin'],
    ['export', '/docs/guides/refine-export'],
    ['style lock', '/docs/guides/saved-styles'],
    ['capture', '/docs/reference/placement-capture'],
  ]) {
    await goto('/');
    await page.locator('[data-open-search]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-search-input]').fill(query);
    const result = linkTo('[data-search-results]', `${expected}/`);
    await result.waitFor();
    await result.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname.replace(/\/$/, '') === expected);
  }
  await page.locator('[data-open-search]').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  assert.equal(
    await page.locator('[data-open-search]').evaluate((el) => document.activeElement === el),
    true,
  );
  console.log('PASS canonical search results and keyboard focus restoration');

  // A narrow title verifies the first line, not the center of the entire text block.
  await goto('/docs/examples/');
  await checkArrows();
  const wrappedTitle = page.locator('[data-example-title-link]').first();
  await wrappedTitle.evaluate((el) => {
    el.style.maxWidth = '12em';
  });
  const wrapped = await checkArrows();
  assert.ok(wrapped[0].lines > 1, 'Exercise a genuinely wrapped example title');
  await page.screenshot({ path: 'test-output/docs-ia-examples-wrapped-title.png', fullPage: true });
  await wrappedTitle.evaluate((el) => {
    el.style.removeProperty('max-width');
  });
  await wrappedTitle.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/docs\/examples\/tone-exploration\/?$/);
  await page.locator('[data-zfb-island="DiagramWorkbench"]').scrollIntoViewIfNeeded();
  await page.locator('.dg-card').first().waitFor();
  assert.equal(await page.locator('.dg-app').count(), 1);
  await page.reload();
  await page.locator('[data-zfb-island="DiagramWorkbench"]').scrollIntoViewIfNeeded();
  await page.locator('.dg-card').first().waitFor();
  assert.equal(await page.locator('.dg-app').count(), 1);
  console.log(
    'PASS first-line arrow alignment, wrapped-title keyboard navigation and workbench reload',
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await goto('/');
  await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
  await page.locator('[data-zd-mobile-sidebar]:not([inert])').waitFor();
  assert.ok(await linkTo('[data-zd-mobile-sidebar]', '/docs/getting-started/').isVisible());
  await page.keyboard.press('Escape');
  await goto('/docs/getting-started/');
  const menu = page.getByRole('button', { name: 'Open sidebar', exact: true });
  await menu.click();
  await page.locator('[data-zd-mobile-sidebar]:not([inert])').waitFor();
  assert.ok(
    await linkTo('[data-zd-mobile-sidebar]', '/docs/getting-started/chatgpt-plugin/').isVisible(),
  );
  await page.keyboard.press('Escape');
  await page.locator('[data-zd-mobile-sidebar][inert]').waitFor({ state: 'attached' });
  assert.equal(await menu.evaluate((el) => document.activeElement === el), true);
  await menu.click();
  await activate('[data-zd-mobile-sidebar]', '/docs/getting-started/chatgpt-plugin/');
  await page.locator('[data-zd-mobile-sidebar][inert]').waitFor({ state: 'attached' });
  console.log('PASS native mobile menu access, dismissal, navigation and focus');

  await page.evaluate(() => localStorage.clear());
  const views = [
    ['home', '/'],
    ['start', '/docs/getting-started/'],
    ['guides', '/docs/guides/'],
    ['reference-index', '/docs/reference/'],
    ['guide', '/docs/guides/refine-export/'],
    ['reference', '/docs/reference/cli/'],
    ['tones', '/docs/tones/'],
    ['examples', '/docs/examples/'],
    ['workbench', '/docs/workbench/'],
  ];
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    // Include 320 CSS pixels through 640/2 as well as the existing 195px stress case.
    for (const width of [1280, 640, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [name, route] of views) {
        await devtools.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 844,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await goto(route);
        if (['tones', 'workbench'].includes(name)) {
          await page.locator('[data-zfb-island="DiagramWorkbench"]').scrollIntoViewIfNeeded();
          await page.locator('.dg-card').first().waitFor();
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        if (name === 'home' || name === 'examples') {
          for (const img of await page.locator('main img').all()) {
            await img.scrollIntoViewIfNeeded();
            await img.evaluate((el) => el.decode());
            assert.ok(await img.evaluate((el) => el.naturalWidth > 0));
          }
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        for (const zoom of [1, 2]) {
          await devtools.send('Emulation.setDeviceMetricsOverride', {
            width: Math.floor(width / zoom),
            height: Math.floor(844 / zoom),
            deviceScaleFactor: zoom,
            mobile: false,
          });
          await page.evaluate(
            () =>
              new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
          );
          const dimensions = await page.evaluate(() => ({
            viewport: innerWidth,
            scroll: document.documentElement.scrollWidth,
            body: document.body.getBoundingClientRect().right,
          }));
          const arrows = name === 'examples' ? await checkArrows() : undefined;
          const path = `test-output/docs-ia-${name}-${theme}-${width}-${zoom}x.png`;
          if (zoom === 1 && (name === 'home' || name === 'examples'))
            await page.screenshot({ path, fullPage: true });
          else await capture(path);
          if (
            dimensions.scroll > dimensions.viewport + 1 ||
            dimensions.body > dimensions.viewport + 1
          ) {
            const protruding = await page.evaluate(() =>
              [...document.querySelectorAll('body *')]
                .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
                .slice(0, 15)
                .map((el) => ({
                  tag: el.tagName,
                  className: String(el.className).slice(0, 160),
                  text: el.textContent.slice(0, 100),
                  right: el.getBoundingClientRect().right,
                  width: el.getBoundingClientRect().width,
                })),
            );
            reflowFailures.push({
              name,
              route,
              theme,
              width,
              zoom,
              ...dimensions,
              protruding,
              screenshot: path,
            });
          }
          const after = await page.evaluate(() => ({
            viewport: innerWidth,
            dpr: devicePixelRatio,
          }));
          assert.equal(after.viewport, Math.floor(width / zoom));
          assert.equal(after.dpr, zoom);
          matrix.push({
            name,
            theme,
            width,
            zoom,
            ...dimensions,
            ...after,
            arrows,
            screenshot: path,
          });
        }
      }
    }
  }
  // Preserve every screenshot/measurement before failing; do not hide or waive overflow.
  await writeFile('test-output/docs-ia-viewports.json', JSON.stringify(matrix, null, 2) + '\n');
  await writeFile(
    'test-output/docs-ia-reflow-failures.json',
    JSON.stringify(reflowFailures, null, 2) + '\n',
  );
  assert.deepEqual(errors, []);
  await context.close();
  assert.deepEqual(
    reflowFailures,
    [],
    'Documentation reflow failures; see docs-ia-reflow-failures.json',
  );
  console.log(
    'PASS standard documentation desktop/mobile, light/dark, 100%/200% reflow and examples alignment',
  );
}
