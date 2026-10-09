import { describe, expect, it } from 'vitest';
import {
  MAX_REPORTS_PER_REQUEST,
  describeCspViolation,
  isCspReportType,
  parseCspReports,
} from './csp-report';

describe('isCspReportType', () => {
  it('accepts the two report media types', () => {
    expect(isCspReportType('application/csp-report')).toBe(true);
    expect(isCspReportType('application/reports+json')).toBe(true);
    expect(isCspReportType('Application/CSP-Report; charset=utf-8')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(isCspReportType(null)).toBe(false);
    expect(isCspReportType('')).toBe(false);
    expect(isCspReportType('application/json')).toBe(false);
    expect(isCspReportType('text/plain')).toBe(false);
  });
});

describe('parseCspReports', () => {
  it('reads a report-uri report', () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://app.test/map?activetab=profile',
        'violated-directive': 'img-src',
        'effective-directive': 'img-src',
        'blocked-uri': 'https://evil.test/pixel.gif',
        'original-policy': "default-src 'self'",
      },
    });

    expect(parseCspReports(body)).toEqual([
      {
        directive: 'img-src',
        blockedUri: 'https://evil.test/pixel.gif',
        documentPath: '/map',
      },
    ]);
  });

  it('reads the directive when an older browser sends its sources too', () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://app.test/docs',
        'violated-directive': "script-src 'self' 'unsafe-inline'",
        'blocked-uri': 'eval',
      },
    });

    expect(parseCspReports(body)).toEqual([
      { directive: 'script-src', blockedUri: 'eval', documentPath: '/docs' },
    ]);
  });

  it('reads a batch of Reporting API reports', () => {
    const body = JSON.stringify([
      {
        type: 'csp-violation',
        age: 12,
        url: 'https://app.test/dashboard',
        user_agent: 'Mozilla/5.0',
        body: {
          documentURL: 'https://app.test/dashboard#reports',
          effectiveDirective: 'connect-src',
          blockedURL: 'wss://other.test/socket',
          disposition: 'enforce',
        },
      },
      {
        type: 'csp-violation',
        url: 'https://app.test/simulation?active=true',
        body: { effectiveDirective: 'script-src-elem', blockedURL: 'inline' },
      },
    ]);

    expect(parseCspReports(body)).toEqual([
      {
        directive: 'connect-src',
        blockedUri: 'wss://other.test/socket',
        documentPath: '/dashboard',
      },
      {
        directive: 'script-src-elem',
        blockedUri: 'inline',
        documentPath: '/simulation',
      },
    ]);
  });

  it('skips other kinds of report in a batch', () => {
    const body = JSON.stringify([
      { type: 'deprecation', url: 'https://app.test/', body: { id: 'x' } },
      {
        type: 'csp-violation',
        url: 'https://app.test/',
        body: { effectiveDirective: 'img-src', blockedURL: 'data' },
      },
    ]);

    expect(parseCspReports(body)).toEqual([
      { directive: 'img-src', blockedUri: 'data', documentPath: '/' },
    ]);
  });

  it('drops queries and fragments, which can hold tokens', () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://app.test/login?token=secret#access_token=abc',
        'effective-directive': 'img-src',
        'blocked-uri': 'https://cdn.test/a.png?signature=secret',
      },
    });

    const [violation] = parseCspReports(body);
    expect(violation.documentPath).toBe('/login');
    expect(violation.blockedUri).toBe('https://cdn.test/a.png');
    expect(describeCspViolation(violation)).not.toContain('secret');
  });

  it('logs no more than a fixed number from one request', () => {
    const body = JSON.stringify(
      Array.from({ length: 500 }, () => ({
        type: 'csp-violation',
        url: 'https://app.test/',
        body: { effectiveDirective: 'img-src', blockedURL: 'data' },
      }))
    );

    expect(parseCspReports(body)).toHaveLength(MAX_REPORTS_PER_REQUEST);
  });

  it('keeps each field to one short printable line', () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://app.test/map',
        'effective-directive': 'img-src',
        'blocked-uri': `https://evil.test/\n[error] forged line\u001b[31m/${'a'.repeat(5000)}`,
      },
    });

    const line = describeCspViolation(parseCspReports(body)[0]);
    expect(line).not.toMatch(/[\n\r\u001b]/);
    expect(line.length).toBeLessThan(300);
  });

  it('ignores a directive that is not a directive name', () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://app.test/',
        'effective-directive': '<script>alert(1)</script>',
        'blocked-uri': 'inline',
      },
    });

    expect(parseCspReports(body)).toEqual([]);
  });

  it('fills in what a report leaves out', () => {
    const body = JSON.stringify({
      'csp-report': { 'effective-directive': 'font-src' },
    });

    expect(parseCspReports(body)).toEqual([
      { directive: 'font-src', blockedUri: 'unknown', documentPath: 'unknown' },
    ]);
  });

  it('returns nothing for garbage', () => {
    for (const body of [
      '',
      'not json',
      '{"csp-report":',
      'null',
      '42',
      '"text"',
      '[]',
      '{}',
      '[null, 1, "x", []]',
      '{"csp-report": "nope"}',
      '{"csp-report": {}}',
      '{"csp-report": {"effective-directive": 12}}',
      '[{"type": "csp-violation"}]',
      '[{"type": "csp-violation", "body": []}]',
    ]) {
      expect(parseCspReports(body), body).toEqual([]);
    }
  });
});

describe('describeCspViolation', () => {
  it('names the directive, what was blocked and the page', () => {
    expect(
      describeCspViolation({
        directive: 'img-src',
        blockedUri: 'https://evil.test/pixel.gif',
        documentPath: '/map',
      })
    ).toBe(
      'CSP violation: img-src blocked https://evil.test/pixel.gif on /map'
    );
  });
});
