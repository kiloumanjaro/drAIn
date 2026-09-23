import { BarChart3, CheckCircle, Database, Target, Users } from 'lucide-react';
import FeatureCards from '@/components/docs/FeatureCards';

export function LimitationsSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Limitations & Future Work
        </h2>
        <p className="text-muted-foreground text-sm">
          Current constraints and planned improvements.
        </p>
      </div>

      <FeatureCards
        columns={2}
        features={[
          {
            icon: Target,
            title: 'Simulation Precision',
            description:
              'Simplified approach vs high-end software. Enhances efficiency and accessibility.',
            tooltip:
              'Trade-off between computational speed and modeling detail',
          },
          {
            icon: Database,
            title: 'Data Dependency',
            description:
              'Accuracy depends on quality of satellite data and drainage information.',
            tooltip: 'Results are only as reliable as the input datasets',
          },
          {
            icon: BarChart3,
            title: 'Clustering Interpretation',
            description:
              'K-means provides relative groupings requiring expert validation.',
            tooltip:
              'Vulnerability classifications should be reviewed by domain experts',
          },
          {
            icon: Users,
            title: 'User Participation',
            description:
              'Citizen reporting depends on consistent participation and verified submissions.',
            tooltip:
              'Community engagement is essential for accurate field data',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          'Refine model parameters',
          'Improve simulation accuracy',
          'Enhance decision-support features',
          'Expand to additional cities',
          'Integrate real-time sensor data',
          'Develop mobile applications',
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
              <CheckCircle className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-xs text-slate-700">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
