# DB hardening checklist (temporary, working copy)

## Context

The Supabase database for drAIn was built without a model or an ORM. The audit at `drAIn-frontend/docs/architecture/DATABASE_AUDIT.md` (2026-09-26) found:

- **Open authorization:** anon can edit or delete reports, users can self-promote to staff, sign-up can claim `admin`, and `barangay_boundaries` has no RLS.
- **Duplicated tables:** 4 maintenance tables, 8 flood tables and 4 component tables.
- **Browser-side aggregation:** dashboards count rows in JS and are capped at 1000 rows.

This checklist is the execution order agreed in chat. It is meant to survive context loss and an unattended run of a couple of hours. The audit IDs (S1, B2, D1…) point back to the evidence.

Everything is local-only. Never touch the hosted project; never push.

This file is the working copy; tick boxes here as steps land, and delete it when every step is done. Work happens on branch `db-hardening`.

## Decisions (answered by the user 2026-09-26)

1. **Joining an agency: one shared join code per agency.**
   - The profile screen's agency picker becomes a code input.
   - The database checks the code and makes the caller `staff` of that agency.
   - An admin can rotate an agency's code. Only a hash is stored, and the plain code is shown once, when it is generated.
   - Users can leave their agency themselves.
   - An admin can still assign a role or agency directly through an RPC. There is no admin UI yet (Studio/SQL).
2. **Existing staff:** local seed only. `admin@` becomes `admin` and `staff@` becomes `staff`, both on the City Engineer Office. The 8 hosted self-linked profiles are out of scope (hosted isn't a target).
3. **Anonymous reports:** kept, insert only. Signed-out users submit pending reports and can't edit or delete any report.
4. **Reporter name visibility:** users get a profile setting to show or hide their name on their reports.
   - Default: shown, which matches today's behaviour.
   - When it's off, the database stores `Anonymous` instead of the name; the real name is never written to a hidden report.
   - `user_id` stays readable (a pseudonymous uuid). Logged as a follow-up.
5. **`report_comments`:** dropped (unused, 0 rows, open INSERT).
6. **Git:** commit the current uncommitted work on branch `refactor`, then work on a new branch `db-hardening`, one commit per step. Conventional-commit messages (commitlint is configured). Verify each commit with `git log --oneline -1`. No push, no merge.

## Green gate (run after every step; don't tick until all pass)

1. Edit `supabase/schemas/*.sql`. Comment anything non-obvious.
2. `npx supabase db schema declarative sync --name <step> --no-apply`
3. `npx supabase db reset`
4. Generate types from Git Bash: `npx supabase gen types typescript --local > types/database.types.ts`.
   - Then `npx prettier --write types/database.types.ts`.
5. `pnpm type-check`, `pnpm test`, `pnpm lint`, and `npx supabase test db` (from step 1 on).
6. `npx supabase db advisors --local`. Record the before/after counts in the run log.
   - If `db reset` fails on the new migration, see "The one exception" in CLAUDE.md (the diff tool can misorder statements).
   - Finish with `declarative sync --name drift_check --no-apply`: it must say "No schema changes found".
7. Tick the box here and in the audit, run `graphify update .`, then commit.

**Stop rule:** if a step won't go green after a few honest attempts:

- restore that step's files;
- log why in the run log;
- continue only with a later step that doesn't depend on it (see "needs").

Never loosen types or policies to make a gate pass.

---

## Step 0 — Setup

- [x] `git status` in `drAIn-frontend`. Confirm `.env.local` and `.env.hosted.local` are git-ignored (`.env.hosted.local` already is).
- [x] Commit the current work on `refactor`: local Supabase setup, typed client, audit doc, CLAUDE.md.
- [x] `git switch -c db-hardening`
- [x] `npx supabase status` shows the stack running.
- [x] Copy this checklist into the repo (see Context).

## Step 1 — RLS test harness (Phase 3, pulled forward)

- [x] `supabase/tests/database/rls.test.sql`: pgTAP (`create extension if not exists pgtap with schema extensions`).
  - Impersonate users with `set local role authenticated` / `anon` and `set local request.jwt.claims` for the seeded ids `00000000-0000-4000-a000-00000000000{1..4}`.
  - Start with tests that pass today: anon can read reports; a citizen can read their own profile.
- Each later step adds its own tests, so the gate stays green.

## Step 2 — One permission model (D5, S1, S2, S10 partial)

- [x] Types and constraints:
  - `user_role` enum (`citizen`, `staff`, `admin`).
  - `profiles.role` becomes `user_role`, default `citizen`.
  - `check ((role = 'citizen') = (agency_id is null))`. This keeps the existing "has agency ⇒ staff" UI checks true (`components/control-panel/tabs/maintenance.tsx:333`, `components/profile/user-links.tsx:38`).
- [x] `private` schema, not exposed to the API, with two functions. Both are `stable security definer set search_path = ''`:
  - `private.current_agency_id()` returns the caller's agency when they are staff or admin, else null;
  - `private.is_admin()`.
- [x] `handle_new_user`: always inserts `citizen` and ignores metadata `role`; set `search_path = ''`.
- [x] Replace `prevent_role_update` with `protect_profile_privileges` (BEFORE UPDATE trigger, `search_path` set). It rejects changes to `role` or `agency_id` unless the caller is admin, `service_role` or `postgres`.
- [x] Join codes:
  - A `private.agency_join_codes (agency_id pk → agencies on delete cascade, code_hash text not null, rotated_at timestamptz)` table. It lives in `private`, so it isn't exposed to the API.
  - `public.rotate_agency_join_code(p_agency_id uuid) returns text`: admin-only.
    - Generates a random 10-character code from an unambiguous alphabet, e.g. `XXXX-XXXX-XX` (~50 bits, so brute force through the API is impractical).
    - Stores `extensions.crypt(code, extensions.gen_salt('bf'))`.
    - Returns the plain code once.
  - `public.join_agency(p_code text) returns uuid` (the agency id), `security definer`, `search_path ''`:
    - caller must be a signed-in `citizen`;
    - matches with `crypt(p_code, code_hash) = code_hash`;
    - sets `role = 'staff'` and `agency_id`;
    - raises a generic "invalid code" error.
  - `public.leave_agency()`: staff go back to `citizen` with a null agency. Admins can't use it, which avoids locking out the last admin.
- [x] `public.set_member_agency(user_id uuid, agency_id uuid, role user_role)`: admin-only RPC for direct assignment.
- [x] Profiles policies use `(select auth.uid())`, which fixes the 3 `auth_rls_initplan` warnings.
- [x] `profiles.id` → `auth.users`: `on delete cascade`.
- [x] Seed (`supabase/seed.sql`; the seed's role metadata is now ignored):
  - `admin@` gets `admin`, `staff@` gets `staff`, both on the agency; the citizens stay `citizen`.
  - Insert a known local join code for the City Engineer Office: `DRAIN-LOCAL-01`, hashed in the seed. Add it to the CLAUDE.md seed row.
- [x] Code:
  - `lib/supabase/profile.ts:143-187`: replace `linkAgencyToProfile` / `unlinkAgencyFromProfile` with `joinAgency(code)` and `leaveAgency()` (`client.rpc`).
  - `components/profile/agency-link.tsx`: the agency picker becomes a code input plus a Join button, with the error message on an invalid code.
  - `components/control-panel/tabs/profile-content.tsx:75,95` calls the new functions and refetches the profile afterwards, because `agency_name` is derived there.
  - Add `agency_id` to `Profile` in `lib/supabase/profile.ts:5`.
- [x] Tests:
  - a citizen can't change their own role or agency directly;
  - sign-up with `{"role":"admin"}` metadata gets `citizen`;
  - `join_agency('DRAIN-LOCAL-01')` makes a citizen staff; a wrong code fails and changes nothing;
  - after rotation the old code fails;
  - `leave_agency()` returns the user to `citizen`;
  - `rotate_agency_join_code` and `set_member_agency` fail for non-admins and work for an admin;
  - `private.agency_join_codes` can't be read through the API.

## Step 3 — Close the independent holes (S3, S5, S6, S8, S10, S11, B1, B4)

Needs: step 2.

- [x] `barangay_boundaries`:
  - enable RLS, with a public SELECT policy;
  - revoke insert, update, delete and truncate from `anon` and `authenticated`.
- [x] `reports` policies:
  - drop the DELETE policy (no callers);
  - UPDATE for staff only: `(select private.current_agency_id()) is not null`;
  - INSERT `with check (status = 'pending' and user_id is not distinct from (select auth.uid()) and resolved_by_maintenance_id is null)`.
- [x] `reports.user_id` → `auth.users`: `on delete set null`.
- [x] Drop `report_comments` and `extract_barangay_from_address` (unused).
- [x] `set search_path` on `get_closest_*` ×4, `get_component_by_category`, `extract_barangay_from_coordinates` and `update_report_zone`. `get_component_by_category` also rejects any name outside the 4 component tables.
- [x] Realtime: `ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reports";` in `schema.sql`. Verified: declarative sync picks this up.
- [x] Storage:
  - drop the ReportImage "Public update access" policy in `schema_auth_storage.sql`;
  - `uploadReport` (`lib/supabase/report.ts:59`) uploads to `public/<crypto.randomUUID()>.<ext>` with no `upsert`;
  - set bucket `file_size_limit` and `allowed_mime_types = ["image/*"]` in `supabase/config.toml`.
- [x] `app/api/reports/download/route.ts`:
  - build a user-scoped client with `@supabase/ssr`, following the `proxy.ts:7` pattern;
  - return 401 or 403 unless the caller is staff;
  - stop using the service-role client.
- [x] `app/api/closest-pipe/route.ts`: use an anon-key server client, not the service role.
- [x] Tests:
  - anon can't update or delete a report;
  - anon can't insert a report with `status = 'resolved'` or someone else's `user_id`;
  - anon can't write `barangay_boundaries`;
  - staff can update a report.

## Step 3b — Reporter name privacy setting (S9, as the user decided)

Needs: step 2.

- [x] `profiles.show_name_on_reports boolean not null default true`. The user can update it on their own row; `protect_profile_privileges` only guards `role` and `agency_id`.
- [x] `set_reporter_name` BEFORE INSERT trigger on `reports`. For signed-in reporters (`user_id` not null), it ignores the client-sent `reporter_name` and writes the profile's `full_name` if the setting is on, else `'Anonymous'`. Anonymous reporters keep what they typed.
- [x] `sync_reporter_name` AFTER UPDATE OF `show_name_on_reports, full_name` trigger on `profiles` (`security definer`, `search_path ''`). It rewrites `reporter_name` on that user's existing reports, so the switch is retroactive both ways.
- [x] Code:
  - Add a toggle ("Show my name on reports") to the profile section, `components/control-panel/tabs/profile-content.tsx` or the edit-profile component, whichever holds the name field.
  - Save it through `lib/supabase/profile.ts` and add it to `Profile`.
  - The report form may keep sending `reporterName`; the trigger wins.
- [x] Tests:
  - with the setting off, a new report and existing reports show `Anonymous`;
  - turning it back on restores the name;
  - an anonymous reporter's typed name is untouched.
- [x] Seed: `citizen2@` has the setting off, so both states are visible locally.

## Step 4 — One maintenance table plus an atomic RPC (D1, S4, B5, B6)

Needs: step 2.

- [x] Enums: `component_type` (`inlets`, `outlets`, `storm_drains`, `man_pipes`, today's spellings) and `maintenance_status` (`in-progress`, `resolved`).
- [x] The `public.maintenance` table:
  - columns: `id`, `created_at`, `performed_at` (was `last_cleaned_at`), `component_type`, `component_name`, `agency_id` → agencies, `performed_by` → profiles, `status not null`, `description`, `evidence_image`;
  - indexes on `(component_name, performed_at desc)`, `(agency_id)` and `(performed_by)`;
  - RLS: public SELECT, and no client INSERT, UPDATE or DELETE.
- [x] `reports` changes:
  - `resolved_by_maintenance_id` → FK to `maintenance`, `on delete set null`;
  - drop `resolved_by_maintenance_type`;
  - add `resolved_at timestamptz`.
- [x] `public.record_maintenance(p_component_type, p_component_name, p_status, p_description, p_evidence_image) returns maintenance`, `security definer`, `search_path ''`. It:
  - requires `private.current_agency_id()`;
  - inserts the maintenance row;
  - updates the component's reports in the same transaction, using the hierarchy now in `lib/supabase/report.ts:178-221`: resolved closes pending and in-progress, in-progress moves pending; `created_at <= now()`. It sets `resolved_by_maintenance_id`, `resolved_image`, and `resolved_at` when resolved.
- [x] Remove the `reports` UPDATE policy. Status changes now go only through the RPC.
- [x] Drop the 4 `*_maintenance` tables.
- [x] Seed: rewrite the maintenance section of `supabase/seed.sql`.
- [x] Code:
  - `lib/supabase/maintenance.ts`: the record functions call the RPC. History reads `maintenance` filtered by `component_name`, aliasing `last_cleaned_at:performed_at` to limit UI churn. Keep the exported `recordXMaintenance`/`getXMaintenanceHistory` names as thin wrappers.
  - Delete `updateReportsStatusForComponent`.
  - `lib/dashboard/queries.ts` (`MAINTENANCE_TABLES`, `fetchMaintenanceDates`, `fetchLastCleanedByComponent`) and `lib/dashboard/metrics.ts` (`lookupMaintenanceDate`, keyed by id only) read the single table.
  - `components/control-panel/tabs/maintenance.helpers.ts` `HistoryItem`.
  - Update the affected vitest tests.
- [x] Delete the `MaintenanceTableName` helper from `types/database.types.ts` and drop the re-append instruction from CLAUDE.md step 4 and from the gate above.
- [x] Tests:
  - a citizen calling `record_maintenance` fails;
  - staff succeeds and the matching reports close;
  - a direct INSERT into `maintenance` is denied.

## Step 5 — The database owns its vocabulary (D6, B8)

Needs: step 4 (`component_type`).

- [x] Enums:
  - Drop the dead enums `asset_point_type`, `drainage_status`, `maintenance_type` and the old `report_status`.
  - Create `report_status` (`pending`, `in-progress`, `resolved`) and `report_priority`.
  - `reports.status`, `priority` and `category` become those enums. Status defaults to `pending`, priority to `low`.
- [x] Replace the hand-written row types with `Tables<'reports'>` plus one mapper; take the status and priority unions from `Constants`. The types:
  - `ReportRow` and `ReportStatusUpdate` in `lib/supabase/report.ts`;
  - `ReportRecord` in `lib/dashboard/queries.ts:133`;
  - `ReportRecord` in `app/api/reports/download/route.ts:4`.
- [x] Type the realtime payload as a row, not `Report` (`lib/supabase/report.ts:298,308`).
- [x] Leave the UI-only `'unresolved'` filter labels alone.

## Step 6 — Dashboard numbers in SQL (D4, B2, B3, B7)

Needs: step 4.

- [x] Views (`security_invoker = true`): `latest_report_per_component` (`distinct on`), `report_counts_by_zone`, `report_counts_by_category`, `report_counts_by_component`, `component_last_maintained` (`max(performed_at)`).
- [x] `security definer` RPCs:
  - `dashboard_overview()`: fixed this month, pending, average repair days from `resolved_at - created_at`, staff count.
  - `team_performance()`: per agency, via `maintenance.agency_id` joined to `reports.resolved_by_maintenance_id`.
- [x] Code:
  - `lib/dashboard/queries.ts` uses these;
  - `fetchLatestReportsPerComponent` uses the view;
  - the map's per-bubble count query (`app/(main)/map/page.tsx:703`) becomes one `report_counts_by_component` fetch;
  - the maintenance tab's `loadReports` (`components/control-panel/tabs/maintenance.tsx:113`) uses `.eq('component_id', …)`.

## Step 7 — Flood results and components (D2, D3)

- [x] `flood_results`:
  - `return_period smallint` plus snake_case metric columns, PK `(return_period, node_id)`;
  - regenerate that part of `supabase/seed/reference_data.sql` with a node script from the 8 YR inserts;
  - drop the 8 tables;
  - `lib/vulnerabilities/fetch-yr-table.ts` uses `.eq('return_period', YR)`.
- [x] **Bug found while planning:** each YR table has 1369 rows, and `max_rows` is 1000, so `fetchYRTable` is already truncated today. Page through it with `.range()` or return it from an RPC. Add this to the audit as B11.
- [x] `components (name pk, type component_type, location geography(Point) + GiST)`:
  - fill it from the 4 tables in the reference seed;
  - FK from `reports.component_id` and `maintenance.component_name`. The hosted check found 0 orphans.
- [x] One `nearest_components(type, lat, lon, radius_m default 50, max_results default 3)` (`language sql stable`, `search_path` set) replaces `get_closest_*` ×4 and `get_component_by_category`. Update `app/api/closest-pipe/route.ts` and `components/reports/submit-tab.tsx:196`.
- [x] `EXPLAIN` shows an index scan, not `Seq Scan`.

## Step 8 — Cleanup (D8, D9)

- [ ] Drop `idx_report_category`. The duplicate YR indexes go with step 7.
- [ ] Comment `geocode_worker_lock`: it is service-role only by design.
- [ ] `profiles.updated_at` set by a trigger, and removed from the client update in `lib/supabase/profile.ts:82`.
- [ ] Fix the `reports.zone` comment and the one at `lib/dashboard/queries.ts:277`.

## Step 9 — Wrap-up

- [ ] Final gate. Record the advisor counts before and after: 1 error / 20 warnings / 39 info.
- [ ] Tick the audit items. Write the run log below: done, skipped and why, and follow-ups for the user.
- [ ] Leave `db-hardening` unmerged and unpushed for review.

## Out of scope (needs the user)

- Rotate the service-role key.
- Anything on the hosted project.
- Bring the `geocodeWorker` source and a Vault secret into the repo (D7).
- Hiding `reports.user_id` from the public; the name setting in step 3b covers names only.
- An admin UI for assigning staff and rotating join codes (SQL/Studio for now).
- Rate-limiting `join_agency` attempts; the code length makes brute force impractical for now.
- Removing `control-panel-portable`.
- Deleting the stray `Project Drain/supabase/` folder.

## Expected reach in a couple of hours

Steps 0–3b are realistic and step 4 is likely. The join codes and the name setting add UI work to steps 2 and 3b. Steps 5–9 are a second session.

## Run log

(append as steps finish: step, commit hash, advisor counts, notes)

- Step 0 (setup): baseline advisors 1 error / 20 warn / 39 info. Branch `db-hardening` off `refactor` at e00c7be.
- Step 1 (test harness): `supabase/tests/database/01_baseline.test.sql`, 4 tests pass.
- Step 2 (permission model): advisors 1 error / 16 warn / 40 info (auth_rls_initplan ×3 and one search_path warning gone; +1 info: agency_join_codes has RLS and no policies, by design). 18 new pgTAP tests. Verified over REST: self-set agency 403, wrong code 400, right code joins, anon 401. Note: declarative sync emitted SET DEFAULT before CREATE TYPE; fixed by hand in the migration, documented in CLAUDE.md.
- Step 3 (open access): advisors 0 error / 4 warn / 37 info. 16 new pgTAP tests (38 total). Verified on a dev server: CSV download 401 without token, 403 citizen, 200 staff; closest-pipe 200 with no service key. Extra: Avatars UPDATE policy for their own folder (upsert needed it). Declarative sync ignores GRANT narrowing because of the default privileges; explicit REVOKE in schema.sql does work.
- Step 3b (reporter name setting): advisors 0 error / 4 warn / 38 info. 8 new pgTAP tests (46 total). Verified over REST: turning the setting off rewrites the citizen's existing reports to Anonymous, and back. The toggle sits under Display Name in the profile Edit tab.
- Step 4 (one maintenance table): advisors 0 error / 0 warn / 27 info. 12 new pgTAP tests (58 total); vitest 214 (the 4 per-table collision tests became 3 id-lookup tests, plus 1 for last-cleaned ordering). Verified over REST: citizen record 403; staff record resolves ISD-1 report and sets resolved_at; history reads with the last_cleaned_at alias. Migration hand-edited to copy old rows before the drops (dry-run against the pre-step-4 data: both rows and report links carried). Known limit: history shows staff names only to that staff member, because profiles are readable only by their owner (step 6).
- Step 5 (vocabulary): advisors 0 error / 0 warn / 27 info. 8 new pgTAP tests (66 total); vitest 214. Migration hand-edited (premature SET DEFAULT again; fill null priorities before NOT NULL), dry-run on existing rows OK. Verified over the API: status "unresolved" rejected (22P02); realtime INSERT event received after "Subscribed to PostgreSQL". Also dropped idx_report_category (step 8 item) because the enum made its predicate invalid, and deleted the uncalled deleteReportsByComponentId.
- Step 6 (dashboard in SQL): advisors 0 error / 0 warn / 24 info. 13 new pgTAP tests (79 total). vitest 190: the tests of the removed JS arithmetic (calculations/metrics, 35 tests) went with it, their rules are now pgTAP tests; +3 fetchAllRows, +8 mapping tests. Deviations: no `component_last_maintained` view (resolved_at made it unnecessary); the app still derives latest-per-component from the list it has already loaded (no extra request), the view is there for other readers. Added `maintenance_history` RPC so staff see colleagues' names (the step 4 limit). fetchAllReports and the dashboard list now page past 1,000 rows.
- Step 7 (flood results, components): advisors 0 error / 0 warn / 15 info. 11 new pgTAP tests (90 total); vitest 190. Migration hand-edited to copy the 8 flood tables and fill components before the drops and FKs (dry-run on existing data: 8x1369 rows, 1555 components). flood_results metrics made NOT NULL (no nulls in data) in a second small migration. Verified: nearest_components uses idx_components_location; over the real API a single select returns 1000/1369 flood rows and 1000/1231 storm drains, paged reads return all; /api/closest-pipe works on a dev server. Not done: generating the map GeoJSON from the database.
