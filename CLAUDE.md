## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Database workflow (schema-first, local)

The hosted Supabase project may shut down at any time; the app is not in production. Develop against a local Supabase built from files in this repo. Pushing to the hosted project is not a goal.

**Source of truth: `supabase/schemas/`.** Every database change (table, column, policy, function, trigger) is made there first. Never change the hosted project from its dashboard, and never hand-edit files in `supabase/migrations/`.

| File                                       | Role                                                                                                                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/schemas/schema.sql`              | `public` schema, dumped from the hosted project 2026-09-26, then edited here. Grouped by area (types; people and agencies; reference data; maintenance; reports; grants; default privileges)        |
| `supabase/schemas/schema_auth_storage.sql` | Sign-up trigger on `auth.users` and storage policies. Sorts after `schema.sql` on purpose                                                                                                           |
| `supabase/schemas/schema_dashboard.sql`    | Read models: the dashboard's counts and averages, map pin counts, staff-only maintenance history. The app reads these instead of counting rows itself. Rejected reports are left out of all of them |
| `supabase/schemas/schema_ops.sql`          | The per-user rate limiter (`consume_rate_limit`, used by the chatbot route) and `simulation_runs`, which the simulation server (drAIn-backend) writes with the service role                         |
| `supabase/schemas/schema_trust.sql`        | Checks on citizen reports (duplicate and rate limits, photo-location check, staff review) and on finished work (`maintenance_reviews`: someone other than the crew confirms or disputes a fix)      |
| `supabase/migrations/`                     | Generated from `schemas/` by `declarative sync`. Never edit by hand                                                                                                                                 |
| `supabase/seed/reference_data.sql`         | Real reference data: `flood_results`, barangays, the one agency, and the drainage network as `components` rows (location, pipe line, GIS attributes)                                                |
| `supabase/seed.sql`                        | Made-up users, reports and maintenance. All sign in with `password123`: `admin@` (admin), `staff@` (staff), `citizen@`, `citizen2@drain.local`. City Engineer Office join code: `DRAIN-LOCAL-01`    |
| `supabase/tests/database/`                 | pgTAP tests of who can do what. `npx supabase test db`. Add a test with every policy or permission change                                                                                           |
| `types/database.types.ts`                  | Generated from the local database. Never edit by hand; derive app types from `Tables<>` and `Enums`                                                                                                 |
| `supabase/config.toml`                     | Points at `schemas/`, both seed files and the `ReportImage`/`Avatars` buckets                                                                                                                       |

**Change the schema:**

1. Edit `supabase/schemas/*.sql`. Put a short comment on anything non-obvious; comments are the documentation.
2. `npx supabase db schema declarative sync --name <change> --no-apply` writes a migration.
3. `npx supabase db reset` rebuilds the local database from migrations and both seeds.
4. `npx supabase gen types typescript --local > types/database.types.ts`, then `npx prettier --write types/database.types.ts`.
5. `pnpm type-check`. Errors here are the code drifting from the schema: fix the code, don't loosen the types.
6. `npx supabase test db`.

**The one exception to "never hand-edit migrations":** if `db reset` fails on a freshly generated migration, the diff tool may have ordered statements wrongly (it once emitted `SET DEFAULT 'x'::new_type` before `CREATE TYPE new_type`). Fix the order in that file, mark the edit with a `-- Hand-edited:` comment, and confirm `declarative sync --no-apply` then reports "No schema changes found". Data conversions for existing rows (e.g. mapping an old value into a new enum) go in the same way.

**Scripts** (local stack only; they refuse any other URL):

- `node scripts/check-write-paths.mjs`: every write the app makes through the API, as the seeded users. Run after changing grants or policies, on a fresh `db reset`.
- `node scripts/export-network-geojson.mjs [--check]`: writes `public/drainage/*.geojson` (what the map loads) from `components`, or checks the files still match it.
- `node scripts/scrub-storage-photos.mjs [--write]`: re-encodes every photo in both buckets without metadata, in place (dry run without `--write`). Photos uploaded before 2026-09-30 still carry GPS positions. This one can also target the hosted project: `--hosted` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.
- `pnpm test:e2e`: the Playwright specs in `e2e/` against `pnpm dev --port 3055`.

**Run locally:** start Docker Desktop, then `npx supabase start`. Studio: http://127.0.0.1:54323. `.env.local` points at the local stack; the hosted values are in `.env.hosted.local` (copy it over `.env.local` to switch back).

**Gotchas:**

- Run Supabase commands from `drAIn-frontend/`; the CLI's link and config live in this folder.
- In Windows PowerShell 5.1, `>` writes UTF-16 and breaks the build. Run the gen-types command from Git Bash, or use `| Out-File -Encoding utf8`.
- A plain `select` returns at most 1,000 rows (`max_rows`) without saying it stopped. For any list that can grow, page with `fetchAllRows` (`lib/supabase/fetch-all.ts`) or count in SQL.
- Report inserts through the API are limited per reporter (`check_report_submission`): one open report per component, 5/hour and 10/day signed in, matching the 10 report photos a day a citizen may upload (100 for staff). Descriptions are capped at 1,000 characters. Signed-out users can't file reports or upload report photos (since 2026-09-29); the per-IP branch (3/10) is kept but unreached. Seeds (run as postgres) aren't limited. A pgTAP test that files several reports as one user must use different components.
- Staff-only features check the role in the database; `isAgencyStaff` (`lib/supabase/profile.ts`) only decides what to show.
- Enum types and guards (`ComponentType`, `ReportStatus`, `isComponentType`, ...) live in `lib/supabase/enums.ts`, built from the generated `Constants`. Don't hand-write these unions.
- API routes use `createRequestClient` from `lib/supabase/server.ts`, which acts as the caller (the browser sends its access token as a Bearer header). The app has no service-role client; keep it that way.
- `seed.sql` disables `trigger-geocode-on-insert`. The trigger (`private.request_geocode`) reads the worker URL and shared secret from Vault (`geocode_worker_url`, `geocode_worker_secret`) and does nothing without them; the edge function refuses any call without a matching `x-geocode-secret` header.
- Local RLS matches production. For example, a user can read only their own `profiles` row, so dashboard queries that read all profiles through the browser client return one row.
- No secret lives in the schema: keep it that way (use Vault). Never copy `profiles`, `reports` or `maintenance` rows into seeds; they hold real people's data.
- `docs/api/SUPABASE.md` is a short map of the schema files and wrappers; `docs/architecture/REPORT_LIFECYCLE.md` has the report state diagrams.
- **Grants are explicit.** Default privileges give `anon` and `authenticated` nothing on new tables, views, sequences or functions (and `PUBLIC` no `EXECUTE`). Grant each new object where it is defined, or the app gets "permission denied". Declarative sync diffs default privileges itself.
- **Column grants on `reports` and `maintenance`.** Neither signed-out nor signed-in users can read `reports.user_id`, `photo_lat`, `photo_lon`, `photo_taken_at`, `photo_distance_m` or `reviewed_by` from the table, nor `maintenance.performed_by`, `description` or `evidence_image` (staff get those through `maintenance_history`), so `select('*')` on either table fails for everyone. Reporters get their own rows through `my_reports()`; staff get up to 100 reports' private columns through `report_private_details(uuid[])`, which says whether a report is the caller's (`is_mine`) but never whose it is. Rejected reports are hidden from everyone but staff and their reporter by the SELECT policy. A new public column must be added to the anon and authenticated column grants in `schema.sql` and to `PUBLIC_REPORT_COLUMNS` (`lib/supabase/report.ts`). Revoking a table privilege also revokes its column grants: if a generated migration revokes the table after granting columns, move the revoke up (hand-edit).
- **Same-file order matters.** The loader retries across files but not within one: in `schema.sql`, a trigger must come after its function and a foreign key after the table it points at.
- Report photos must be uploaded as `public/<uuid>.jpg` and avatars as `<user id>/avatar.jpg` (storage policies; both buckets take JPEG only, which is what `sanitizeImage` produces). A report or maintenance record may only point at a photo its author uploaded (`private.owns_report_photo`), and a report takes its category and map position from its component. Nobody can list a bucket: files are read by public URL. Policies on `storage.objects` can't be renamed by `postgres`; give a changed policy a new name so it is dropped and created.
- The four GIS tables (`inlets`, `outlets`, `man_pipes`, `storm_drains`) are gone; `components.attributes` holds their GeoJSON properties and `components.path` the pipes' lines.
- The hosted `geocodeWorker` edge function is in `supabase/functions/geocodeWorker` (as deployed; kept out of tsc, ESLint and Prettier). The seed keeps its trigger off locally, so local reports stay "pending" with no address.

**Known open issues:** `docs/architecture/DATABASE_AUDIT.md` (2026-09-26) lists every finding with evidence and a phased fix plan. Read it before changing the schema; tick items off there as they land. Still open: rotate the service-role key that the old hosted geocode trigger embedded (removed by `20260930120000_security_hardening.sql`). Run `npx supabase db advisors --local` to see the current lint state.

**Hardening done (branch `db-hardening`, merged; on `main` since the audit fixes, #240, 2026-10-07):** `docs/architecture/DB_HARDENING_CHECKLIST.md` records every step and ends with the follow-ups still open. Kept as history.

**Autonomous run, 2026-09-29 (branch `reaudit`, merged as #236; on `main` since #240, 2026-10-07; matching branch in drAIn-backend, also merged):** `docs/architecture/AUTONOMOUS_RUN_PLAN.md` has the run log, the questions that need you, and the deploy order; `docs/architecture/REAUDIT_TODO.md` the audit findings and what became of each.

**Trust and operations (branch `trust-and-ops`, merged; on `main` since #240, 2026-10-07; matching branch in drAIn-backend, also merged):** `docs/architecture/TRUST_OPS_CHECKLIST.md` records the steps, the checks run and the deploy order. The simulation server now needs the user's access token; see drAIn-backend's README. The plan for the model's science is `drAIn-backend/docs/SCIENCE_ROADMAP.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
