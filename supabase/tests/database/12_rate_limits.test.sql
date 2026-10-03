-- The database-side rate limiter the chatbot route uses (trust step 3).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$select public.consume_rate_limit('chatbot')$$,
  '42501', null,
  'visitors have no allowance'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select throws_ok(
  $$select public.consume_rate_limit('everything')$$,
  '22023', null,
  'an unknown bucket is an error, not unlimited'
);

select is(
  (select bool_and(public.consume_rate_limit('chatbot')) from generate_series(1, 20)),
  true,
  'twenty chatbot messages in ten minutes are allowed'
);

select is(
  public.consume_rate_limit('chatbot'),
  false,
  'the twenty-first is refused'
);

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select is(
  public.consume_rate_limit('chatbot'),
  true,
  'each user has their own allowance'
);

-- Concurrent requests take turns on a per-user, per-bucket advisory lock
-- (held to the end of the transaction), so two at once can't both pass on
-- the same count.
select ok(
  exists (select 1 from pg_locks
          where locktype = 'advisory' and pid = pg_backend_pid() and granted),
  'counting takes an advisory lock'
);

-- Join codes can't be guessed at speed: ten tries an hour. Wrong codes
-- return null rather than raising, so each try stays counted.
select is(
  (select count(*)::int from generate_series(1, 10) n
   where (public.join_agency('WRONG-' || n)).id is null),
  10,
  'ten wrong join codes in an hour are merely wrong'
);

select throws_ok(
  $$select public.join_agency('WRONG-11')$$,
  'P0001', 'Too many tries. Please wait an hour and try again.',
  'the eleventh try is refused'
);

select throws_ok(
  $$select public.join_agency('DRAIN-LOCAL-01')$$,
  'P0001', 'Too many tries. Please wait an hour and try again.',
  'even with the right code, until the hour is up'
);

reset role;
select * from finish();
rollback;
