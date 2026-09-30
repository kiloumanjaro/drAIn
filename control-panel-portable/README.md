# Control Panel — portable bundle

A self-contained, **look-only** copy of the drAIn map control panel, extracted so
it can be dropped into another **Next.js (App Router) + React 19 + Tailwind v4**
project. All backend coupling (Supabase, auth, live drainage data, EXIF, the
closest-pipe API) has been replaced with **mock modules that return static demo
data**, so the panel renders exactly as it looks — without any backend.

> Tamagui is irrelevant here: the panel is styled with Tailwind utilities and
> works alongside Tamagui in the same project. Nothing needs converting.

---

## What's in the box

```
control-panel-portable/
├── components/          → mirrors @/components  (the panel + its UI primitives + siblings)
│   ├── control-panel/   → the panel itself
│   ├── ui/              → shadcn/ui primitives it uses
│   ├── context/AuthProvider.tsx   → MOCK (demo session)
│   ├── model-viewer.tsx           → MOCK (3D preview placeholder, no three.js)
│   └── …                → sibling components (toggles, lists, badges, …)
├── lib/                 → mirrors @/lib
│   ├── supabase/*       → MOCK data layer (client, report, profile, maintenance, types)
│   ├── query/hooks/useDrainageData.ts → MOCK (static inlets/outlets/pipes/drains)
│   ├── reports/*        → MOCK (extract-exif, get-closest-pipe)
│   └── utils.ts         → the `cn()` helper
├── hooks/use-mobile.ts
├── public/icons/*.svg   → mirrors /public/icons  (placeholder images)
├── demo/page.tsx        → example usage (copy into app/… to preview)
├── globals-theme.css    → theme tokens + helper classes to MERGE into your global CSS
├── tsconfig.json        → standalone type-check config (@/* → this folder)
└── README.md
```

`MOCK` files are the **only** files that differ from the original source — every
other file is a verbatim copy. To go live later, replace the mock files with real
implementations that keep the same exports (see _Going live_ below).

---

## Install (3 steps)

### 1. Copy the folders into your project

Merge these into wherever your `@/*` path alias points (project root if
`@/* → ./*`, or `src/` if `@/* → ./src/*`):

- `components/` → your `@/components`
- `lib/` → your `@/lib`
- `hooks/` → your `@/hooks`
- `public/icons/` → your `public/icons` (served at `/icons`)

Confirm your `tsconfig.json` has the alias:

```jsonc
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

### 2. Install dependencies

```bash
npm i \
  @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox \
  @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-label @radix-ui/react-popover @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator \
  @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch \
  @radix-ui/react-tabs @radix-ui/react-toggle @radix-ui/react-tooltip \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  @hookform/resolvers react-hook-form zod \
  @tabler/icons-react lucide-react \
  @turf/distance @turf/helpers \
  class-variance-authority clsx tailwind-merge cmdk \
  date-fns framer-motion recharts sonner

npm i -D tw-animate-css
```

Already provided by your stack (not installed here): `next`, `react`,
`react-dom`, `tailwindcss` (v4). `events` is a Node builtin that Next bundles
automatically — no install needed.

See `package-deps.json` for the exact version ranges this was extracted from.

### 3. Add the theme tokens

Open your global stylesheet (the one with `@import 'tailwindcss';`) and **paste
the contents of `globals-theme.css`** after that import. This registers the color
utilities (`bg-card`, `text-muted-foreground`, `bg-primary`, …) the panel relies
on — without them it renders without colors. (Do not duplicate the tailwind
import.)

---

## Preview it

Copy `demo/page.tsx` to `app/control-panel-demo/page.tsx`, run your dev server,
and open `/control-panel-demo`. The demo owns the panel's state (tabs, overlay
toggles, selections) and wraps it in the mock `AuthProvider`.

To use the panel in your own screen, render `<ControlPanel … />` and supply its
props (see `demo/page.tsx` and `components/control-panel/types.ts` for the full
prop list). It's a controlled, presentational component — the parent owns state.

---

## What's faithful vs stubbed

| Area                                                    | Status                                    |
| ------------------------------------------------------- | ----------------------------------------- |
| Floating card chrome (sidebar, top bar, scroll area)    | ✅ verbatim                               |
| Overlays tab + all toggles, flood scenario card, legend | ✅ verbatim                               |
| Data tables (inlets/outlets/pipes/drains) + detail view | ✅ verbatim, mock data                    |
| Reports / history / admin / maintenance / profile tabs  | ✅ verbatim UI, mock data & no-op actions |
| Simulations tab UI                                      | ✅ verbatim                               |
| 3D model preview (`model-viewer`)                       | ⚠️ placeholder (three.js dropped)         |
| Live data, auth, uploads, realtime, geocoding           | ⚠️ mocked (no network)                    |

**Dropped dependencies** (vs the original): `three`, `@react-three/fiber`,
`@react-three/drei`, `@supabase/supabase-js`, `@tanstack/react-query`,
`exifreader`, `mapbox-gl`, `@google/generative-ai`. The panel needs none of them
in look-only mode.

---

## Going live (later)

Each mock file keeps the **same path and exports** as the original. To wire up a
real backend, replace the mock with your own implementation of the same surface:

- `lib/query/hooks/useDrainageData.ts` → return your data (any source) as
  `{ data, isLoading, error }`. Re-add TanStack Query if you want caching.
- `lib/supabase/report.ts` / `profile.ts` / `maintenance.ts` / `client.ts` →
  swap to your DB (e.g. Prisma/Postgres) keeping the exported function names.
- `components/context/AuthProvider.tsx` → your real session provider.
- `lib/reports/extract-exif.ts`, `get-closest-pipe.ts` → real implementations.
- `components/model-viewer.tsx` → restore the original + `three`/`@react-three/*`
  if you want the 3D preview.

---

## Type-check

This folder type-checks standalone (`@/*` mapped to itself):

```bash
cd control-panel-portable
npx tsc --noEmit -p tsconfig.json
```
