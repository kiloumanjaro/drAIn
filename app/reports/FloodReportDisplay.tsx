'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EventData {
  [key: string]: string;
}

interface FloodEvent {
  eventName: string;
  summary: string;
  data: EventData;
}

interface FloodReportData {
  reportTitle: string;
  reportSubtitle: string;
  introduction: string;
  events: FloodEvent[];
}

interface NewEventData {
  eventName: string;
  summary: string;
  data: EventData;
}

export default function FloodReportDisplay({
  historicalData,
  comparisonData,
}: {
  historicalData: FloodReportData;
  comparisonData: NewEventData | null;
}) {
  if (!historicalData.events) {
    return <div>Loading...</div>;
  }
  const allEvents = comparisonData
    ? [comparisonData, ...historicalData.events]
    : historicalData.events;
  return (
    <div className="container mx-auto p-4">
      <header className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold">
          {historicalData.reportTitle}
        </h1>
        <p className="text-muted-foreground text-xl">
          {historicalData.reportSubtitle}
        </p>
      </header>

      <section className="prose mb-8 max-w-none">
        <p>{historicalData.introduction}</p>
      </section>

      <section>
        <h2 className="mb-4 text-3xl font-bold">Flood Events</h2>
        <div className="grid gap-6">
          {allEvents.map((event, index) => (
            <Card
              key={index}
              className={
                index === 0 && comparisonData ? 'border-2 border-blue-500' : ''
              }
            >
              <CardHeader>
                <CardTitle>{event.eventName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="prose mb-4 max-w-none break-words">
                  {event.summary}
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="w-1/2 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                          Data Point
                        </th>
                        <th
                          scope="col"
                          className="w-1/2 px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {Object.entries(event.data).map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-6 py-4 text-sm font-medium break-words text-gray-900">
                            {key}
                          </td>
                          <td className="px-6 py-4 text-sm break-words text-gray-500">
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
