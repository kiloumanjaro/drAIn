'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function FloodReportDisplay({ historicalData, comparisonData }: { historicalData: FloodReportData, comparisonData: NewEventData | null }) {
  if (!historicalData.events) {
    return <div>Loading...</div>
  }
  const allEvents = comparisonData ? [comparisonData, ...historicalData.events] : historicalData.events;
  return (
    <div className="container mx-auto p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">{historicalData.reportTitle}</h1>
        <p className="text-xl text-muted-foreground">{historicalData.reportSubtitle}</p>
      </header>

      <section className="mb-8 prose max-w-none">
        <p>{historicalData.introduction}</p>
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-4">Flood Events</h2>
        <div className="grid gap-6">
          {allEvents.map((event, index) => (
            <Card key={index} className={index === 0 && comparisonData ? 'border-blue-500 border-2' : ''}>
              <CardHeader>
                <CardTitle>{event.eventName}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 prose max-w-none">{event.summary}</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Point
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(event.data).map(([key, value]) => (
                        <tr key={key}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{value}</td>
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
