import {
  AlertCircle,
  CheckSquare,
  Droplets,
  Eye,
  Scale,
  Target,
  TrendingDown,
  Users,
  Users as UsersIcon,
  Zap as ZapIcon,
} from 'lucide-react';
import FeatureCards from '@/components/docs-page/feature-cards';
import PrincipleItem from '@/components/docs-page/principle-item';

export function OverviewSection() {
  return (
    <div>
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">Overview</h2>
        <p className="text-muted-foreground text-sm">
          AI-driven urban flood intelligence — what drAin is and why it matters.
        </p>
      </div>

      <FeatureCards
        columns={3}
        features={[
          {
            icon: Droplets,
            title: 'SWMM Integration',
            description:
              'Hydrological modeling for accurate drainage network simulation',
            tooltip:
              'Uses Storm Water Management Model for accurate rainfall-runoff simulation',
          },
          {
            icon: Target,
            title: 'Hazard Scoring',
            description:
              'Components are scored by how severely they flood, then weighted by how many people are nearby',
            tooltip:
              'Hazard, exposure and combined risk scored per drainage component',
          },
          {
            icon: Users,
            title: 'Citizen Engagement',
            description:
              'Real-time reporting and monitorin capabilities for communities',
            tooltip:
              'Citizens can report issues and track drainage system status in real-time',
          },
        ]}
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 pl-8">
        <div className="flex items-center gap-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            Mandaue City grapples with chronic urban flooding due to
            intensifying rainfall, rapid urbanization, and inadequate drainage
            infrastructure. Existing flood hazard maps show <em>where</em>{' '}
            floods happen but not <em>why</em>, failing to reveal which specific
            drainage components flood.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-[#dfdfdf] bg-white">
          <div className="border-b border-[#dfdfdf] bg-[#f7f7f7] px-4 py-3">
            <h3 className="text-sm text-slate-900">Our Vision</h3>
          </div>
          <div className="space-y-4 px-4 py-4">
            <PrincipleItem
              icon={ZapIcon}
              title="Empower:"
              description="Local governments with actionable flood data"
            />
            <PrincipleItem
              icon={UsersIcon}
              title="Enable:"
              description="Citizens to report and monitor drainage conditions"
            />
            <PrincipleItem
              icon={TrendingDown}
              title="Reduce:"
              description="Hydrological study costs using AI and open data"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#dfdfdf] bg-white">
          <div className="border-b border-[#dfdfdf] bg-[#f7f7f7] px-4 py-3">
            <h3 className="text-sm text-slate-900">Core Principles</h3>
          </div>
          <div className="space-y-4 px-4 py-4">
            <PrincipleItem
              icon={Eye}
              title="Transparency:"
              description="Built with open-source tools and public datasets"
            />
            <PrincipleItem
              icon={CheckSquare}
              title="Reproducibility:"
              description="Consistent simulation results you can trust"
            />
            <PrincipleItem
              icon={Scale}
              title="Scalability:"
              description="Adaptable to new cities and datasets"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
