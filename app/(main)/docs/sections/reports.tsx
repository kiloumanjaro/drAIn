import FloodEventCards, {
  type FloodEvent,
} from '@/components/docs-page/flood-event-cards';

interface ReportsSectionProps {
  reportEvents: FloodEvent[];
  comparisonEvent: FloodEvent | null;
}

export function ReportsSection({
  reportEvents,
  comparisonEvent,
}: ReportsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Flood Reports
        </h2>
        <p className="text-muted-foreground text-sm">
          Historical flood event records and comparison data.
        </p>
      </div>
      <FloodEventCards
        events={reportEvents}
        comparisonEvent={comparisonEvent}
      />
    </div>
  );
}
