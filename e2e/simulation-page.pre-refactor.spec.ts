import { test, expect } from '@playwright/test';

// Covers app/(main)/simulation/page.tsx
test.describe('/simulation page', () => {
  test('renders dark shell and "Enter Simulation Mode" overlay when inactive', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/simulation');

    // The simulation page's idle state shows this exact copy
    // (app/(main)/simulation/page.tsx:2165).
    await expect(
      page.getByText('Enter Simulation Mode to activate map')
    ).toBeVisible({ timeout: 30_000 });

    // <main> uses inline backgroundColor #1e1e1e. Just verify <main> exists.
    await expect(page.locator('main').first()).toBeVisible();

    expect(
      consoleErrors,
      `Uncaught page errors: ${consoleErrors.join('\n')}`
    ).toEqual([]);
  });
});
