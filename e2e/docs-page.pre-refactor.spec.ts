import { test, expect } from '@playwright/test';

// Covers app/(main)/docs/page.tsx
test.describe('/docs page', () => {
  test('renders overview section by default with heading and "Our Vision" subhead', async ({
    page,
  }) => {
    await page.goto('/docs');

    // Default activeSection = 'overview' renders an <h2>Overview</h2> at
    // app/(main)/docs/page.tsx:415 and an <h3>Our Vision</h3> at :470.
    // Both are page-local (not sidebar duplicates), so they are the most
    // reliable pre-refactor anchors.
    await expect(
      page.getByRole('heading', { name: 'Overview', level: 2 })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: 'Our Vision', level: 3 })
    ).toBeVisible();
  });

  test('honours ?section=architecture query param', async ({ page }) => {
    await page.goto('/docs?section=architecture');

    // The architecture section renders an <h2>Architecture</h2> in the main
    // panel (app/(main)/docs/page.tsx:522). Asserting at heading level
    // disambiguates from any sidebar/nav use of the same word.
    await expect(
      page.getByRole('heading', { name: 'Architecture', level: 2 })
    ).toBeVisible({ timeout: 30_000 });
  });
});
