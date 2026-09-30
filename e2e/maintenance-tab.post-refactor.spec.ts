import { test, expect } from '@playwright/test';
import {
  DEBUG_MODE,
  MAINTENANCE_PHOTO_MAX_AGE_HOURS,
  getStatusStyles,
} from '../components/control-panel/tabs/maintenance.helpers';

// Post-refactor: verify the new `maintenance.helpers.ts` module exposes the
// behaviour previously inlined at the top of `maintenance.tsx`. The
// `assetActions` map intentionally lives in a sibling `maintenance.actions`
// module so this test does not need Supabase env vars to load it.
test.describe('maintenance.helpers extracted module', () => {
  test('DEBUG_MODE stays disabled in checked-in code', () => {
    expect(DEBUG_MODE).toBe(false);
  });

  test('MAINTENANCE_PHOTO_MAX_AGE_HOURS matches the original 12-hour window', () => {
    expect(MAINTENANCE_PHOTO_MAX_AGE_HOURS).toBe(12);
  });

  test('getStatusStyles returns distinct classes per resolution state', () => {
    expect(getStatusStyles('resolved')).toContain('bg-green-500/10');
    expect(getStatusStyles('resolved')).toContain('text-green-700');
    expect(getStatusStyles('in-progress')).toContain('bg-gray-500/10');
    expect(getStatusStyles('in-progress')).toContain('text-gray-700');
    // Unknown / null falls back to the same neutral grey as in-progress.
    expect(getStatusStyles(null)).toBe(getStatusStyles('in-progress'));
    expect(getStatusStyles('something-else')).toBe(getStatusStyles(null));
  });
});

// e2e shell check: the maintenance tab still gates unauthenticated visitors
// behind the same "Admin Privileges Required" empty state.
test.describe('maintenance tab after helpers extraction', () => {
  test('still shows admin-required empty state after switching to Fix sub-tab', async ({
    page,
  }) => {
    await page.goto('/map?activetab=admin');
    const fixButton = page.getByRole('button', { name: 'Fix', exact: true });
    await expect(fixButton).toBeVisible({ timeout: 30_000 });
    await fixButton.dispatchEvent('click');
    await expect(
      page.getByText('Admin Privileges Required', { exact: true })
    ).toBeVisible({ timeout: 15_000 });
  });
});
