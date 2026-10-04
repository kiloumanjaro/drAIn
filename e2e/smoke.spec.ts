import { test, expect, type Page } from '@playwright/test';

// Signed-out smoke checks that need no Mapbox token: without one the map
// pages render their shell and their own "map unavailable" state, which is
// all these assert. They exist to catch a page that stops mounting when its
// code is moved around.

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

const ROUTES = ['/map', '/simulation', '/dashboard', '/docs', '/login'];

test.describe('every main page mounts', () => {
  for (const route of ROUTES) {
    test(`${route} renders its shell without an uncaught error`, async ({
      page,
    }) => {
      const errors = collectPageErrors(page);

      await page.goto(route);
      await expect(page.locator('main').first()).toBeVisible({
        timeout: 30_000,
      });

      expect(errors, `Uncaught page errors: ${errors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('map page control panel', () => {
  test('opens on the tab named in the URL', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('/map?activetab=admin');
    await expect(
      page.getByRole('button', { name: 'Fix', exact: true })
    ).toBeVisible({ timeout: 30_000 });

    expect(errors, `Uncaught page errors: ${errors.join('\n')}`).toEqual([]);
  });
});

test.describe('simulation page', () => {
  test('asks the visitor to enter simulation mode first', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.goto('/simulation');
    await expect(page.getByText(/Enter Simulation Mode/).first()).toBeVisible({
      timeout: 30_000,
    });

    expect(errors, `Uncaught page errors: ${errors.join('\n')}`).toEqual([]);
  });
});
