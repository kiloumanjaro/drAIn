import type { Database } from '@/types/database.types';

type Functions = Database['public']['Functions'];
type Returned<F extends keyof Functions> =
  Functions[F]['Returns'] extends (infer R)[] ? R : Functions[F]['Returns'];

/**
 * One row a database function returns, with the columns named in `Nullable`
 * widened to `| null`. `supabase gen types` marks every function column
 * NOT NULL, so this is where the app records which ones can be null;
 * `types/database.types.ts` itself is generated output and never edited.
 */
export type FunctionRow<
  F extends keyof Functions,
  Nullable extends keyof Returned<F> = never,
> = Omit<Returned<F>, Nullable> & {
  [P in Nullable]: Returned<F>[P] | null;
};
