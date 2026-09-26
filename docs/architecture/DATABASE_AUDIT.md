# Database audit — 2026-09-26

Scope: the Supabase database (`supabase/schemas/`) and every piece of code that talks to it. The goal is a schema that is safe to put in production and cheap to change.

**How this was checked**

- `npx supabase db advisors --local --level info` (the same lints as the dashboard's Security and Performance Advisors): 1 error, 20 warnings, 39 info.
- Queries against the local stack, including `EXPLAIN` on the nearest-component lookup.
- Read-only counts on the hosted project: 86 reports, 15 profiles, 194 maintenance rows, 0 comments.
- A read of every `.from()`, `.rpc()`, `.storage` and `.channel()` call in the app.

File references are relative to `drAIn-frontend/`.

**Progress** (branch `db-hardening`; order and detail in `DB_HARDENING_CHECKLIST.md`)

- Fixed: S1, S2 (step 2: roles, join codes, guarded `role`/`agency_id`); `auth_rls_initplan` ×3; `profiles` side of B4.
- Fixed: S3, S5, S6, S8, S10 (search_path, category whitelist), S11, B1, `reports.user_id` side of B4; `report_comments` and `extract_barangay_from_address` dropped (step 3). Avatars also got the UPDATE policy their upsert needs.
- S9, partly (step 3b): a profile setting hides a person's name on their reports; the database stores "Anonymous" instead. `user_id` is still public.
- Fixed: D1, S4, B5, B6, and B4 for maintenance (step 4): one `maintenance` table written only by the `record_maintenance` RPC, which also closes the reports in the same transaction. `reports.resolved_by_maintenance_id` is a real FK; `resolved_at` added. The migration carries old rows across, including the 89 hosted `addressed_report_id` links. B3 fixed along the way (last-cleaned reads oldest first).
- Fixed: B8, D6 and part of B9 (step 5): `reports.status`, `priority` and `category` are enums (`report_status`, `report_priority`, `component_type`); the 4 dead enums and the never-matching `idx_report_category` are gone. App types come from `lib/supabase/enums.ts` (generated `Constants`); the hand-written report row types were replaced with `Tables<'reports'>`. Realtime verified end to end locally.
- Advisors after step 4: 0 errors, 0 warnings, 27 info.
- Advisors after step 3: 0 errors, 4 warnings (the maintenance INSERT policies, step 4), 37 info.

---

## Verdict

The schema grew one feature at a time, table by table, with no model behind it. Three things follow from that.

1. **Authorization is effectively off.**
   - Anyone with the public anon key can edit or delete any report.
   - Any signed-in user can make themselves agency staff.
   - Barangay boundaries are writable by anyone.

   The app hides buttons, but the database doesn't enforce anything. These are the only findings that must be fixed before real users arrive.

2. **One concept is stored as several copies.**
   - 4 maintenance tables.
   - 8 flood-result tables.
   - 4 component tables plus a GeoJSON copy of each.
   - 4 copy-pasted nearest-component functions.

   Each copy has drifted: different name columns, different delete rules, one table without a primary key. The code carries the cost through runtime table names, `as unknown as` casts and a hand-maintained `MaintenanceTableName` helper.

3. **Logic that belongs in SQL runs in the browser.** Dashboards download whole tables to count them. That silently stops being correct at 1,000 rows, the API's row limit. Multi-step writes such as "record maintenance, then update reports" are not atomic.

The good news is that you develop locally from `schemas/`, and the hosted data is small and disposable. Restructuring now costs a schema edit and a `db reset`. After launch, every change needs a data migration.

---

## 1. Security (fix before production)

| #   | Finding                                                                                                                                                                                                                                                                                                                                           | Evidence                                                                                                                                                                                | Fix                                                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Any user can make themselves staff.** The app treats "has an `agency_id`" as admin. The profiles UPDATE policy lets a user write _any_ column of their own row, including `agency_id`, and the UI does exactly that. 8 of 15 hosted profiles have an agency.                                                                                    | `components/control-panel/tabs/profile-content.tsx:75` → `lib/supabase/profile.ts:143`. Admin check at `components/control-panel/tabs/maintenance.tsx:333`. Policy at `schema.sql:1198` | Column-level grants: `revoke update on profiles from authenticated; grant update (full_name, avatar_url) on profiles to authenticated;`. Agency membership is set by an admin through a checked RPC, not self-service. |
| S2  | **Anyone can sign up as `admin`.** `handle_new_user` copies `role` from client-supplied sign-up metadata. `prevent_role_update` then blocks _every_ role change, even an admin's, so sign-up is the only way to set a role. The secure path doesn't exist; only the insecure one does.                                                            | `schema.sql:306-320`, `326-338`                                                                                                                                                         | Ignore metadata `role`; always insert `'citizen'`. Let `prevent_role_update` pass for `service_role` or admins.                                                                                                        |
| S3  | **Anonymous users can update and delete any report.** The UPDATE policy is `USING (true)` with no `WITH CHECK`, so any column can be rewritten, including `user_id` and `status`. The DELETE policy is also `USING (true)`; it is misnamed "Enable read access for all users", and no code uses it (`deleteReportsByComponentId` has no callers). | `schema.sql:1282`, `1306`. Advisor `rls_policy_always_true`                                                                                                                             | Drop the DELETE policy. UPDATE for staff only; better, no client UPDATE at all, with status changes through the RPC in D4. INSERT `WITH CHECK (status = 'pending' AND user_id IS NOT DISTINCT FROM auth.uid())`.       |
| S4  | **Any signed-in user can insert maintenance as any agency and any person.** `WITH CHECK (true)` on all 4 tables, so a citizen can forge a record "by" another staff member.                                                                                                                                                                       | `schema.sql:1202-1214`. Advisor `rls_policy_always_true` ×4                                                                                                                             | `WITH CHECK (agency_id = private.current_agency_id() AND represented_by = auth.uid())`.                                                                                                                                |
| S5  | **`barangay_boundaries` has RLS off** and `GRANT ALL` to `anon`. Anyone can rewrite the polygons that the zone trigger uses to tag every report.                                                                                                                                                                                                  | Advisor `rls_disabled_in_public` (ERROR)                                                                                                                                                | Enable RLS, add a public SELECT policy, and revoke writes from `anon` and `authenticated`.                                                                                                                             |
| S6  | **Report photos can be overwritten by anyone.** Uploads go to `public/<original filename>` with `upsert: true`, and the bucket has a public UPDATE policy. A second phone upload named `image.jpg` replaces the first report's photo. That is a data-loss bug, not only a security hole.                                                          | `lib/supabase/report.ts:59-65`. `schema_auth_storage.sql:16-18`                                                                                                                         | Upload to `reports/<uuid>.<ext>`, drop `upsert` and the UPDATE policy. Put maintenance evidence under a staff-only path. Set `file_size_limit` and `allowed_mime_types` on the buckets in `config.toml`.               |
| S7  | **The service-role JWT is hard-coded in the hosted geocode trigger.** It is redacted here but live on the hosted project.                                                                                                                                                                                                                         | `schema.sql:1073`                                                                                                                                                                       | Rotate the key. Rebuild the trigger to read the URL and key from Supabase Vault, so no secret lives in DDL. See D7.                                                                                                    |
| S8  | **`/api/reports/download` exports every report with no auth check, using the service-role key** (which bypasses RLS). `/api/closest-pipe` also uses the service key for a public lookup.                                                                                                                                                          | `app/api/reports/download/route.ts:2,47`. `app/api/closest-pipe/route.ts:2`                                                                                                             | Use a user-scoped client (`@supabase/ssr`) and require staff for the export. The nearest-component lookup needs only the anon key.                                                                                     |
| S9  | **Reports are world-readable, including `reporter_name` and `user_id`.** That may be intended for a public map, but it is a privacy decision that should be made on purpose.                                                                                                                                                                      | `schema.sql:1302`                                                                                                                                                                       | Expose a `public_reports` view without personal columns; keep the base table staff-readable.                                                                                                                           |
| S10 | **Functions with a mutable `search_path`** (9 of them). `prevent_role_update` is `SECURITY DEFINER` without one, which is the dangerous combination. `get_component_by_category` runs `format('… FROM %I', category_name)` on any table name the caller passes.                                                                                   | Advisor `function_search_path_mutable` ×9. `schema.sql:287-300`                                                                                                                         | `SET search_path = ''` (or `public, extensions`) on every function. Replace the dynamic-SQL function with a query on the `components` table (D3).                                                                      |
| S11 | `report_comments` INSERT is `WITH CHECK (true)` for anon, so anyone can post as any `user_id`. The table is unused and empty.                                                                                                                                                                                                                     | `schema.sql:1294`                                                                                                                                                                       | Drop the table (D8).                                                                                                                                                                                                   |

---

## 2. Correctness bugs caused by the database layer

| #   | Bug                                                                                                                                                                                                                                                                                                                                                                                                                                          | Evidence                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| B1  | **Realtime works in production but not locally.** Hosted has `reports` in the `supabase_realtime` publication. A `public`-only dump leaves that out, so the local stack built from `schemas/` never pushes report changes. **Fix, verified:** add `ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reports";` to `schema.sql`; declarative sync picks it up.                                                                  | `lib/supabase/report.ts:291`. `components/context/report-provider.tsx:98` |
| B2  | **Dashboard numbers stop counting at 1,000 rows.** Zone counts, category counts and repair-time-by-type download every row and count in JS. PostgREST returns at most `max_rows = 1000` (`supabase/config.toml:18`) and doesn't error. With 86 hosted reports it's invisible today.                                                                                                                                                          | `lib/dashboard/queries.ts:282, 318, 352`. `lib/supabase/report.ts:100`    |
| B3  | **"Last cleaned" is whichever row the API returned last**, not the latest. Rows are put into a Map in arbitrary order, with no `ORDER BY` and no `max()`.                                                                                                                                                                                                                                                                                    | `lib/dashboard/queries.ts:109-131`                                        |
| B4  | **Deleting a report fails if outlet or storm-drain maintenance points at it.** `inlets_`/`man_pipes_maintenance.addressed_report_id` are `ON DELETE SET NULL`; `outlets_`/`storm_drains_maintenance` have no rule. The same drift affects `profiles.id` → `auth.users` and `reports.user_id` → `auth.users`, both without `ON DELETE`, so **deleting a user account fails** once they have a profile.                                        | `schema.sql:1081-1162`                                                    |
| B5  | **Two competing links between maintenance and reports.** `maintenance.addressed_report_id` is set on 89 hosted rows but is never written by current code. `reports.resolved_by_maintenance_id` + `_type` is what the code writes, on 3 hosted rows, and it is a polymorphic pair with no foreign key. Nothing stops a dangling id.                                                                                                           | `lib/supabase/maintenance.ts:146-178`                                     |
| B6  | **Recording maintenance is two unrelated writes.** Insert the maintenance row, then update reports as the browser user. If the second fails, the record exists and the reports stay open.                                                                                                                                                                                                                                                    | `lib/supabase/maintenance.ts:158-179`                                     |
| B7  | **Staff count and team performance read `profiles` from the browser**, where RLS only returns the caller's own row. Separately, "team performance" attributes reports to the agency of the _person who filed them_, because nothing in the schema says which agency owns a report.                                                                                                                                                           | `lib/dashboard/queries.ts:188-191, 397-421`                               |
| B8  | **Vocabulary drift.** Code writes status `'in-progress'`, but the unused `report_status` enum has `pending, received, action_taken, resolved, rejected`. The UI also uses `'unresolved'` and a fallback `'Pending'`. `status`, `priority`, `category`, `role` and maintenance `status` are free text; hosted maintenance has `NULL` statuses. 4 enums (`asset_point_type`, `drainage_status`, `maintenance_type`, `report_status`) are dead. | `schema.sql:41-80`. `lib/supabase/report.ts:41,276`                       |
| B9  | **Copy-paste schema errors that the code works around:** `storm_drains_maintenance` names its component column `in_name`, and the code has to know this. `2YR` has no primary key, and its `Node_ID` is nullable. The partial index `idx_report_category … WHERE category = 'inlet'` can never match, because values are plural (`'inlets'`). `"Time of Max (hr:min)"` is stored as a bigint (e.g. `45`).                                    | `schema.sql:840, 457, 1029, 377`                                          |
| B10 | **Wrong comments.** `reports.zone` says "extracted from address", but the trigger uses coordinates. `extract_barangay_from_address` is unused, and it hard-codes 28 barangays (its comment says 29) that duplicate `barangay_boundaries`.                                                                                                                                                                                                    | `schema.sql:787-791, 86-135`. `lib/dashboard/queries.ts:277`              |

---

## 3. Design: what to consolidate

### D1. Four maintenance tables → one `maintenance` table

All 4 tables have the same columns except the name column (`in_name` / `out_name` / `in_name` / `name`). One table, keyed by component, removes:

- `MaintenanceTableName` and the "re-append after gen types" step;
- the runtime `idColumn`;
- `resolved_by_maintenance_type`;
- the 4-way `Promise.all` merges in `lib/dashboard/queries.ts`;
- 12 foreign keys, 8 policies and 4 × `recordXMaintenance` / `getXMaintenanceHistory` wrappers.

The component type comes from a join to `components`.

### D2. Eight flood tables → one `flood_results` table

`2YR` through `100YR` are identical. Each row also repeats its own table name in the `YR` column, as text (`'5YR'`) that the code types as a number. One table with `return_period smallint` and PK `(return_period, node_id)`:

- replaces `from(\`${YR}YR\`)` string-building (`lib/vulnerabilities/fetch-yr-table.ts:43`);
- removes 8 policies, 8 grants and 7 btree indexes that duplicate the primary key;
- lets you rename `"Hours Flooded"` / `"Maximum Rate (CMS)"` to snake_case, so nothing needs quoting.

### D3. Components: one lookup table, one nearest function

- **Two copies of the same asset data.** The map reads `public/drainage/*.geojson`. The database's `inlets`/`outlets`/`storm_drains`/`man_pipes` are only used for the nearest lookup and the category list.
- **The nearest lookup scans the whole table.** The 4 `get_closest_*` functions compute `ST_Centroid(geom)::geography` per row, so the GiST index on `geom` is never used. `EXPLAIN` shows `Seq Scan on storm_drains`. They are also `plpgsql VOLATILE` where `sql STABLE` would do.
- **`reports.component_id` has no foreign key**, although all hosted rows already match a real component.

Proposal:

- Add a `components (name text PK, type component_type, location geography(Point) + GiST index)` table.
- Keep the 4 hydraulic attribute tables, referencing `components(name)`.
- Replace the 4 functions with one `nearest_components(type, lat, lon, radius_m, limit)`.
- Point `reports.component_id` at `components(name)`.
- Generate the GeoJSON files from the database (or the reverse) with one script, so the two copies can't drift.

### D4. Put multi-step writes and aggregates in SQL

- **`record_maintenance(component, status, description, evidence_image)`**: a `SECURITY DEFINER` RPC. It checks the caller is staff, inserts the maintenance row and closes the matching reports in one transaction. It fixes B6 and S3 and lets you remove client UPDATE on `reports` entirely.
- **Dashboard RPCs and views:** `dashboard_overview()`, `report_counts_by_zone`, `report_counts_by_category`, `latest_report_per_component` (`DISTINCT ON`), `component_last_maintained` (`max(performed_at)`). They fix B2, B3 and B7.
  - Views use `security_invoker = true`.
  - Anything that must count other users' profiles is a `SECURITY DEFINER` function returning numbers, not rows.
- **Add `reports.resolved_at`**, set by the RPC. Every "repair time" metric then uses one definition instead of the three currently in `queries.ts`.

### D5. One authorization model

Today, `profiles.role` means nothing (all hosted rows are `user`) and `agency_id` is the real permission.

Pick one:

- `role` as `citizen | staff | admin`;
- `CHECK (role = 'citizen' OR agency_id IS NOT NULL)`;
- one `private.current_agency_id()` helper (`STABLE SECURITY DEFINER`, in a schema the API doesn't expose), used in every policy as `(select private.current_agency_id())`.

That wrapper also fixes the 3 `auth_rls_initplan` warnings.

### D6. Types and constraints come from the database

- Make `status`, `priority`, `category`, `role` and maintenance `status` Postgres enums, keeping today's spellings (`'in-progress'`, plural categories) to avoid churn. `gen types` then emits them as unions and `Constants`.
- Replace the hand-written row types with `Tables<'reports'>` plus one mapper, including the realtime payload cast at `report.ts:298`. The row types are:
  - `Report`, `ReportRow` and `ReportStatusUpdate` in `report.ts`;
  - `ReportRecord` and `MaintenanceRecord` in `dashboard/queries.ts`;
  - the `ReportRecord` in `download/route.ts`;
  - `StoredScenarioRow`.
- `reports.lat`/`long` are `double precision`, but three of those types declare them as strings and `parseFloat` them.

### D7. Geocoding belongs in the repo

- The `geocodeWorker` edge function and its `geocode_worker_lock` table are used in production, but the function's source isn't in this repo.
- The only thing stopping it from calling production during local development is a `disable trigger` line in `seed.sql`.

Fix:

- Add the function as `supabase/functions/geocodeWorker`.
- Have the trigger read its target from Vault. If no secret is set, it does nothing, so local development needs no special case.

### D8. Remove what is unused

- `report_comments`: no code, 0 hosted rows, with an open INSERT policy.
- `extract_barangay_from_address`.
- The 4 dead enums.
- `idx_report_category`.
- The 7 duplicate `*_yr_node_id` indexes.
- `maintenance.addressed_report_id`, once D1 is done and B5 is resolved in favour of `reports.resolved_by_maintenance_id` as a real FK.

### D9. Smaller hygiene items

- `barangay_boundaries`: population columns are `varchar(50)` and should be numeric; `created_at` is `timestamp` without a time zone.
- Primary-key name `"Report_pkey"`; the column is named `long`.
- `created_at` defaults mix `now()` and `CURRENT_TIMESTAMP`.
- `profiles.updated_at` is set by the client; a trigger should set it.
- Grants: every table is `GRANT ALL` to `anon`. Reference tables (components, flood results, barangays, agencies) should be SELECT-only.

---

## 4. Target schema sketch

This is illustrative, not final. It shows the shape the phases below build toward.

```sql
create type component_type     as enum ('inlets', 'outlets', 'storm_drains', 'man_pipes');
create type report_status      as enum ('pending', 'in-progress', 'resolved', 'rejected');
create type report_priority    as enum ('low', 'medium', 'high', 'critical');
create type maintenance_status as enum ('in-progress', 'resolved');
create type user_role          as enum ('citizen', 'staff', 'admin');

create table components (
  name     text primary key,                    -- 'I-0', 'O-0', 'ISD-1', 'C-0'
  type     component_type not null,
  location geography(Point, 4326) not null      -- centroid; pipes keep full geometry in man_pipes
);
create index on components using gist (location);

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  avatar_url text,
  role       user_role not null default 'citizen',
  agency_id  uuid references agencies,
  constraint staff_have_agency check (role = 'citizen' or agency_id is not null)
);

create table maintenance (
  id             uuid primary key default gen_random_uuid(),
  component_name text not null references components,
  agency_id      uuid not null references agencies,
  performed_by   uuid not null references profiles,
  performed_at   timestamptz not null default now(),   -- was last_cleaned_at
  status         maintenance_status not null,
  description    text,
  evidence_image text
);
create index on maintenance (component_name, performed_at desc);

-- reports: typed columns, real foreign keys, an indexed point
alter table reports
  alter column status   type report_status   using status::report_status,
  alter column priority type report_priority using priority::report_priority,
  alter column category type component_type  using category::component_type,
  add foreign key (component_id) references components,
  add column resolved_at timestamptz,
  add foreign key (resolved_by_maintenance_id) references maintenance on delete set null,
  drop column resolved_by_maintenance_type;

create table flood_results (
  return_period smallint not null check (return_period in (2, 5, 10, 15, 20, 25, 50, 100)),
  node_id       text not null,
  vulnerability_category text,
  vulnerability_rank     int,
  hours_flooded          double precision,
  -- ...remaining metrics in snake_case, units in the name
  primary key (return_period, node_id)
);
```

---

## 5. Plan, in order

Each phase leaves the app working. Every step follows the workflow in `CLAUDE.md`: edit `schemas/`, run declarative sync, `db reset`, regenerate types, then `type-check`.

**Phase 0 — close the holes (small, no model change)**

1. B1: add the realtime publication line.
2. S5: RLS on `barangay_boundaries`.
3. S1, S2: column grants on `profiles`; `handle_new_user` ignores `role`.
4. S3, S4, S11: replace the `USING (true)` / `WITH CHECK (true)` policies.
5. S10: `search_path` on all functions; `(select auth.uid())` in the profiles policies.
6. S6: UUID upload paths, no upsert, no public UPDATE on storage.
7. S8: auth and a user-scoped client in `/api/reports/download`.
8. B4: consistent `ON DELETE` rules.
9. S7: rotate the service-role key in the dashboard.

**Phase 1 — make the database own its vocabulary and numbers (medium)**

1. D6: enums or checks for the status, priority, category and role columns.
2. D6: swap hand-written row types for `Tables<>`.
3. D4: dashboard RPCs and views, and `latest_report_per_component`.
4. Fix N+1 queries:
   - one count query per map bubble (`app/(main)/map/page.tsx:703`);
   - fetch-all-then-filter in the maintenance tab (`components/control-panel/tabs/maintenance.tsx:113`).

**Phase 2 — consolidate (larger; do it while data is disposable)**

1. D1: `maintenance` table plus the `record_maintenance` RPC. Delete `MaintenanceTableName`.
2. D2: `flood_results`.
3. D3: `components`, `nearest_components`, and the FK from `reports`.
4. D8: drop unused objects.
5. Regenerate `seed/reference_data.sql` in the new shape.

**Phase 3 — keep it from regressing**

1. RLS tests with pgTAP in `supabase/tests/`, run by `npx supabase test db`. Examples:
   - anon cannot update a report;
   - a citizen cannot set `agency_id` or insert maintenance;
   - staff can.
2. CI checks:
   - `supabase db advisors --local --fail-on warn`;
   - `declarative sync --no-apply` reports no changes;
   - regenerated types match the committed file.
3. D7: geocode worker into the repo, secret in Vault.
4. Docs: replace `docs/api/SUPABASE.md` with a short pointer to `schemas/`. Delete the stray `Project Drain/supabase/` folder, left from the first `supabase link` run in the wrong directory.

**On migrating real data:** declarative sync writes DDL only. A consolidation such as D1 generates `DROP TABLE` for the old tables. If you ever apply it to a database whose data you keep, add the `INSERT … SELECT` copy step to that generated migration before the drops. This is the one case where editing a generated migration is right.

---

## 6. Every advisor finding, and where it's resolved

| Lint                                             | Level | Count | Resolved by                                                                                                                                                                                                               |
| ------------------------------------------------ | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rls_disabled_in_public` (`barangay_boundaries`) | ERROR | 1     | S5                                                                                                                                                                                                                        |
| `rls_policy_always_true`                         | WARN  | 8     | S3, S4, S11                                                                                                                                                                                                               |
| `function_search_path_mutable`                   | WARN  | 9     | S10; D3 removes 5 of the functions                                                                                                                                                                                        |
| `auth_rls_initplan` (profiles)                   | WARN  | 3     | D5 (`(select auth.uid())`)                                                                                                                                                                                                |
| `unindexed_foreign_keys`                         | INFO  | 16    | D1 cuts 12 to 3; index the remaining FKs                                                                                                                                                                                  |
| `no_primary_key` (`2YR`)                         | INFO  | 1     | D2                                                                                                                                                                                                                        |
| `unused_index`                                   | INFO  | 21    | Ignore for `reports`: the local database is idle, so every index reads as unused. Drop the 7 duplicate YR indexes and `idx_report_category` (D8). The 4 `geom` GiST indexes are unused _because of_ the seq-scan bug (D3) |
| `rls_enabled_no_policy` (`geocode_worker_lock`)  | INFO  | 1     | Correct as-is: only the service role should touch it. Add a comment saying so                                                                                                                                             |

## What's already right

- RLS is enabled on 21 of 22 tables.
- UUID primary keys on app tables.
- The PostGIS zone trigger.
- A typed client (`createClient<Database>`).
- A local, file-based workflow with a reproducible seed.
- Every hosted `reports.component_id` matches a real component, so adding the foreign key needs no cleanup.
