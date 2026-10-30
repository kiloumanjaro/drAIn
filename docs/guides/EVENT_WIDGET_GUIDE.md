# Event Widget Guide

The event widget is the small alert icon under the zoom and reset buttons on the map. It names the most recent flood event on record and links to the flood reports in the docs.

## What it does

- Collapsed, it is a 36px icon. On hover or keyboard focus it widens to show the headline of the latest flood event, for example "Typhoon Tino (Kalmaegi) of November 4, 2025". A headline too long for the widget is cut short; the full text is in the tooltip and in the link's accessible name.
- Clicking it opens `/docs?section=reports`, where the events are listed newest first, so the first card is the latest one (unless an old `compareEvent` link puts another event ahead of it; see below).
- While the events are loading, if they fail to load, or if there are none, the widget is not shown. On screens narrower than `md` it keeps an empty 36px slot while loading, so the map style button below it does not jump when the widget arrives.

## Where the event comes from

Nothing about the event is written in the component. The events live in `data/mandaue_flood_reports.json` and are served by `GET /api/reports` (`app/api/reports/route.ts`) as:

```json
{
  "reportTitle": "...",
  "reportSubtitle": "...",
  "introduction": "...",
  "events": [{ "eventName": "...", "summary": "...", "data": { "...": "..." } }]
}
```

The events have no date field. They are listed **oldest first**, so the latest event is the last one in the file. To announce a new flood, append it to the end of `events` and deploy. New visitors see it straight away. A returning visitor's browser may show the previous event for one more page load, because `/api/reports` is cached for five minutes and then served stale while a fresh copy is fetched, for up to a day. A tab left open refetches after at most 15 minutes.

An `eventName` may start with `Event N:` or `NEW EVENT:`. That prefix is removed before the name is shown.

## Code

| File                                         | Role                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `components/shell/widget-trigger.tsx`        | The widget. Rendered by `components/map/camera-controls.tsx`.          |
| `lib/query/hooks/use-flood-events.ts`        | `useFloodEvents()`, the TanStack Query hook the widget and docs share. |
| `lib/docs/flood-events.ts`                   | Pure helpers: parse the response, pick the latest, order the cards.    |
| `components/docs-page/flood-event-cards.tsx` | The cards on the docs page.                                            |

## The `compareEvent` link parameter

The widget used to carry a hard-coded event to the docs page as JSON in the URL (`/docs?section=reports&compareEvent=<JSON>`). It no longer builds such links, but the docs page still reads them so that old links keep working: a valid `compareEvent` is shown first, ahead of the recorded events. If it repeats a recorded event (same name, whatever the prefix), that event is shown once, in first place and with the recorded text rather than the text from the link. Only the latest recorded event is labelled "Latest flood event"; a linked event that is not on record is labelled "Event from link". See `parseCompareEventParam` in `lib/docs/docs-params.ts`.

## Unused code

`components/shell/event-widget.tsx` (a draggable pop-up card) and `useEventWidget().openWidget` in `components/context/event-widget-provider.tsx` are left over from an earlier design. The provider is still mounted in `app/layout.tsx`, but nothing calls `openWidget`, so the card never appears.
