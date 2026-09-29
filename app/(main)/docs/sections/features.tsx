import {
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Map,
  Users,
  Zap,
} from 'lucide-react';

interface FeaturesSectionProps {
  expandedSections: Record<string, boolean>;
  toggleSection: (section: string) => void;
}

export function FeaturesSection({
  expandedSections,
  toggleSection,
}: FeaturesSectionProps) {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Core Features
        </h2>
        <p className="text-muted-foreground text-sm">
          Key capabilities of the platform across map, simulation, and
          reporting.
        </p>
      </div>

      <div className="space-y-2">
        {[
          {
            title: 'Interactive Map',
            icon: Map,
            features: [
              'City map with drainage system overlay',
              'Zoom, satellite view, and position reset',
              'Clickable reports with maintenance history',
              'Component visibility controls',
            ],
          },
          {
            title: 'Overlay Analytics',
            icon: BarChart3,
            features: [
              'Pie chart statistics for all components',
              'Toggle visibility for inlets, outlets, drains, pipes',
              'Bar graph showing report frequency',
              'Customizable layout settings',
            ],
          },
          {
            title: 'Inventory Management',
            icon: Database,
            features: [
              'Sortable component tables',
              'Search by component ID',
              'Category switching (Inlet, Outlet, Drain, Pipes)',
              'Mock 3D models for each component',
            ],
          },
          {
            title: 'Simulation Engine',
            icon: Zap,
            features: [
              'Static model with pre-simulated data',
              'Adjustable parameters with on-demand re-simulation',
              'Flood hazard classification (No Risk to High)',
              'What-if scenario analysis',
            ],
          },
          {
            title: 'Citizen Reporting',
            icon: Users,
            features: [
              'Image upload with embedded coordinates',
              'Component type selection',
              'Automatic node pinpointing',
              'Time-based report filtering',
            ],
          },
          {
            title: 'Admin Dashboard',
            icon: CheckCircle,
            features: [
              'Maintenance history tracking',
              'Report status updates (pending, in-progress, resolved)',
              'User account linking to agencies',
              'Privilege management',
            ],
          },
        ].map((feature, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-lg border border-[#dfdfdf] bg-white"
          >
            <button
              onClick={() => toggleSection(feature.title)}
              className={`flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-100 ${
                expandedSections[feature.title]
                  ? 'border-b border-[#dfdfdf]'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-slate-300 bg-[#f1f5f9]">
                  <feature.icon className="h-4 w-4 text-slate-600" />
                </div>
                <h3 className="text-foreground text-base">{feature.title}</h3>
              </div>
              {expandedSections[feature.title] ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )}
            </button>
            {expandedSections[feature.title] && (
              <div className="bg-[#f7f7f7] px-4 py-4">
                <ul className="space-y-1.5">
                  {feature.features.map((item, i) => (
                    <li
                      key={i}
                      className="text-foreground flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
                        <CheckCircle className="h-4 w-4 text-slate-600" />
                      </div>
                      <span className="leading-relaxed font-normal">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
