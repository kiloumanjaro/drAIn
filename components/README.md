# Components

Grouped by the part of the product they belong to, not by what kind of thing
they are. A component lives with the feature that owns it; anything used by
more than one feature moves up to `common/`.

| Directory        | What belongs here                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ui/`            | shadcn/ui primitives. Generated — edit with care, and never put product logic here.                               |
| `common/`        | Used by more than one feature and tied to none: uploaders, pickers, spinners, the search box.                     |
| `shell/`         | App chrome the layout renders on every page — sidebar, navigation, notifications, the floating event widget.      |
| `map/`           | The map itself and its overlays: camera controls, layer toggles, flood scenarios, report bubbles.                 |
| `simulation/`    | Setting up a run and reading its results: parameter panels, the results table, the node slideshow, the 3D viewer. |
| `reports/`       | The citizen reporting flow — submission and the report lists.                                                     |
| `profile/`       | Who the user is and which agency they act for.                                                                    |
| `dashboard/`     | The analytics dashboard, split into `analytics/` and `reports/`.                                                  |
| `control-panel/` | The map's control panel. Its own chrome lives in `components/`, its tabs in `tabs/`.                              |
| `docs/`          | Pieces used by the in-app documentation pages.                                                                    |
| `landing/`       | The landing page, including its animated map (`data-flow`).                                                       |
| `auth/`          | Sign-in and sign-up forms.                                                                                        |
| `context/`       | React context providers.                                                                                          |
| `_unused/`       | Kept for reference, rendered nowhere. The `/gallery` dev route previews them.                                     |

## Conventions

- **File names are kebab-case**, including components. `ui/` keeps whatever
  shadcn generated.
- **Import across groups with the `@/components/...` alias**, not a relative
  path. Relative imports are for siblings within a group.
- A component used by exactly one feature belongs in that feature's
  directory. When a second feature needs it, move it to `common/` rather
  than reaching across.
- Pure logic that a component needs belongs in a `.helpers.ts` beside it, or
  in `lib/` if it is shared. Keeping it out of the component is what makes
  it testable — see `control-panel/tabs/maintenance.helpers.ts`.
