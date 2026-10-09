import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

// Automated accessibility checks on the pages that need no Mapbox token.
// axe finds what a machine can find (names, roles, contrast, labels); it
// says nothing about whether the page makes sense read aloud, so a clean run
// is a floor, not a verdict.

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** How long late content (fonts, charts, the docs video) gets to settle. */
const SETTLE_MS = 2_000;

/**
 * Waits for the page to go quiet, but not for long: the map page keeps a
 * realtime connection open and never does.
 */
async function settle(page: Page) {
  await page
    .waitForLoadState('networkidle', { timeout: 5_000 })
    .catch(() => {});
}

const ROUTES: { path: string; excludeMap?: boolean }[] = [
  { path: '/' },
  { path: '/login' },
  { path: '/signup' },
  { path: '/docs' },
  // Signed out and without a token the map itself never starts; what is
  // checked is the shell around it. Mapbox's own markup is left out for the
  // runs that do have a token.
  { path: '/map', excludeMap: true },
  { path: '/dashboard', excludeMap: true },
];

test.describe('axe finds no WCAG A or AA violations', () => {
  for (const { path, excludeMap } of ROUTES) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible({
        timeout: 30_000,
      });
      await settle(page);
      await page.waitForTimeout(SETTLE_MS);

      let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
      if (excludeMap) builder = builder.exclude('.mapboxgl-map');
      const { violations } = await builder.analyze();

      const summary = violations.map(
        (v) =>
          `${v.id} (${v.nodes.length}): ${v.nodes
            .map((n) => n.target.join(' '))
            .join(' | ')}`
      );
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }
});

test.describe('keyboard', () => {
  test('the skip link is the first tab stop on /docs and moves focus to main', async ({
    page,
  }) => {
    await page.goto('/docs');
    await expect(page.locator('main').first()).toBeVisible({
      timeout: 30_000,
    });
    // The page listens for keys once it has hydrated.
    await settle(page);

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
  });

  test('"/" focuses the docs search and can then be typed into it', async ({
    page,
  }) => {
    await page.goto('/docs');
    const search = page.getByRole('textbox', {
      name: 'Search the documentation sections',
    });
    await expect(search).toBeVisible({ timeout: 30_000 });
    await settle(page);

    await page.locator('body').press('/');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');

    await page.keyboard.type('a/b');
    await expect(search).toHaveValue('a/b');
  });
});
