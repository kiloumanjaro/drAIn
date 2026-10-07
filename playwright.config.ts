import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests in e2e/ (`pnpm test:e2e`). They run against the dev server
 * and whatever Supabase .env.local points at, which should be the local
 * stack (`npx supabase start`). Map views need NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
 * without it the map pages show their own error, and specs that expect a
 * working map fail.
 */
const PORT = 3055;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  // In CI: a stray test.only fails the run instead of quietly skipping the
  // rest; the dev server compiles each page on its first visit, so a slow
  // first load gets a second try and fewer pages compile at once.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
