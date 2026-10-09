import { test, expect } from '@playwright/test';

// The content security policy (next.config.ts) is enforced, so anything it
// does not list is blocked rather than only reported. These pages need no
// Mapbox token, and each must load without the browser blocking anything.
// The dev server's policy also allows what hot reload needs; that changes
// neither the header's name nor what these pages load.

type ViolationWindow = Window & { __cspViolations?: string[] };

const ROUTES = ['/login', '/signup', '/docs'];

/** How long late requests (fonts, the embedded video) get to start. */
const SETTLE_MS = 2_000;

test.describe('content security policy', () => {
  for (const route of ROUTES) {
    test(`${route} is served an enforced policy and breaks none of it`, async ({
      page,
    }) => {
      // Added before any page script runs, so nothing is missed.
      await page.addInitScript(() => {
        const seen: string[] = [];
        (window as ViolationWindow).__cspViolations = seen;
        document.addEventListener('securitypolicyviolation', (event) => {
          seen.push(`${event.effectiveDirective} blocked ${event.blockedURI}`);
        });
      });

      const response = await page.goto(route);
      const headers = response?.headers() ?? {};
      expect(headers['content-security-policy']).toContain(
        "default-src 'self'"
      );
      expect(headers['content-security-policy-report-only']).toBeUndefined();

      await expect(page.locator('main').first()).toBeVisible({
        timeout: 30_000,
      });
      await page.waitForLoadState('load');
      await page.waitForTimeout(SETTLE_MS);

      const violations = await page.evaluate(
        () => (window as ViolationWindow).__cspViolations
      );
      expect(violations).toEqual([]);
    });
  }
});
