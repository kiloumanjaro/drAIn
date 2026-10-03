import { test, expect } from '@playwright/test';

// Covers components/data-flow.tsx — the DataFlowPipeline component is the
// entire visual background of the landing page (app/(main)/page.tsx).
test.describe('data-flow.tsx (rendered on landing /)', () => {
  test('renders landing shell with heading, Explore Map button, and pipeline SVG', async ({
    page,
  }) => {
    await page.goto('/');

    // Heading parts from app/(main)/page.tsx
    await expect(page.getByText('a blueprint', { exact: false })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('for efficient', { exact: false })
    ).toBeVisible();
    await expect(
      page.getByText('drainage management system', { exact: false })
    ).toBeVisible();

    // CTA + fullscreen control — both come from the landing client widgets,
    // and are siblings of DataFlowPipeline.
    await expect(
      page.getByRole('button', { name: 'Explore Map' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Toggle Fullscreen' })
    ).toBeVisible();

    // DataFlowPipeline mounts at least one SVG element on the landing page.
    // Pre-refactor assertion: there is >= 1 svg in the document body.
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('Explore Map button navigates to /map', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Explore Map' }).click();
    await page.waitForURL('**/map', { timeout: 30_000 });
    expect(page.url()).toContain('/map');
  });
});
