# Supabase: where things are

The database is defined in code. This page is a map; the files it points at
are the source of truth, and they change more often than this page.

| What                                       | Where                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Tables, views, functions, policies, grants | `supabase/schemas/*.sql` (edit these, then follow "Database workflow" in `CLAUDE.md`) |
| TypeScript types for all of it             | `types/database.types.ts` (generated; never edit by hand)                             |
| Enum types for app code                    | `lib/supabase/enums.ts`                                                               |
| Tests of permissions and numbers           | `supabase/tests/database/*.test.sql` (pgTAP; `npx supabase test db`)                  |
| Local seed data (made up)                  | `supabase/seed.sql`, `supabase/seed/reference_data.sql`                               |
| Bucket settings                            | `supabase/config.toml` (`[storage.buckets.*]`)                                        |
| How a report moves through its states      | `docs/architecture/REPORT_LIFECYCLE.md`                                               |

The schema files, in load order:

| File                      | Holds                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `schema.sql`              | Types, people and agencies, reference data (drainage components, flood results, barangays), reports, maintenance, grants |
| `schema_auth_storage.sql` | The sign-up trigger on `auth.users`, storage policies                                                                    |
| `schema_dashboard.sql`    | Read models: the views and functions the dashboard and map read                                                          |
| `schema_ops.sql`          | The chatbot rate limiter and `simulation_runs`                                                                           |
| `schema_trust.sql`        | Checks on citizen reports and on finished maintenance                                                                    |

## Who can do what

Clients never write tables directly except in two places: filing a report
(`reports` INSERT) and editing one's own profile. Everything else goes
through a function that checks the caller. No client reads who filed a
report, where the reporter stood, when the photo was taken and how far away,
or which staff member reviewed it; a reporter gets those for their own
reports from `my_reports`, staff from `report_private_details` (which never
says who filed a report). Rejected reports are readable only by staff and by
the person who filed them. No client reads which staff member did a piece of
maintenance; staff get the name from `maintenance_history`.

| Table                                                                                                              | Signed out             | Signed in               | Written by                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `reports`                                                                                                          | public columns         | public columns; insert  | the app (insert); `record_maintenance`, `review_report`, `respond_to_resolution` |
| `profiles`                                                                                                         | nothing (RLS)          | own row; update own row | sign-up trigger; `join_agency`, `leave_agency`, `set_member_agency`              |
| `maintenance`                                                                                                      | all but `performed_by` | all but `performed_by`  | `record_maintenance`                                                             |
| `maintenance_reviews`                                                                                              | nothing                | own; staff: staff rows  | `review_maintenance`, `respond_to_resolution`                                    |
| `simulation_runs`                                                                                                  | nothing                | own runs                | the simulation server (service role)                                             |
| `agencies`, `components`, `flood_results`, `barangay_boundaries`, `inlets`, `outlets`, `man_pipes`, `storm_drains` | read                   | read                    | migrations and seed only                                                         |

## Functions the app calls

| Function                                       | Who                  | Does                                                                        |
| ---------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `record_maintenance`                           | staff                | Records work on a component and moves its reports along, in one transaction |
| `review_report`                                | staff                | Confirms or rejects a report, optionally re-prioritises it                  |
| `review_maintenance`                           | staff (not the crew) | Confirms or disputes finished work; a dispute reopens the reports           |
| `respond_to_resolution`                        | the reporter         | "Is it fixed?" for their own report                                         |
| `join_agency` / `leave_agency`                 | signed in            | Join with the agency's code / leave                                         |
| `rotate_agency_join_code`, `set_member_agency` | that agency's admin  | Manage an agency's code and members                                         |
| `agency_members`                               | that agency's admin  | The admin screen's member list, with sign-in emails                         |
| `my_reports`                                   | signed in            | The caller's own reports, every column                                      |
| `report_private_details`                       | reporter or staff    | Up to 100 reports' photo position, age, distance and reviewer               |
| `maintenance_history`                          | staff                | A component's maintenance, with who did it and its checks                   |
| `dashboard_overview`, `repair_trend`           | anyone               | Dashboard numbers                                                           |
| `nearest_components`                           | anyone               | Components near a point (report form)                                       |
| `consume_rate_limit`                           | signed in            | Per-user allowances: the chatbot route, and `join_agency` tries             |

Read models (views, readable by anyone): `latest_report_per_component`,
`report_counts_by_component`, `report_counts_by_day`,
`report_counts_by_zone`, `report_counts_by_category`, `report_repair_days`,
`repair_time_by_component`, `team_performance`, `component_locations`.
Rejected reports are left out of all of them.

## In the app

Use the wrappers in `lib/supabase/` rather than calling the client from
components:

- `report.ts`: `uploadReport`, `fetchReportList`,
  `fetchLatestReportsPerComponent`, `fetchReportCountsByComponent`,
  `fetchReportCountsByDay`, `fetchMyReports`,
  `reviewReport`, `respondToResolution`, `subscribeToReportChanges`.
- `maintenance.ts`: `recordMaintenance`, `getMaintenanceHistory`,
  `reviewMaintenance`.
- `profile.ts`: `getProfile`, `updateUserProfile`, `joinAgency`,
  `leaveAgency`, `isAgencyStaff` (display only; the database decides).
- `fetch-all.ts`: `fetchAllRows`, for any list that can pass the API's
  1,000-row limit.

Two things to know:

- A plain `select` returns at most 1,000 rows and doesn't say it stopped.
  Page with `fetchAllRows`, or count in SQL.
- Requests that name a private report column (`user_id`, `photo_lat`,
  `photo_lon`, `photo_taken_at`, `photo_distance_m`, `reviewed_by`) or use
  `select('*')` on `reports` fail, signed in or not; so do requests for
  `maintenance.performed_by`. Report lists select `PUBLIC_REPORT_COLUMNS`.

## Realtime and storage

- Realtime publishes `reports`. Each subscriber gets only the columns their
  role can read, so no client receives the private ones.
- Buckets: `ReportImage` (public, JPEG/PNG/WebP/HEIC, 10 MiB; uploads
  must be named `public/<uuid>.<ext>`, nobody overwrites; 10 uploads a day
  per citizen, 100 per staff member) and `Avatars` (public, same types,
  5 MiB; each user writes only under `<their id>/`).
