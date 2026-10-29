import { describe, expect, it } from 'vitest';
import { Constants } from '@/types/database.types';
import { REPORT_STATUS_STYLE, statusBadgeCss } from './status-style';

describe('REPORT_STATUS_STYLE', () => {
  it('has a label and three colours for every report status', () => {
    for (const status of Constants.public.Enums.report_status) {
      const s = REPORT_STATUS_STYLE[status];
      expect(s.label).not.toBe('');
      expect(s.bgColor).toMatch(/^#/);
      expect(s.borderColor).toMatch(/^#/);
      expect(s.textColor).toMatch(/^#/);
    }
    expect(REPORT_STATUS_STYLE['in-progress'].label).toBe('In Progress');
  });

  it('gives an unknown status the pending look rather than crashing', () => {
    expect(statusBadgeCss('archived')).toEqual(statusBadgeCss('pending'));
    expect(statusBadgeCss('resolved')).not.toEqual(statusBadgeCss('pending'));
  });
});
