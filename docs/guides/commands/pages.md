---
description: List every page of the drAIn web app by group, with its URL, file, who can see what, and the states worth a screenshot
---

List every page of the app in `drAIn-frontend/`, grouped by area. This command
is read-only: read and search files, change nothing, start nothing.

Build the list from the source every time. Do not reuse a list from memory, an
earlier run or this file: the examples below show the shape of the answer, not
its contents.

## 1. Find the routes

The app is a Next.js App Router project; routes are files under
`drAIn-frontend/app/`.

- Glob `drAIn-frontend/app/**/page.tsx`. Each is a page. Its URL is its folder
  path with route groups (`(auth)`, `(main)`) removed. A `[param]` folder is a
  route param.
- `drAIn-frontend/app/not-found.tsx` is a page too: it shows for any unknown
  path.
- `app/api/**/route.ts` are endpoints, not pages. Name them in one line at the
  end as "not pages".

## 2. Find the URLs within a page

Most of this app's screens are one route plus a query string, so a route alone
undercounts. For each page, find the query parameters it reads and every value
they take:

- Grep `useSearchParams` in `drAIn-frontend/app`, `components` and `lib`,
  then `.get(` in those files and in the helpers they pass the parameters
  to. Searching for `searchParams.get(` alone misses parameters read through
  a helper or under another variable name.
- For each parameter, find where its values are defined and list one URL per
  value (for example the control panel's tab ids, the docs page's section ids,
  the simulation page's switch and model ids). Read the definition; do not
  assume the values.
- A parameter whose value is a record's id or other data (a component id, an
  event) is a **route param**: list it once, name the param, and say where a
  real value comes from (a file under `public/`, a table, a link the app
  builds). Never write an example id.

The URL of a page's default value and the bare route are the same screen: list
the bare route and note which value it equals.

## 3. Find who can see what

Read the guards, do not guess from names:

- `drAIn-frontend/proxy.ts` if it exists, and any `redirect(` or `router.replace(`/`push(`
  that depends on the user, for pages that send a visitor elsewhere.
- Inside each page and the panels it renders: grep `useAuth`, `session`,
  `isAgencyStaff`, `agency_id`, `role`. Record, per URL, whether it opens
  signed out and what changes with the user: guest, citizen, agency staff,
  admin.

Write it as "opens for: everyone" plus "differs for: ..." when a page opens
for all but shows different content by role. Write "needs: staff" only when
the page or tab is of no use without that role.

## 4. Find the states

States are screens with no URL of their own. For each page, list the ones
worth a capture, each with the tap or condition that shows it:

- Dialogs, sheets, popovers and menus: grep `<Dialog`, `<AlertDialog`,
  `<Sheet`, `<Popover`, `<DropdownMenu` outside `components/ui/`, and find
  where each is opened.
- Tabs and views held in component state rather than the URL.
- Empty, loading and error states: `loading.tsx`, `error.tsx`,
  `global-error.tsx`, `Empty`/`SpinnerEmpty`, failed-load messages,
  `toast.error`.
- Layouts that change shape by width (a bottom sheet on phones, a drawer for
  the navigation): grep `useIsMobile`/`isMobile` and `md:hidden`.

## 5. Group

Use these groups, by the top-level route:

| Group        | Holds                                     |
| ------------ | ----------------------------------------- |
| `auth`       | Sign-in and sign-up                       |
| `home`       | The landing page                          |
| `map`        | The map and its control-panel tabs        |
| `simulation` | Simulation mode                           |
| `dashboard`  | The public dashboard                      |
| `docs`       | The in-app documentation and its sections |
| `system`     | Not-found and error pages                 |

Every page and URL goes in exactly one group. If a route fits none, add a
group named after its top-level folder, say that you added it, and suggest
adding it to this table and to `.claude/commands/shots.md`.

## 6. Reconcile with the manifest

`drAIn-frontend/scripts/shots.manifest.json` holds the name of every page and
scripted state, so a page keeps its name, and its baseline image, from run to
run. Read it after building the list from source, never instead.

- A URL found in the source that is in the manifest: use the manifest's name.
- A URL found in the source that is not in the manifest: propose a name, and
  list it under "missing from the manifest".
- A manifest entry whose route or query value is no longer in the source: list
  it under "in the manifest, not in the source".
- A state found in step 4 with no manifest entry: mark it "not scripted".

Do not edit the manifest here; this command is read-only. `/shots` adds
entries.

## 7. Print

Per group, a table with one row per URL:

| Name | URL | File | Opens for / differs for | Route param |
| ---- | --- | ---- | ----------------------- | ----------- |

- **Name**: short, file-safe, unique, prefixed with the group
  (`map-report`, `docs-users`). `/shots` uses it as the image name.
- **URL**: the path and query, as `pnpm shots` takes it.
- **File**: the `page.tsx`, plus the file that defines the query value when
  there is one.

Under each table, that group's states as a list: `state: how to show it
(roles it differs for)`.

End with:

1. A count per group: pages (URLs) and states, and the totals.
2. A check line: the number of `page.tsx` files found, plus not-found, against
   the number of distinct routes in the tables. They must match; if not, say
   which file is missing a row.
3. The manifest differences from step 6, or "the manifest matches the source".
4. The group names `/shots` accepts, plus `all`.
5. The API routes, as "not pages".
