import { test, expect } from '@playwright/test';

// Post-refactor: the map page's refactor was limited to extracting magic
// strings (POPULATION_POPUP_CLOSE_BUTTON_CSS, hover colours) and adding
// JSDoc to the default export. There are no new exported symbols to unit
// test, so this spec re-verifies the same shell behaviour as the
// pre-refactor smoke test to prove the constants extraction was a no-op
// behaviourally.
test.describe('/map page after constants extraction', () => {
  test('main shell + map container still mount and no uncaught errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/map');

    await expect(page.locator('main').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('main > div.h-screen.w-full')).toBeAttached({
      timeout: 30_000,
    });

    expect(
      consoleErrors,
      `Uncaught page errors: ${consoleErrors.join('\n')}`
    ).toEqual([]);
  });
});
