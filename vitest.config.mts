import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Honours the "@/*" paths from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    // These suites cover pure logic only; nothing renders, so no DOM is needed.
    environment: 'node',
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      // Playwright specs, which have their own runner (pnpm test:e2e).
      'e2e/**',
      '.next/**',
    ],
  },
});
