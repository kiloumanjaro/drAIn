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

test.describe('phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a menu button opens the navigation the rail no longer shows', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByText('Documentation', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('the map control panel is a bottom sheet that fits the screen', async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await page.goto('/map');

    const handle = page.getByRole('button', { name: 'Expand panel' });
    await expect(handle).toBeVisible({ timeout: 30_000 });
    const sheet = handle.locator('..');
    const half = await sheet.boundingBox();
    expect(half?.x).toBe(0);
    expect(half?.width).toBe(390);
    expect((half?.y ?? 0) + (half?.height ?? 0)).toBeCloseTo(844, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    ).toBeLessThanOrEqual(1);

    // The handle steps half, full, bar; a tab on the bar opens it again.
    await handle.click();
    await page.getByRole('button', { name: 'Collapse panel' }).click();
    const reopen = page.getByRole('button', { name: 'Open panel' });
    await expect(reopen).toBeVisible();
    await expect
      .poll(async () => (await reopen.locator('..').boundingBox())?.height)
      .toBeLessThan(100);
    await page.getByRole('button', { name: 'Report', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Expand panel' })
    ).toBeVisible();

    expect(errors, `Uncaught page errors: ${errors.join('\n')}`).toEqual([]);
  });
});
