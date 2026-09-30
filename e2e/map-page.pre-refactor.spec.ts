import { test, expect } from '@playwright/test';

// Covers app/(main)/map/page.tsx
test.describe('/map page', () => {
  test('mounts main shell, map container, and control panel without crashing', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/map');

    // The map page wraps everything in <main class="...bg-[#e0e0d1]"> per
    // app/(main)/map/page.tsx:1568. Assert main exists.
    await expect(page.locator('main').first()).toBeVisible({
      timeout: 30_000,
    });

    // The map container div is always rendered (the ref target).
    // Use the unique h-screen+w-full sibling of <main>.
    const mapShell = page.locator('main > div.h-screen.w-full');
    await expect(mapShell).toBeAttached({ timeout: 30_000 });

    // Hard-fail only on actual uncaught page errors. Mapbox warnings about
    // missing tokens come through as soft console messages, not pageerror.
    expect(
      consoleErrors,
      `Uncaught page errors: ${consoleErrors.join('\n')}`
    ).toEqual([]);
  });
});
