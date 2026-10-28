import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StatsCards from './stats-cards';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('StatsCards', () => {
  it('shows each card title and value', () => {
    const html = renderToStaticMarkup(
      <StatsCards
        fixedThisMonth={7}
        pendingIssues={12}
        averageRepairDays={3}
        totalAdmins={8}
        verifiedFixedThisMonth={2}
        awaitingVerification={1}
      />
    );
    for (const text of [
      'Fixed This Month',
      '>7<',
      'Pending Issues',
      '>12<',
      'Average Repair Time',
      '3 days',
      'Agency Staff',
      '>8<',
      '2 checked · 1 job awaiting a check',
    ]) {
      expect(html).toContain(text);
    }
  });
});
