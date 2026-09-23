import { Cloud, Code, Database, Server } from 'lucide-react';
import FeatureCards from '@/components/docs/FeatureCards';

export function ArchitectureSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          System Architecture
        </h2>
        <p className="text-muted-foreground text-sm">
          How the frontend, backend, and data layers connect.
        </p>
      </div>

      <FeatureCards
        columns={2}
        features={[
          {
            icon: Server,
            title: 'Frontend Layer',
            description:
              'Next.js application with Turbopack build optimization, React components, and Tailwind CSS styling for responsive user interfaces',
            tooltip:
              'User-facing web application with optimized performance and modern UI framework',
          },
          {
            icon: Code,
            title: 'Backend Layer',
            description:
              'Python FastAPI for simulation processing, SWMM hydrological modeling, and K-means ML for vulnerability classification',
            tooltip:
              'API server handling flood simulations, data processing, and machine learning computations',
          },
          {
            icon: Database,
            title: 'Data Layer',
            description:
              'Supabase PostgreSQL database with real-time capabilities for managing drainage networks and user data',
            tooltip:
              'Real-time database storing drainage networks, simulation results, and user information',
          },
          {
            icon: Cloud,
            title: 'Deployment',
            description:
              'Distributed deployment across Vercel for frontend hosting and Railway for backend services with scalable infrastructure',
            tooltip:
              'Cloud-based hosting with auto-scaling and global content delivery',
          },
        ]}
      />
    </div>
  );
}
