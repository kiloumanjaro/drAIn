import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * A Supabase client for API routes that acts as the caller, so row-level
 * security applies exactly as it would in the browser.
 *
 * The browser keeps its session in localStorage, not cookies, so a signed-in
 * caller sends its access token as `Authorization: Bearer <token>` (see
 * download-reports-modal.tsx). Without the header the client is anonymous.
 *
 * There is deliberately no service-role client here: nothing in the app
 * needs to bypass row-level security.
 */
export function createRequestClient(authorization?: string | null) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: authorization ? { Authorization: authorization } : {},
      },
    }
  );
}
