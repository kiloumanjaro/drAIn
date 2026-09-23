import { Database, Gauge, Zap } from 'lucide-react';
import FeatureCards from '@/components/docs/feature-cards';

export function SimulationSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Simulation Models
        </h2>
        <p className="text-muted-foreground text-sm">
          SWMM-based static and dynamic flood simulation engines.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] px-6 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
              <Database className="h-4 w-4 text-slate-600" />
            </div>
            <h3 className="text-sm text-slate-900">Static Model</h3>
          </div>
          <p className="mb-3 text-xs text-slate-700">
            Pre-simulated rainfall-runoff analysis based on historical data and
            PAGASA RIDF curves.
          </p>
          <div className="space-y-2">
            {[
              'Node flooding summaries',
              'Predicted time to overflow',
              'Flood hazard classifications',
              'Multiple rainfall return periods',
              'Color-coded flood hazard layers',
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2"
              >
                <span className="text-xs text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] px-6 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
              <Zap className="h-4 w-4 text-slate-600" />
            </div>
            <h3 className="text-sm text-slate-900">Dynamic Model</h3>
          </div>
          <p className="mb-3 text-xs text-slate-700">
            Interactive on-demand simulations with real-time parameter
            adjustments.
          </p>
          <div className="space-y-2">
            {[
              'Modify rainfall intensity & duration',
              'Adjust node elevations',
              'Change conduit dimensions',
              'Alter flow capacity',
              'Real-time flood hazard updates',
              'What-if scenario analysis',
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2"
              >
                <span className="text-xs text-slate-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <FeatureCards
        columns={2}
        features={[
          {
            icon: Gauge,
            title: 'No Risk',
            description:
              'Drainage nodes with no predicted flooding under simulated rainfall conditions',
            tooltip: 'Safe zones with adequate drainage capacity',
            iconColor: 'text-green-500',
          },
          {
            icon: Gauge,
            title: 'Low Risk',
            description:
              'Minor overflow potential under heavy rainfall with minimal infrastructure impact',
            tooltip: 'Areas requiring monitoring during extreme events',
            iconColor: 'text-yellow-500',
          },
          {
            icon: Gauge,
            title: 'Medium Risk',
            description:
              'Moderate flooding likelihood requiring drainage improvements and maintenance',
            tooltip: 'Priority areas for infrastructure upgrades',
            iconColor: 'text-orange-500',
          },
          {
            icon: Gauge,
            title: 'High Risk',
            description:
              'Severe simulated flooding, with significant overflow volume',
            tooltip: 'Immediate intervention and capacity expansion needed',
            iconColor: 'text-red-500',
          },
        ]}
      />
    </div>
  );
}
