-- The daily caps in consume_rate_limit: 100 chatbot messages and 20 join-code
-- tries a day. 12_rate_limits.test.sql covers the short windows (20 in ten
-- minutes, 10 an hour) but never reached these: inside one transaction now()
-- is frozen, so earlier use is backdated past the short window as the table
-- owner, the way 20_gap_fill.test.sql does for reports.
-- Impersonation pattern: see 01_baseline.test.sql. Citizens: ...0003, ...0004.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

-- Chatbot -------------------------------------------------------------------------

-- Citizen2 (...0004) sent 99 messages earlier today, all more than ten
-- minutes ago, so the short count is 0 and only the daily count is in play.
insert into private.rate_limit_events (bucket, user_id, created_at)
select 'chatbot', '00000000-0000-4000-a000-000000000004', now() - interval '3 hours'
from generate_series(1, 99);

-- Join codes: 19 tries by citizen2 earlier today, outside the last hour.
insert into private.rate_limit_events (bucket, user_id, created_at)
select 'join_agency', '00000000-0000-4000-a000-000000000004', now() - interval '3 hours'
from generate_series(1, 19);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select is(
  public.consume_rate_limit('chatbot'),
  true,
  'the hundredth chatbot message of the day is still allowed'
);

select is(
  public.consume_rate_limit('chatbot'),
  false,
  'the hundred-and-first is refused, even with the ten minutes wide open'
);

reset role;
select is(
  (select count(*)::int from private.rate_limit_events
   where bucket = 'chatbot' and user_id = '00000000-0000-4000-a000-000000000004'),
  100,
  'a refused message is not counted'
);

-- The window slides: messages older than a day no longer count. Citizen
-- (...0003) sent 100, but 25 hours ago. (Inserted here, not at the top: every
-- allowed call also prunes rows older than a day.)
insert into private.rate_limit_events (bucket, user_id, created_at)
select 'chatbot', '00000000-0000-4000-a000-000000000003', now() - interval '25 hours'
from generate_series(1, 100);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select is(
  public.consume_rate_limit('chatbot'),
  true,
  'yesterday''s hundred messages do not block today''s first'
);

-- Join codes ----------------------------------------------------------------------

set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select is(
  (public.join_agency('WRONG-20')).id,
  null,
  'the twentieth join-code try of the day is merely wrong'
);

select throws_ok(
  $$select public.join_agency('WRONG-21')$$,
  'P0001', 'Too many tries. Please wait an hour and try again.',
  'the twenty-first is refused, even with the hour wide open'
);

select throws_ok(
  $$select public.join_agency('DRAIN-LOCAL-01')$$,
  'P0001', 'Too many tries. Please wait an hour and try again.',
  'even with the right code'
);

reset role;
select is(
  (select role::text from public.profiles where id = '00000000-0000-4000-a000-000000000004'),
  'citizen',
  'so the caller is still a citizen'
);

-- One bucket's use does not spend another's: the chatbot cap above was
-- reached by this same user before any join-code try was made today.
select is(
  (select count(*)::int from private.rate_limit_events
   where bucket = 'join_agency' and user_id = '00000000-0000-4000-a000-000000000004'),
  20,
  'each bucket is counted on its own'
);

select * from finish();
rollback;
