import { readTextCapped } from '@/lib/http/read-body';
import {
  MAX_REPORT_BYTES,
  describeCspViolation,
  isCspReportType,
  parseCspReports,
} from '@/lib/security/csp-report';
import {
  clientAddress,
  createReportLimiter,
} from '@/lib/security/report-limiter';

// Kept in this server instance's memory. On serverless hosting every
// instance has its own, gone when it is recycled, so the limits are
// per-instance and best-effort (see lib/security/report-limiter.ts).
const limiter = createReportLimiter();

/**
 * Where browsers post what the content security policy blocked (the
 * report-uri and report-to directives in next.config.ts). Each violation
 * becomes one warning in the server log, which is the only place they go.
 *
 * Browsers send these without credentials and anyone can post here, so there
 * is no sign-in and no database, the body is read up to a small limit, and
 * the answer is the same empty 204 whatever was sent.
 *
 * So that it can't be used to fill the log, an address gets 20 reports a
 * minute (the rest are dropped unread), a violation already logged in the
 * last ten minutes is counted instead of logged again, and all callers
 * together cause at most 60 lines a minute.
 */
export async function POST(request: Request) {
  if (
    isCspReportType(request.headers.get('content-type')) &&
    limiter.admit(clientAddress(request.headers))
  ) {
    try {
      const text = await readTextCapped(request, MAX_REPORT_BYTES);
      if (text) {
        for (const violation of parseCspReports(text)) {
          const line = limiter.lineToLog(describeCspViolation(violation));
          if (line) console.warn(line);
        }
      }
    } catch {
      // A body that broke off part-way; there is nothing to log.
    }
  }

  return new Response(null, { status: 204 });
}
