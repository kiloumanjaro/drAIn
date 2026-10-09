/**
 * Reading what browsers post when the content security policy blocks
 * something (app/api/csp-report). Anyone can post there, so every field is
 * treated as hostile text: cut to size, stripped of control characters and
 * never passed on whole.
 */

/** Largest report body read; a real report is around 1 KB. */
export const MAX_REPORT_BYTES = 16 * 1024;

/** Reports logged from one request (the Reporting API sends them in batches). */
export const MAX_REPORTS_PER_REQUEST = 10;

const MAX_FIELD_CHARS = 200;

export interface CspViolation {
  /** The directive that was broken, e.g. `img-src`. */
  directive: string;
  /** What was blocked: an address without its query, or a word like `inline`. */
  blockedUri: string;
  /** Path of the page it happened on, without query or fragment. */
  documentPath: string;
}

/** The two media types browsers send reports as. */
export function isCspReportType(contentType: string | null): boolean {
  const type = contentType?.split(';')[0].trim().toLowerCase();
  return (
    type === 'application/csp-report' || type === 'application/reports+json'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** One line of printable text, so a report can't forge or flood log lines. */
function clean(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .slice(0, MAX_FIELD_CHARS * 4)
    .replace(/[^\x20-\x7e]/g, '')
    .slice(0, MAX_FIELD_CHARS);
}

/**
 * An address without its query or fragment, which can hold tokens (a
 * password-reset link, a signed URL). Anything that isn't an address, such as
 * `inline` or `eval`, is kept as the word it is.
 */
function withoutQuery(value: unknown): string {
  const text = clean(value);
  return text.split(/[?#]/)[0];
}

function pathOf(value: unknown): string {
  const text = withoutQuery(value);
  try {
    return new URL(text).pathname;
  } catch {
    return text.startsWith('/') ? text : '';
  }
}

function directiveOf(value: unknown): string {
  // Older browsers send the directive with its sources: "img-src 'self'".
  const name = clean(value).split(' ')[0];
  return /^[a-z][a-z-]*$/.test(name) ? name : '';
}

function toViolation(
  directive: unknown,
  blocked: unknown,
  document: unknown
): CspViolation | null {
  const name = directiveOf(directive);
  if (!name) return null;
  return {
    directive: name,
    blockedUri: withoutQuery(blocked) || 'unknown',
    documentPath: pathOf(document) || 'unknown',
  };
}

/**
 * The violations in a report body, in either format:
 * - `application/csp-report` (report-uri): `{ "csp-report": { ... } }`
 * - `application/reports+json` (report-to): a list of `{ type, url, body }`
 *
 * Anything that isn't a report (bad JSON, another shape, another report type)
 * gives an empty list.
 */
export function parseCspReports(text: string): CspViolation[] {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return [];
  }

  if (isRecord(payload) && isRecord(payload['csp-report'])) {
    const report = payload['csp-report'];
    const violation = toViolation(
      report['effective-directive'] ?? report['violated-directive'],
      report['blocked-uri'],
      report['document-uri']
    );
    return violation ? [violation] : [];
  }

  const entries = Array.isArray(payload) ? payload : [payload];
  const violations: CspViolation[] = [];
  for (const entry of entries.slice(0, MAX_REPORTS_PER_REQUEST)) {
    if (!isRecord(entry) || entry.type !== 'csp-violation') continue;
    if (!isRecord(entry.body)) continue;
    const violation = toViolation(
      entry.body.effectiveDirective,
      entry.body.blockedURL,
      entry.body.documentURL ?? entry.url
    );
    if (violation) violations.push(violation);
  }
  return violations;
}

/** The log line for one violation. */
export function describeCspViolation(violation: CspViolation): string {
  return `CSP violation: ${violation.directive} blocked ${violation.blockedUri} on ${violation.documentPath}`;
}
