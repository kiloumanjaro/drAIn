import { Cloud, Code, Database, Server, Zap } from 'lucide-react';
import FeatureCards from '@/components/docs/feature-cards';

export function TechStackSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          Technology Stack
        </h2>
        <p className="text-muted-foreground text-sm">
          Frameworks, libraries, and services powering the application.
        </p>
      </div>

      <FeatureCards
        columns={3}
        features={[
          {
            icon: Code,
            title: 'Next.js',
            description:
              'React framework with server-side rendering and optimized performance',
            tooltip:
              'Full-stack framework with built-in performance optimization',
          },
          {
            icon: Zap,
            title: 'Tailwind CSS',
            description: 'Utility-first CSS framework for rapid UI development',
            tooltip: 'Low-level utility classes for flexible design system',
          },
          {
            icon: Server,
            title: 'Python FastAPI',
            description:
              'High-performance async API framework for backend processing',
            tooltip: 'Modern async framework with automatic API documentation',
          },
          {
            icon: Cloud,
            title: 'Supabase',
            description:
              'Real-time database and authentication backend services',
            tooltip: 'Open-source Firebase alternative with PostgreSQL',
          },
          {
            icon: Database,
            title: 'PostgreSQL',
            description:
              'Powerful relational database via Supabase cloud platform',
            tooltip:
              'Advanced open-source SQL database with real-time features',
          },
          {
            icon: Zap,
            title: 'Turbopack',
            description: 'Next-generation bundler for lightning-fast builds',
            tooltip:
              'Incremental bundler written in Rust for ultra-fast compilation',
          },
          {
            icon: Cloud,
            title: 'Vercel',
            description: 'Serverless deployment platform for frontend hosting',
            tooltip: 'Optimized hosting platform for Next.js and static sites',
          },
          {
            icon: Server,
            title: 'Railway',
            description:
              'Modern cloud infrastructure platform for backend APIs',
            tooltip:
              'Simple cloud platform for deploying containerized services',
          },
        ]}
      />
    </div>
  );
}
