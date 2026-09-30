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
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
