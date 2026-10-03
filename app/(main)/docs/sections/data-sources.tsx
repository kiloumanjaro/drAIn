import {
  BarChart3,
  CheckCircle,
  Cloud,
  Database,
  GitBranch,
  Layers,
  Map,
} from 'lucide-react';
import FeatureCards from '@/components/docs-page/feature-cards';

export function DataSourcesSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Data Sources
        </h2>
        <p className="text-muted-foreground text-sm">
          Published research, rainfall, elevation and drainage datasets used for
          modeling and analysis.
        </p>
      </div>

      <FeatureCards
        columns={3}
        features={[
          {
            icon: Cloud,
            title: 'Rainfall',
            description:
              'RIDF rainfall data from PAGASA via Quijano and Bañados (2023) research',
            tooltip:
              'Philippine Atmospheric, Geophysical and Astronomical Services Administration data',
          },
          {
            icon: Map,
            title: 'Elevation',
            description:
              'LiDAR-derived digital elevation model data via Quijano and Bañados (2023)',
            tooltip: 'Light Detection and Ranging derived topographic data',
          },
          {
            icon: Layers,
            title: 'Land Cover',
            description:
              'Map of Local Climate Zones from Demuzere et al (2022) classification',
            tooltip:
              'Urban climate zone classification for land surface characterization',
          },
          {
            icon: GitBranch,
            title: 'Drainage Network',
            description:
              'Drainage infrastructure network from Quijano and Bañados (2023)',
            tooltip:
              'Complete mapping of drainage system components and connections',
          },
          {
            icon: BarChart3,
            title: 'Node Flooding',
            description:
              'Flood simulation results derived from SWMM hydrological modeling',
            tooltip:
              'Simulated flooding at drainage network nodes under design storms',
          },
          {
            icon: Database,
            title: 'Subcatchments',
            description:
              'Aggregated subcatchment derived from drainage network spatial data',
            tooltip: 'Watershed delineation for hydrological modeling units',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {[
          'Enhanced spatial accuracy with DEM',
          'Real-world surface characteristics',
          'Design-storm rainfall from published rainfall-intensity curves',
          'Reduced data collection costs',
          'Support for continuous model updates',
        ].map((benefit, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
              <CheckCircle className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-xs text-slate-700">{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
