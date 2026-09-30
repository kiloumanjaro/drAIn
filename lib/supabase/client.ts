import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const client = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default client;
