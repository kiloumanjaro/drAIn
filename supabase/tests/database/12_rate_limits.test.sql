-- The database-side rate limiter the chatbot route uses (trust step 3).
-- Impersonation pattern: see 01_baseline.test.sql.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

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

reset role;
select * from finish();
rollback;
