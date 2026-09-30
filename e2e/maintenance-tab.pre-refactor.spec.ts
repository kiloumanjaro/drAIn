import { test, expect } from '@playwright/test';

// Covers components/control-panel/tabs/maintenance.tsx
// Maintenance is rendered inside <ControlPanel /> on /map, gated behind the
// top-level 'admin' tab and the inner 'Fix' sub-tab. The ControlPanel's
// activeAdminTab state defaults to 'reports' (the 'View' sub-tab), so we
// have to click 'Fix' to reach the Maintenance component.
test.describe('maintenance tab (mounted in /map control panel)', () => {
  test('shows admin-required empty state after switching to Fix sub-tab', async ({
    page,
  }) => {
    await page.goto('/map?activetab=admin');

    // The admin tab renders the AdminTabControl with View / Fix buttons
    // (components/admin-tab-control.tsx). Wait for and click Fix to switch
    // activeAdminTab from 'reports' to 'maintenance'.
    const fixButton = page.getByRole('button', { name: 'Fix', exact: true });
    await expect(fixButton).toBeVisible({ timeout: 30_000 });
    // The map fails to initialize without a Mapbox token in this env and
    // renders a full-screen "Map Initialization Error" overlay that
    // intercepts pointer events on top of the control panel. dispatchEvent
    // bypasses the browser's hit testing entirely and fires the React
    // onClick handler directly on the AdminTabControl 'Fix' button.
    await fixButton.dispatchEvent('click');

    // Without an admin profile, maintenance.tsx renders this exact copy
    // (components/control-panel/tabs/maintenance.tsx:421 + :424).
    await expect(
      page.getByText('Admin Privileges Required', { exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByText('Link an agency account for access', { exact: true })
    ).toBeVisible();

    // The unauthenticated branch also renders the "Maintenance History"
    // CardTitle (components/control-panel/tabs/maintenance.tsx:393).
    await expect(
      page.getByText('Maintenance History', { exact: true })
    ).toBeVisible();
  });
});
