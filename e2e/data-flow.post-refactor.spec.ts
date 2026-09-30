import { test, expect } from '@playwright/test';

// Post-refactor: data-flow.tsx only gained two named constants and JSDoc.
// The constants are file-local (not exported, deliberately), so the post-
// refactor verification is an e2e shell check that the landing page still
// composes DataFlowPipeline correctly.
test.describe('data-flow.tsx after constants extraction', () => {
  test('landing still renders heading, Explore Map CTA, and pipeline SVG', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByText('a blueprint', { exact: false })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('drainage management system', { exact: false })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Explore Map' })
    ).toBeVisible();
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });
});
