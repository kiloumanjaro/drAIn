// Minimal stand-ins for the @supabase/supabase-js `User` / `Session` types.
// The portable bundle is Supabase-free, so we define just enough shape for the
// control panel's profile/auth UI to type-check and render.

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Session {
  user: User;
  access_token?: string;
  [key: string]: unknown;
}
