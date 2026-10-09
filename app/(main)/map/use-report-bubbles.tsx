import { useCallback, useEffect, useRef, type RefObject } from 'react';
import mapboxgl from 'mapbox-gl';
import ReactDOM from 'react-dom/client';
import {
  ReportBubble,
  type ReportBubbleRef,
} from '@/components/map/report-bubble';
import { useLatestRef } from '@/hooks/use-latest-ref';
import {
  diffReportBubbles,
  reportBubbleSignature,
} from '@/lib/map/report-bubbles';
import { useReportCountsByComponent } from '@/lib/query/hooks/use-report-queries';
import { reportCountKey, type Report } from '@/lib/supabase/report';

/** One bubble on the map: its popup and the React root drawn inside it. */
interface BubbleEntry {
  popup: mapboxgl.Popup;
  root: ReactDOM.Root;
  /** What it was last drawn with (see reportBubbleSignature). */
  signature: string;
  /** The mounted bubble, for closing it when another opens. */
  bubble: ReportBubbleRef | null;
}

interface ReportBubblesOptions {
  mapRef: RefObject<mapboxgl.Map | null>;
  /** True once the map has loaded. */
  mapReady: boolean;
  /** The newest report on each component. */
  reports: Report[];
  /** The reports overlay switch. */
  visible: boolean;
  onHistoryClick: (category: string, componentId: string) => void;
}

/**
 * One bubble per component's latest report.
 *
 * The bubbles are kept by report id and brought in line with the reports
 * each time they change: new reports get a bubble, bubbles whose report is
 * gone are taken off, and only bubbles whose report or count changed are
 * drawn again. The rest are left alone, open ones included. Each bubble is
 * its own React root inside a Mapbox popup, so every one made here is
 * unmounted here.
 */
export function useReportBubbles({
  mapRef,
  mapReady,
  reports,
  visible,
  onHistoryClick,
}: ReportBubblesOptions) {
  const entriesRef = useRef(new Map<string, BubbleEntry>());
  // The map the bubbles were put on.
  const ownerRef = useRef<mapboxgl.Map | null>(null);

  // One request for every pin's report count, not one per pin.
  const { data: counts } = useReportCountsByComponent();

  // Read when a bubble is made or clicked, so neither the switch nor a new
  // handler is a reason to touch the bubbles already there.
  const visibleRef = useLatestRef(visible);
  const onHistoryClickRef = useLatestRef(onHistoryClick);

  const removeAllBubbles = useCallback(() => {
    const entries = entriesRef.current;
    const roots = [...entries.values()].map(({ popup, root }) => {
      popup.remove();
      return root;
    });
    entries.clear();
    // Unmounting a root during React's own render warns; do it just after.
    queueMicrotask(() => roots.forEach((root) => root.unmount()));
  }, []);

  // Hide or show the bubbles with the reports overlay switch.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    entriesRef.current.forEach(({ popup }) => {
      if (visible) {
        if (!popup.isOpen()) {
          popup.addTo(map);
        }
      } else {
        popup.remove();
      }
    });
  }, [visible, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Bubbles belong to the map they were added to.
    if (ownerRef.current !== map) {
      removeAllBubbles();
      ownerRef.current = map;
    }

    const entries = entriesRef.current;

    const reportsById = new Map<string, Report>();
    for (const report of reports) {
      if (!reportsById.has(report.id)) reportsById.set(report.id, report);
    }
    const countOf = (report: Report) =>
      counts?.get(reportCountKey(report.category, report.componentId)) ?? 0;
    const signatureOf = (report: Report) =>
      reportBubbleSignature(report, countOf(report));

    const { add, remove, update } = diffReportBubbles(
      new Map([...entries].map(([id, entry]) => [id, entry.signature])),
      [...reportsById.values()].map((report) => ({
        id: report.id,
        signature: signatureOf(report),
      }))
    );

    const draw = (entry: BubbleEntry, report: Report) => {
      entry.signature = signatureOf(report);
      entry.popup.setLngLat(report.coordinates);
      entry.root.render(
        <ReportBubble
          ref={(bubble) => {
            entry.bubble = bubble;
          }}
          reportSize={Promise.resolve(countOf(report))}
          report={report}
          map={map}
          coordinates={report.coordinates}
          onOpen={() => {
            // Only one bubble open at a time.
            entries.forEach((other) => {
              if (other !== entry) other.bubble?.close();
            });
          }}
          onHistoryClick={() =>
            onHistoryClickRef.current(report.category, report.componentId)
          }
        />
      );
    };

    for (const id of remove) {
      const entry = entries.get(id);
      if (!entry) continue;
      entry.popup.remove();
      entries.delete(id);
      queueMicrotask(() => entry.root.unmount());
    }

    for (const id of add) {
      const report = reportsById.get(id);
      if (!report) continue;

      const container = document.createElement('div');
      const popup = new mapboxgl.Popup({
        maxWidth: '320px',
        closeButton: false,
        className: 'no-bg-popup',
        closeOnClick: false,
      })
        .setLngLat(report.coordinates)
        .setDOMContent(container);
      // Hidden while the reports layer is off; the effect above adds them
      // when it is switched on.
      if (visibleRef.current) popup.addTo(map);

      const entry: BubbleEntry = {
        popup,
        root: ReactDOM.createRoot(container),
        signature: '',
        bubble: null,
      };
      entries.set(id, entry);
      draw(entry, report);
    }

    for (const id of update) {
      const entry = entries.get(id);
      const report = reportsById.get(id);
      if (entry && report) draw(entry, report);
    }
  }, [
    reports,
    counts,
    mapReady,
    mapRef,
    visibleRef,
    onHistoryClickRef,
    removeAllBubbles,
  ]);

  // Declared before the page removes its map, so the popups come off first.
  useEffect(() => removeAllBubbles, [removeAllBubbles]);
}
