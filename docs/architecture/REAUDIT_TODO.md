# Re-audit to-do list (2026-09-29)

Phase 1 of `AUTONOMOUS_RUN_PLAN.md`. Every item below was checked against
the code (quoted line or a query) before it was written down. Anything already
fixed on `db-hardening` / `trust-and-ops`, or already planned in Phase 2 of the
run plan or in `drAIn-backend/docs/SCIENCE_ROADMAP.md`, is not repeated; where
an audit pass found one of those, it points at the Phase 2 item instead.

Format: `[area] [severity] [effort S/M/L] file:line — problem — fix`.
Ordered by value per effort within each band. Tick as items land.

## High

- [x] [frontend] [high] [S] app/(main)/map/page.tsx:307 — the effect that creates the Mapbox map has no cleanup; `map.remove()` is never called, so each visit to /map leaks a WebGL context and every listener — return `() => { map.remove(); mapRef.current = null }`. — done: Phase 3
- [x] [frontend] [high] [S] app/(main)/simulation/page.tsx:293 — same leak on the simulation page (the unmount cleanup only calls `disableRain`) — same fix. — done: 2.2 (3370ecc)
- [x] [frontend] [high] [S] app/(main)/map/page.tsx:683 — one `ReactDOM.createRoot` per report bubble, never unmounted; popups stay after unmount — keep roots in a ref, unmount and `popup.remove()` in the effect cleanup. — done: Phase 3
- [x] [frontend] [high] [S] next.config.ts:5-10 — `remotePatterns: [{ protocol: 'https', hostname: '**' }]` lets `/_next/image` fetch and resize images from any host — allow only the Supabase storage host(s) actually used. — done: Phase 4 (7e9d886)
- [x] [frontend] [high] [S] components/reports/report-history-list.tsx:358 — `priority={'low'}` hard-coded, so every report's image viewer says Low — pass `selectedReport.priority`. — done: 2.D2 (af5aef6)
- [x] [frontend] [high] [S] components/control-panel/components/top-bar.tsx:103 — "profile setup" progress is hard-coded (`// Example ... replace with actual data`), every user sees 2 of 4 done — derive from the profile or remove. — done: Phase 3
- [x] [frontend] [high] [S] components/dashboard/analytics/zone-map.tsx:51 — map init runs once on mount, but while `loading` the container isn't rendered, so on a cold load the map never draws — always render the container, overlay the skeleton. — done: Phase 3
- [x] [frontend] [high] [M] components/control-panel/tabs/maintenance.tsx:250 — recording maintenance reports errors into state that is only shown inside a view that was just closed; failures (and successes) are silent — use `toast.error` / `toast.success`. — done: Phase 3
- [x] [frontend] [high] [S] app/(main)/simulation/page.tsx:312 — the map click handler reads `isSimulationActive` from the first render (guarded re-init never re-registers) — read it through a latest-value ref. — done: 2.2 (3370ecc)
- [ ] [frontend] [high] [M] app/(main)/simulation/page.tsx:806 — `runSimulation` polls up to 30 min and can't be cancelled; after leaving the page it still sets state and paints the map — add an `AbortSignal` to `RunOptions`, abort on unmount.

## Medium

- [ ] [frontend] [med] [S] app/api/reports/download/route.ts:135-146 — CSV export doesn't neutralise leading `= + - @ \t \r` in user text (formula injection when staff open it in Excel) — prefix `'`.
- [ ] [frontend] [med] [S] app/api/reports/download/route.ts:39-47,94,105 — `month`/`year` unvalidated (Invalid Date → 500, month 13 rolls over; raw `year` goes into the `Content-Disposition` filename) — validate `^\d{4}$` and 1–12, return 400; build filename from the parsed numbers.
- [ ] [frontend] [med] [S] next.config.ts:3 — no security headers at all — add `headers()` with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microphone off, geolocation self). CSP left as a follow-up (Mapbox needs care).
- [ ] [frontend] [med] [S] lib/dashboard/queries.ts:98,119,141,159,179,207,258 — dashboard readers log and `return []` / zeros on error; TanStack caches that as success and shows "no data" instead of an error — throw.
- [ ] [frontend] [med] [S] lib/supabase/report.ts:200,371 — `fetchMyResolutionVerdicts` and `fetchReportCountsByComponent` return empty maps on error (users re-asked for verdicts; every pin shows 0) — throw.
- [x] [frontend] [med] [S] lib/query/hooks/use-report-queries.ts:32-34 — latest-per-component query key omits the data its `queryFn` uses, and `enabled` requires `length > 0` (pending forever with zero reports) — superseded by 2.D2, which reads the database view instead. — done: 2.D2 (af5aef6)
- [ ] [frontend] [med] [S] components/reports/submit-tab.tsx:90 — `clearInputs` sets `categoryIndex` to 0 after the reset to -1, so the next report has a component pre-selected that the user never chose — set -1.
- [ ] [frontend] [med] [S] components/reports/submit-tab.tsx:270 — cancelling the spinner doesn't stop `handlePreSubmit`, the confirm dialog pops up afterwards — track cancellation with a ref.
- [x] [frontend] [med] [S] components/control-panel/tabs/maintenance.tsx:396 — "Refresh reports" button has no `onClick` — call `handleViewHistory(...)`. — done: Phase 3
- [x] [frontend] [med] [S] components/control-panel/components/top-bar.tsx:143 — notification toggle only flips local state and says "Notifications turned on" — remove it (nothing to connect it to). — done: Phase 3
- [ ] [frontend] [med] [S] components/dashboard/reports/report-card.tsx:114 — badge wrappers stop clicks but not keys; Enter on a badge filters and also navigates the card — also stop `onKeyDown`.
- [ ] [frontend] [med] [S] components/reports/report-history-list.tsx:146 — sorts the `reports` prop in place — copy first.
- [ ] [frontend] [med] [S] components/reports/report-history-list.tsx:200 — typo `boverflow-y-auto`, the list never scrolls — fix class.
- [ ] [frontend] [med] [S] components/reports/report-history-list.tsx:245,254 — clickable `div`s with no role/tabIndex/keys — use buttons.
- [ ] [frontend] [med] [S] components/dashboard/reports/download-reports-modal.tsx:111 — download errors only go to the console — `toast.error`.
- [x] [frontend] [med] [S] components/dashboard/analytics/zone-map.tsx:369 — click handlers keep the first `data` — read through a ref. — done: Phase 3
- [x] [frontend] [med] [S] app/(main)/map/page.tsx:660 — `const { data: inlets = [] }` defaults create new arrays every render, so the report-bubble effect tears down and refetches counts on every render while loading — module-level `EMPTY` constant. — done: Phase 3
- [x] [frontend] [med] [S] app/(main)/map/page.tsx:665 — report bubbles: old popups not removed when the list empties; no re-run once the map becomes ready — remove first, add `mapReady` state. — done: Phase 3
- [x] [frontend] [med] [S] app/(main)/map/page.tsx:693 — bubbles re-added while the reports layer is hidden — respect `overlayVisibilityRef`. — done: Phase 3
- [ ] [frontend] [med] [S] app/(main)/map/page.tsx:321 — `style.load` handler rebuilds layers with the first render's flood scenario — latest-value ref.
- [ ] [frontend] [med] [S] app/(main)/map/page.tsx:365 — click handler calls the first render's `handleTabChange` (stale `searchParams`) — build params from `window.location.search`.
- [ ] [frontend] [med] [S] app/(main)/simulation/page.tsx:1044,698 — flood-propagation animation can start a second RAF loop; the guard reads stale state — cancel before start, guard on the frame ref.
- [ ] [frontend] [med] [S] app/(main)/map/page.tsx:518-521 — population popup built with `innerHTML` from GeoJSON properties (first-party file today) — use `textContent`.
- [ ] [backend] [med] [S] drain/flooding.py:156-157 — every node is sent twice (`nodes_dict` and `nodes_list`), `app/runs.py:96` rebuilds the dict on read-back — check the frontend's use, drop one. Pairs with 2.15 (gzip).
- [x] [backend] [med] [S] drain/flooding.py:120 — barangay matching of ~1,400 nodes recomputed per request against static data — cache node→exposure once. (Overlaps 2.12, do together.) — done: 2.12 (backend 8ba5d1a)
- [ ] [backend] [med] [S] drain/vulnerability.py:323 — `pickle.load` of the legacy k-means model on every startup (runs any code in the file) — export to JSON/npz or drop the legacy fields. Needs user if dropping `Legacy_Cluster_*`.
- [x] [docs] [med] [M] docs/README.md:3, docs/architecture/SYSTEM*ARCHITECTURE.md:5,157, docs/architecture/TECH_STACK.md:219-235, docs/features/POSTGIS*\*.md — "AI/ML-powered", "flood prediction", "99%/100% accurate" with nothing behind them — same wording as 2.9. — done: 2.9 (2b6a0ee)
- [ ] [tooling] [med] [S] frontend `.gitignore:50` — `playwright.config.ts` is ignored, which is why `e2e/` has specs and no config — un-ignore and commit a minimal config (Phase 4 needs it anyway).
- [x] [tooling] [med] [S] frontend `BACKEND-DrAin` — a git submodule (`.gitmodules` → github.com/4Chronosx/drAIn) with an empty checkout; nothing references it — remove with 2.8. — done: 2.8 (5344cb8)

## Low

- [ ] [frontend] [low] [S] app/api/closest-pipe/route.ts:27-49 — `category` not type-checked (non-string → 500), lat/lon not range-checked — validate, 400.
- [ ] [frontend] [low] [S] components/control-panel/index.tsx:229, components/shell/nav-user.tsx:122 — `window.open(url, '_blank')` without `noopener,noreferrer`.
- [ ] [frontend] [low] [S] app/(main)/map/page.tsx:150-153 — duplicate of the `activetab` sync effect at 1041 — delete one.
- [ ] [frontend] [low] [S] app/(main)/map/page.tsx:830,848; simulation/page.tsx:416,665 — timeouts never cleared on unmount — refs + one cleanup.
- [ ] [frontend] [low] [S] app/(main)/simulation/page.tsx:488,506 — `componentParams` updated from closure value; two quick edits lose one — functional `setState`.
- [ ] [frontend] [low] [S] app/(main)/simulation/page.tsx:1155 — node slideshow chains `setTimeout`s with no cancellation — request counter.
- [ ] [frontend] [low] [S] components/control-panel/tabs/tables-content/{drain,inlet,outlet,pipe}-table.tsx — clickable rows without keyboard access — `tabIndex`, Enter/Space.
- [ ] [frontend] [low] [S] components/dashboard/reports/report-card.tsx:171, image-gallery.tsx:64 — clickable divs — buttons.
- [ ] [frontend] [low] [S] components/reports/submit-tab.tsx:78 — label typo "Manduae Pipe".
- [ ] [frontend] [low] [S] components/dashboard/reports/report-card.tsx:55 — missing category shown as "Inlets" — show "Unknown".
- [ ] [frontend] [low] [S] components/control-panel/components/link-bar.tsx:22 — favourite star is local-only; popover always says "Jupyter Notebook" — remove star, fix text.
- [x] [frontend] [low] [S] components/control-panel/tabs/maintenance.tsx:765 — says photos "must" have GPS and be under 12 h old, but unverifiable photos are accepted and marked — reword. — done: Phase 3
- [ ] [frontend] [low] [S] components/dashboard/analytics/component-type-chart.tsx:145,166 — "NaN%" when all counts are 0 — guard.
- [ ] [frontend] [low] [S] lib/supabase/report.ts:136,215 — `fetchMyReports`, `fetchReportsForComponent` unpaged (filtered, so only an edge case) — `fetchAllRows`.
- [ ] [backend] [low] [S] app/jobs.py:282 — raw exception text returned to the client and stored (may contain server paths) — generic message; details stay in the log.
- [ ] [backend] [low] [S] app/config.py:91 — preview-origin regex accepts anyone's `drain-*.vercel.app`, with `allow_credentials=True` though auth is a Bearer header — drop `allow_credentials`; tie the regex to the team slug (needs user: slug).
- [x] [backend] [low] [S] app/runs.py:207 — recorder queue unbounded — `maxsize`, log drops. (With 2.17.) — done: 2.17 (backend d8e3b75)
- [ ] [backend] [low] [S] drain/swmm_runner.py:168 — suffix matching with `endswith` (0 wrong matches today, verified over all 1,570 keys) — match exactly.
- [ ] [backend] [low] [S] drain/swmm_runner.py:244 — the no-override baseline summary is rebuilt per request — cache per `event_hours`.
- [ ] [tooling] [low] [S] drAIn-backend/logo.png — 5 MB PNG used only by the README — resize to ~100 KB.

## Large refactors (Phase 3 only if time remains; not started blind)

- [ ] [frontend] [med] [L] app/(main)/map/page.tsx:78-1105 — `MapPageContent` ~1,030 lines — split into `useMapInstance`, `useReportBubbles`, `useOverlayVisibility`, `useComponentSelection` (line ranges in the audit notes below).
- [ ] [frontend] [med] [L] app/(main)/simulation/page.tsx:113-1430 — `SimulationPage` ~1,320 lines, 35+ `useState` — split into `useFloodPropagationAnimation`, `useVulnerabilityTables`, `useSimulationMap`, `useNodeSlideshow`, `<FloatingTable>`.

## 1a. The 19 lint warnings

| Where                                                                                                                                                 | Rule                                                       | Verdict                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| map/page.tsx:973,989,1005,1023                                                                                                                        | exhaustive-deps (`clearSelections`)                        | Real but harmless today (`clearSelections` is stable only by accident). Fix: `useCallback` it and add it.                                                             |
| simulation/page.tsx:268,277,286                                                                                                                       | exhaustive-deps                                            | Real, see the Low item for 488/506 and the stale `activePanel`; use functional updates.                                                                               |
| simulation/page.tsx:375                                                                                                                               | exhaustive-deps (map init)                                 | Intentional one-time init; the handlers read refs. Justify with a disable comment after the stale-closure fix.                                                        |
| docs/page.tsx:41,57; image-uploader.tsx:31; repair-time-cards.tsx:126; app-sidebar.tsx:74; link-parameters-panel.tsx:53; node-parameters-panel.tsx:62 | set-state-in-effect                                        | Syncing props into state. Mostly derivable during render or with a `key`; fix where trivial.                                                                          |
| report-notif.tsx:67; ui/sidebar.tsx:611                                                                                                               | impure function in render (`Date.now()` / `Math.random()`) | sidebar is shadcn's skeleton width (`useMemo` random) — harmless, disable with reason; report-notif computes "x ago" during render — acceptable, disable with reason. |
| model-viewer.tsx:470 (×2)                                                                                                                             | refs during render                                         | Reads `sceneRef.current` while rendering — real; move into an effect or state.                                                                                        |

## 1f. Database

All four checks map onto Phase 2 items already: `reports.user_id` / photo GPS
/ reviewer readable by anon → 2.3; trigger functions executable by anon
(`handle_new_user`, `set_reporter_name`, `sync_reporter_name`,
`protect_profile_privileges`, `set_updated_at`, `update_report_zone`) and
INSERT/UPDATE/DELETE/TRUNCATE on 8 tables → 2.D1; anon uploads → 2.5;
text population → 2.4. Verified with `information_schema.role_table_grants`
and `has_function_privilege` on 2026-09-29.

## 1i. Hygiene

- `control-panel-portable/` (740 KB) and `components/_unused/` — 2.8.
- `BACKEND-DrAin` — submodule, see Medium.
- CI (`.github/workflows/deploy.yml`) already runs format check, lint,
  type-check and unit tests; it lacks only pgTAP — 2.1 shrinks to that.
- `.gitignore` otherwise fine (env files, tsbuildinfo, graphify-out ignored).
