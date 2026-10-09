import { describe, expect, it } from 'vitest';
import { componentTypeLabel, statusLabel } from './display-labels';

describe('componentTypeLabel', () => {
  it('uses the dashboard wording for the database names', () => {
    expect(componentTypeLabel('inlets')).toBe('Inlets');
    expect(componentTypeLabel('outlets')).toBe('Outlets');
    expect(componentTypeLabel('storm_drains')).toBe('Drains');
    expect(componentTypeLabel('man_pipes')).toBe('Pipes');
  });

  it('shows a value it does not know as it came', () => {
    // A report with no category is stored as "Uncategorized".
    expect(componentTypeLabel('Uncategorized')).toBe('Uncategorized');
  });
});

describe('statusLabel', () => {
  it('uses the dashboard wording for the database names', () => {
    expect(statusLabel('pending')).toBe('Pending');
    expect(statusLabel('in-progress')).toBe('In Progress');
    expect(statusLabel('resolved')).toBe('Resolved');
  });

  it('does not call an unknown status pending', () => {
    expect(statusLabel('archived')).toBe('archived');
  });
});
