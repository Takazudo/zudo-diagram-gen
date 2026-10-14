import assert from 'node:assert/strict';

/** Verify the configured scope in the real native desktop sidebar and drawer. */
export async function checkSectionSidebars(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const assertSection = async (scope, category) => {
    await scope.locator('[data-sidebar-tree-root]').waitFor();
    assert.equal(await scope.locator('[data-sidebar-broaden]').count(), 0, `${category}: no cross-section Broaden`);
    assert.equal(await scope.locator('[data-sidebar-scope-toolbar]').count(), 0, `${category}: no empty scope toolbar`);
    const links = await scope.locator('[data-sidebar-tree-root] a[href]').evaluateAll((anchors) =>
      anchors.map((anchor) => new URL(anchor.href).pathname.replace(/\/$/, '')),
    );
    assert.ok(links.length > 1, `${category}: keep the section overview and pages`);
    assert.ok(links.every((path) => path === `/docs/${category}` || path.startsWith(`/docs/${category}/`)), JSON.stringify(links));
  };
  try {
    for (const route of [
      '/docs/getting-started/',
      '/docs/getting-started/first-session/',
      '/docs/guides/',
      '/docs/guides/refine-export/',
      '/docs/authoring/',
      '/docs/gallery/',
      '/docs/agent-workflow/',
      '/docs/examples/',
      '/docs/reference/',
      '/docs/reference/cli/',
      '/docs/development/',
      '/docs/changelog/',
    ]) {
      assert.equal((await page.goto(origin + route)).status(), 200, route);
      await assertSection(page.locator('#desktop-sidebar'), route.split('/')[2]);
    }
    await page.goto(origin + '/docs/getting-started/');
    const sidebar = page.locator('#desktop-sidebar');
    const filter = sidebar.getByRole('textbox', { name: 'Filter navigation', exact: true });
    await filter.fill('ChatGPT');
    const firstSession = sidebar.locator('a[href$="/getting-started/first-session"], a[href$="/getting-started/first-session/"]');
    await firstSession.waitFor({ state: 'hidden' });
    assert.equal(await sidebar.locator('[data-sidebar-broaden]').count(), 0);
    await filter.fill('');
    await firstSession.waitFor({ state: 'visible' });
    await firstSession.click();
    await page.waitForURL(/\/getting-started\/first-session\/?$/);
    await assertSection(sidebar, 'getting-started');
    await page.reload();
    await assertSection(sidebar, 'getting-started');
    await page.goBack();
    await assertSection(sidebar, 'getting-started');
    await page.goForward();
    await assertSection(sidebar, 'getting-started');
    await page.goto(origin + '/docs/getting-started/');
    await page.screenshot({ path: 'test-output/docs-ia-section-sidebar-desktop.png' });

    await page.setViewportSize({ width: 390, height: 844 });
    for (const category of ['getting-started', 'guides', 'reference']) {
      await page.goto(origin + `/docs/${category}/`);
      await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
      const drawer = page.locator('[data-zd-mobile-sidebar]:not([inert])');
      await drawer.waitFor();
      await assertSection(drawer, category);
      // Focusing the already highest branch cannot expose unrelated sections.
      await drawer.locator('[data-sidebar-focus]').first().click();
      await assertSection(drawer, category);
      if (category === 'getting-started') {
        await page.screenshot({ path: 'test-output/docs-ia-section-sidebar-mobile.png' });
        await drawer.locator('a[href$="/getting-started/first-session"], a[href$="/getting-started/first-session/"]').click();
        await page.waitForURL(/\/getting-started\/first-session\/?$/);
        await page.locator('[data-zd-mobile-sidebar][inert]').waitFor({ state: 'attached' });
        await page.getByRole('button', { name: 'Open sidebar', exact: true }).click();
        await assertSection(page.locator('[data-zd-mobile-sidebar]:not([inert])'), category);
      }
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors, []);
    console.log('PASS section-scoped native sidebars, filtering, navigation, history and mobile drawer');
  } finally {
    await context.close();
  }
}
