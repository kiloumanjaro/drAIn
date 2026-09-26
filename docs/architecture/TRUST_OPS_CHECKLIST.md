# Trust and operations checklist (temporary, working copy)

Follow-on to `DB_HARDENING_CHECKLIST.md`. Fixes the critique items left open
after the hardening branch (2026-09-26):

- citizen reports are unverified (no dedupe, no rate limit, no photo/pin check);
- resolution is self-attested (whoever did the work certifies it);
- the simulation API has no auth, unbounded overrides, in-memory jobs;
- the chatbot route has no auth, no rate limit, unbounded history;
- the UI never says how confident or how current the model is.

Then writes `drAIn-backend/docs/SCIENCE_ROADMAP.md`, a plan for the science
critique (weights, exposure, validation, storms, tides, blockage, naming).

Local only. Never touch the hosted project; never push; don't merge.

Branches: `trust-and-ops` in **drAIn-frontend** (from `db-hardening`) and in
**drAIn-backend** (from `refactor`). One commit per step, conventional
messages, check each with `git log --oneline -1`.

Gate per frontend step: the schema-first workflow in CLAUDE.md (declarative
sync, db reset, gen types, prettier), then `pnpm type-check`, `pnpm test`,
`pnpm lint`, `npx supabase test db`, `npx supabase db advisors --local`.
Gate per backend step: `ruff format --check`, `ruff check`, `pytest`.

## Decisions taken (recommended defaults, no user input)

- **Staff review of reports.** Staff can confirm or reject a report
  (spam, duplicate, not a drainage problem) and adjust its priority. Rejected
  reports stay visible to staff but drop out of every count, map pin number
  and the validation script.
- **Duplicates.** One open report per reporter per component. A second
  person reporting the same component is corroboration, and is allowed.
- **Rate limits.** In the database, per reporter: signed in 5/hour and
  20/day; signed out 3/hour and 10/day, keyed by a hash of the client IP
  from the request headers. Stored in `private`, never on the report.
- **Photo location.** The photo's EXIF GPS and time are sent with the
  report. A trigger measures the distance to the component and labels it
  `match` (≤ 100 m), `mismatch` or `missing`. Client-supplied, so a signal
  for staff triage, not proof. Said so in comments and UI.
- **Independent resolution.** A resolved maintenance record is
  `unverified` until someone other than the person who did it reviews it:
  another staff member (`review_maintenance`) or a citizen whose report it
  closed (`respond_to_resolution`). A dispute reopens the reports (staff
  dispute: all of them; reporter dispute: theirs) and marks the record
  `disputed`. The dashboard shows how many fixes are verified.
- **Chatbot.** Signed-in only. Input ≤ 2,000 chars, history ≤ 12 turns of
  ≤ 2,000 chars, structured as role/content, with the system prompt as
  Gemini's `systemInstruction`. 20 requests / 10 min and 100 / day per user
  via a database rate limiter. Output capped at 1,024 tokens.
- **Simulation API.** Every `/simulations` call needs a Supabase access
  token, checked against Supabase Auth (cached briefly). Per user: one job
  outstanding, 10 runs per hour. Overrides bounded and finite; unknown node
  and link ids rejected. The deprecated `/run-simulation` is removed.
- **Durable jobs.** When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
  set, the backend mirrors every job to `public.simulation_runs` (owner-only
  RLS, no client writes). Polls fall back to it after a restart or after the
  in-memory retention; jobs caught mid-run by a restart are marked failed.
  Runs older than 7 days are pruned. Without the settings it stays
  in-memory and logs a warning.
- **Model caveats in the UI.** One `model_info` block (network date from
  the .inp title, "not calibrated against field records", provisional
  thresholds, weights) sent by the backend and mirrored in a frontend
  constant for the stored scenarios; shown wherever the ranking is read.

## Steps

- [ ] 0. Branches; this file.
- [ ] 1. Reports: review, dedupe, rate limit, photo check (DB, tests, UI).
- [ ] 2. Independent resolution checks (DB, tests, UI).
- [ ] 3. Chatbot: auth, limits, structured history (DB rate limiter, route, UI).
- [ ] 4. Backend: auth, per-user limits, bounded overrides, drop sync endpoint.
- [ ] 5. Backend + DB: durable simulation runs in Supabase.
- [ ] 6. Frontend: send the token to the simulation API; sign-in prompt.
- [ ] 7. Model caveats: backend `model_info`, frontend notice.
- [ ] 8. Backend validation script: paging, `No hazard`, skip rejected.
- [ ] 9. `drAIn-backend/docs/SCIENCE_ROADMAP.md`.
- [ ] 10. Wrap-up: docs, CLAUDE.md, final gates, report.

## Run log
