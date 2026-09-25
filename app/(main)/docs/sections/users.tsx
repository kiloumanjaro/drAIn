import {
  AlertCircle,
  BarChart3,
  FileText,
  Map,
  Users,
  Zap,
} from 'lucide-react';
import FeatureCards from '@/components/docs-page/feature-cards';

export function UsersSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          User Stories
        </h2>
        <p className="text-muted-foreground text-sm">
          Target users and how each role benefits from the platform.
        </p>
      </div>

      <FeatureCards
        columns={2}
        features={[
          {
            icon: Zap,
            title: 'City Engineer',
            description:
              'Identify the drainage components that flood worst in simulation, and prioritize maintenance schedules accordingly',
            tooltip: 'Efficient planning without manual network inspection',
          },
          {
            icon: Map,
            title: 'Urban Planner',
            description:
              'Simulate infrastructure changes, evaluate design scenarios, and visualize flood impacts across different urban development strategies',
            tooltip: 'Ensure flood-resilient city development',
          },
          {
            icon: AlertCircle,
            title: 'Disaster Risk Reduction',
            description:
              'Run rainfall simulations to predict overflow areas, generate early warnings, and allocate emergency resources effectively',
            tooltip: 'Prepare early warnings and allocate emergency resources',
          },
          {
            icon: BarChart3,
            title: 'Environmental Researcher',
            description:
              'Study urban flooding behavior through detailed simulation and analyze correlations between urbanization patterns and simulated flood hazard',
            tooltip:
              'Explore correlations between urbanization and simulated flood hazard',
          },
          {
            icon: FileText,
            title: 'Policy Maker',
            description:
              'Review comprehensive visual maps, flood hazard reports, and simulation evidence for infrastructure and disaster mitigation strategies',
            tooltip:
              'Data-driven evidence for funding and infrastructure decisions',
          },
          {
            icon: Users,
            title: 'Citizen',
            description:
              'Report drainage issues with photo and embedded coordinates while receiving real-time updates on maintenance progress',
            tooltip:
              'Enhanced situational awareness and faster maintenance response',
          },
        ]}
      />
    </div>
  );
}
