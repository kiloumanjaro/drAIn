import { test, expect } from '@playwright/test';
import { DEVELOPERS, SECTION_GROUPS } from '../app/(main)/docs/page.constants';

// Post-refactor: verify the new `page.constants.ts` module preserves the
// static configuration that was previously inlined in the docs page.
test.describe('docs/page.constants extracted module', () => {
  test('DEVELOPERS is the original 5-person contributor list', () => {
    expect(DEVELOPERS).toHaveLength(5);
    expect(DEVELOPERS.map((d) => d.initials).sort()).toEqual(
      ['CJ', 'EA', 'JC', 'KB', 'NJ'].sort()
    );
    for (const dev of DEVELOPERS) {
      expect(dev.name).toBeTruthy();
      expect(dev.initials).toMatch(/^[A-Z]{2}$/);
      expect(dev.color).toMatch(/^bg-\w+-100 text-\w+-700$/);
    }
  });

  test('SECTION_GROUPS exposes the three original groupings', () => {
    expect(SECTION_GROUPS.map((g) => g.heading)).toEqual([
      'General',
      'Technical',
      'Operations',
    ]);
  });

  test('SECTION_GROUPS item ids cover every SectionID the page can render', () => {
    const allIds = SECTION_GROUPS.flatMap((g) => g.items.map((i) => i.id));
    // The /docs page conditionally renders these activeSection branches; the
    // sidebar must expose every selectable section.
    const expected = [
      'overview',
      'features',
      'users',
      'reports',
      'architecture',
      'tech-stack',
      'data-sources',
      'simulation',
      'deployment',
      'limitations',
      'demo',
    ];
    expect(allIds.sort()).toEqual(expected.sort());
  });

  test('every SECTION_GROUPS item ships both outline and solid icons', () => {
    for (const group of SECTION_GROUPS) {
      for (const item of group.items) {
        expect(typeof item.icon).toBe('object');
        expect(typeof item.iconSolid).toBe('object');
        expect(item.label).toBeTruthy();
      }
    }
  });
});

// e2e shell check: the docs page still renders the same content after the
// constants extraction (same anchors as the pre-refactor test).
test.describe('/docs page after constants extraction', () => {
  test('overview heading + Our Vision subhead still render', async ({
    page,
  }) => {
    await page.goto('/docs');
    await expect(
      page.getByRole('heading', { name: 'Overview', level: 2 })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: 'Our Vision', level: 3 })
    ).toBeVisible();
  });
});
