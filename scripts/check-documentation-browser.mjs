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
  const capture = async (path) => {
    // Playwright's screenshot helper can reset CDP metrics to its stored viewport.
    // Capture through the same CDP session so zoom-equivalent reflow is preserved.
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
  const activate = async (scope, href) => {
    const link = page
      .locator(`${scope} a[href="${href}"], ${scope} a[href="${href.replace(/\/$/, '')}"]`)
      .first();
    await link.click();
    await page.waitForURL(
      (url) => url.pathname.replace(/\/$/, '') === href.replace(/\/$/, '').split('#')[0],
    );
  };
  await goto('/');
  const primary = page.locator('[data-product-nav] a');
  assert.deepEqual(await primary.allTextContents(), [
    'Start here',
    'Guides',
    'Tones',
    'Examples',
    'Reference',
  ]);
  await primary.first().focus();
  await page.keyboard.press('Tab');
  assert.equal(await primary.nth(1).evaluate((el) => document.activeElement === el), true);
  assert.notEqual(await primary.nth(1).evaluate((el) => getComputedStyle(el).outlineStyle), 'none');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/docs\/guides\/?$/);
  await goto('/');
  const preview = page.locator('.zd-product-previews a').first();
  const candidate = new URLSearchParams((await preview.getAttribute('href')).split('#')[1]).get(
    'candidate',
  );
  await preview.click();
  await page.locator('.dg-stage').waitFor();
  assert.equal(await page.locator('.dg-stage').getAttribute('data-candidate'), candidate);
  await page.reload();
  await page.locator('.dg-stage').waitFor();
  assert.equal(await page.locator('.dg-stage').getAttribute('data-candidate'), candidate);
  assert.equal(await page.locator('.dg-app').count(), 1);
  console.log('PASS keyboard primary navigation and curated tone preview identity/reload');
  for (const quickstart of ['chatgpt-plugin', 'first-session']) {
    await goto('/');
    await activate('main', '/docs/getting-started/');
    await activate('article', `/docs/getting-started/${quickstart}/`);
    assert.equal(
      await page.locator('[data-product-nav] a[aria-current="page"]').innerText(),
      'Start here',
    );
    assert.match(
      await page.locator('#desktop-sidebar a[aria-current="page"]').getAttribute('href'),
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
    'PASS both Home → Start here → quickstart journeys within two activations, active sidebar, breadcrumbs, reload and Back',
  );
  const journeys = [
    ['/docs/getting-started/', '/docs/getting-started/manual-session/', 'Guides'],
    ['/docs/guides/', '/docs/gallery/reviewing/', 'Guides'],
    ['/docs/guides/', '/docs/guides/refine-export/', 'Guides'],
    ['/docs/tones/', '/docs/authoring/tone-collection/', 'Guides'],
    ['/docs/tones/', '/docs/guides/saved-styles/', 'Guides'],
    ['/docs/examples/', '/docs/examples/project-text/', 'Examples'],
    ['/docs/reference/', '/docs/reference/cli/', 'Reference'],
    ['/docs/development/', '/docs/getting-started/local-development/', null],
    ['/docs/development/', '/docs/reference/architecture/', null],
  ];
  for (const [from, to, section] of journeys) {
    await goto(from);
    await activate('article', to);
    if (section)
      assert.equal(
        await page.locator('[data-product-nav] a[aria-current="page"]').innerText(),
        section,
      );
    if (!section) {
      assert.equal(await page.locator('[data-product-nav] a[aria-current="page"]').count(), 0);
      assert.match(
        await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).innerText(),
        /Contributors/,
      );
      assert.match(
        await page.locator('#desktop-sidebar a[aria-current="page"]').getAttribute('href'),
        new RegExp(to.replace(/\/$/, '')),
      );
    }
    assert.match(await page.locator('article.zd-content').innerText(), /\S/);
  }
  await goto('/docs/reference/cli'); // existing slashless deep-link support
  const anchor = page.locator('[data-zd-toc] a').first();
  const hash = await anchor.getAttribute('href');
  await anchor.click();
  await page.waitForURL((url) => url.hash === hash);
  assert.ok(await page.locator(hash).count());
  await page.reload();
  assert.ok(await page.locator(hash).count());
  console.log('PASS manual, guide, tone/style, example, reference anchor and contributor journeys');

  for (const [query, expected] of [
    ['plugin', '/docs/getting-started/chatgpt-plugin'],
    ['export', '/docs/guides/refine-export'],
    ['style lock', '/docs/guides/saved-styles'],
    ['capture', '/docs/reference/placement-capture'],
  ]) {
    await goto('/');
    const search = page.locator('[data-open-search]');
    await search.focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-search-input]').fill(query);
    const result = page
      .locator(
        `[data-search-results] a[href="${expected}"], [data-search-results] a[href="${expected}/"]`,
      )
      .first();
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
    'Search restores keyboard focus',
  );
  console.log('PASS canonical search results and keyboard search/focus restoration');

  await page.setViewportSize({ width: 390, height: 844 });
  await goto('/');
  await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
  await page.locator('[data-zd-mobile-sidebar]:not([inert])').waitFor();
  for (const label of [
    'Start here',
    'Guides',
    'Tones',
    'Examples',
    'Reference',
    'Contributors',
    'Changelog',
  ]) {
    assert.ok(
      await page
        .locator('[data-zd-mobile-sidebar]')
        .getByRole('link', { name: label, exact: true })
        .isVisible(),
      label,
    );
  }
  await page.keyboard.press('Escape');
  await goto('/docs/getting-started/');
  const menu = page.getByRole('button', { name: 'Open sidebar', exact: true });
  await menu.click();
  await page.locator('[data-zd-mobile-sidebar]:not([inert])').waitFor();
  assert.ok(
    await page.locator('[data-zd-mobile-sidebar] a').filter({ hasText: 'Contributors' }).count(),
  );
  assert.ok(
    await page.locator('[data-zd-mobile-sidebar] a').filter({ hasText: 'Changelog' }).count(),
  );
  await page.keyboard.press('Escape');
  await page.locator('[data-zd-mobile-sidebar][inert]').waitFor({ state: 'attached' });
  assert.equal(
    await menu.evaluate((el) => document.activeElement === el),
    true,
    'Menu restores keyboard focus',
  );
  await menu.click();
  await activate('[data-zd-mobile-sidebar]', '/docs/getting-started/chatgpt-plugin/');
  await page.locator('[data-zd-mobile-sidebar][inert]').waitFor({ state: 'attached' });
  console.log('PASS mobile menu access, dismissal, navigation and focus');

  // Visual baselines start without the earlier journey's deliberately persisted review/view.
  await page.evaluate(() => localStorage.clear());
  const views = [
    ['home', '/'],
    ['start', '/docs/getting-started/'],
    ['guide', '/docs/guides/refine-export/'],
    ['reference', '/docs/reference/cli/'],
    ['tones', '/docs/tones/'],
    ['examples', '/docs/examples/'],
    ['workbench', '/docs/workbench/'],
  ];
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const [name, route] of views) {
        await devtools.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 844,
          deviceScaleFactor: 1,
          mobile: false,
        });
        await goto(route);
        if (['tones', 'workbench'].includes(name)) await page.locator('.dg-card').first().waitFor();
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        if (name === 'home') {
          for (const img of await page.locator('main img').all()) {
            await img.scrollIntoViewIfNeeded();
            await img.evaluate((el) => el.decode());
            assert.ok(await img.evaluate((el) => el.naturalWidth > 0));
          }
          await page.evaluate(() => window.scrollTo(0, 0));
        }
        for (const zoom of [1, 2]) {
          // Match browser zoom's CSS viewport and device-pixel ratio; pageScaleFactor
          // or CSS zoom would only scale content without updating responsive queries.
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
          if (width === 390 && zoom === 2) {
            const brokenWords = await page
              .locator('.zd-product-home h1, .zd-content > h1')
              .evaluate((heading) => {
                const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
                const broken = [];
                for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                  for (const match of node.textContent.matchAll(/\S+/g)) {
                    const range = document.createRange();
                    range.setStart(node, match.index);
                    range.setEnd(node, match.index + match[0].length);
                    if (range.getClientRects().length > 1) broken.push(match[0]);
                  }
                }
                return broken;
              });
            assert.deepEqual(brokenWords, [], `${name}: heading words must fit narrow reflow`);
          }
          const path = `test-output/docs-ia-${name}-${theme}-${width}-${zoom}x.png`;
          if (zoom === 1 && name === 'home') await page.screenshot({ path, fullPage: true });
          else await capture(path);
          assert.ok(
            dimensions.scroll <= dimensions.viewport + 1 &&
              dimensions.body <= dimensions.viewport + 1,
            `${name} ${theme} ${width} zoom ${zoom}: ${JSON.stringify(dimensions)}`,
          );
          const after = await page.evaluate(() => ({
            viewport: innerWidth,
            dpr: devicePixelRatio,
          }));
          assert.equal(
            after.viewport,
            Math.floor(width / zoom),
            'Screenshot must preserve tested CSS viewport',
          );
          assert.equal(after.dpr, zoom, 'Screenshot must preserve tested DPR');
          matrix.push({ name, theme, width, zoom, ...dimensions, ...after, screenshot: path });
          if (width === 390 && zoom === 2 && ['tones', 'workbench'].includes(name)) {
            await page
              .locator('.dg-workspace-toolbar')
              .evaluate((el) =>
                window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 80),
              );
            await capture(`test-output/docs-ia-${name}-${theme}-390-2x-controls.png`);
            await page.evaluate(() => window.scrollTo(0, 0));
          }
        }
      }
    }
  }
  await writeFile('test-output/docs-ia-viewports.json', JSON.stringify(matrix, null, 2) + '\n');
  assert.deepEqual(errors, []);
  await context.close();
  console.log(
    'PASS documentation 1280/390px, light/dark, 100%/200% zoom-equivalent viewport/DPR reflow and screenshot capture',
  );
}
