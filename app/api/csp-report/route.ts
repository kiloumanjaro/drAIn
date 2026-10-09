import { readTextCapped } from '@/lib/http/read-body';
import {
  MAX_REPORT_BYTES,
  describeCspViolation,
  isCspReportType,
  parseCspReports,
} from '@/lib/security/csp-report';

/**
 * Where browsers post what the content security policy blocked (the
 * report-uri and report-to directives in next.config.ts). Each violation
 * becomes one warning in the server log, which is the only place they go.
 *
 * Browsers send these without credentials and anyone can post here, so there
 * is no sign-in and no database, the body is read up to a small limit, and
 * the answer is the same empty 204 whatever was sent.
 */
export async function POST(request: Request) {
  if (isCspReportType(request.headers.get('content-type'))) {
    try {
      const text = await readTextCapped(request, MAX_REPORT_BYTES);
      if (text) {
        for (const violation of parseCspReports(text)) {
          console.warn(describeCspViolation(violation));
        }
      }
    } catch {
      // A body that broke off part-way; there is nothing to log.
    }
  }

  return new Response(null, { status: 204 });
}
