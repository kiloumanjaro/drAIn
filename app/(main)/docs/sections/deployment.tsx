import { Cloud, Server, Users } from 'lucide-react';
import FeatureCards from '@/components/docs-page/feature-cards';

export function DeploymentSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">Deployment</h2>
        <p className="text-muted-foreground text-sm">
          Hosting infrastructure and live access credentials.
        </p>
      </div>

      <FeatureCards
        columns={2}
        features={[
          {
            icon: Cloud,
            title: 'Live Demo Access',
            description: 'https://ai-drain.vercel.app/',
            tooltip: 'Publicly accessible deployment hosted on Vercel',
          },
          {
            icon: Users,
            title: 'Test Credentials',
            description: 'tester@gmail.com (123password)',
            tooltip: 'Use these credentials to explore the platform',
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] px-6 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
              <Server className="h-4 w-4 text-slate-600" />
            </div>
            <h3 className="text-sm text-slate-900">Vercel</h3>
          </div>
          <p className="mb-3 text-xs text-slate-700">Frontend Deployment</p>
          <div className="space-y-2">
            {[
              'Next.js application hosting',
              'Automatic deployments from Git',
              'Global CDN distribution',
              'Serverless functions',
              'Built with Turbopack',
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2"
              >
                <span className="text-xs text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] px-6 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
              <Server className="h-4 w-4 text-slate-600" />
            </div>
            <h3 className="text-sm text-slate-900">Railway</h3>
          </div>
          <p className="mb-3 text-xs text-slate-700">Backend Deployment</p>
          <div className="space-y-2">
            {[
              'Python FastAPI hosting',
              'SWMM simulation processing',
              'Automated scaling',
              'Environment management',
              'Integration with Supabase',
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2"
              >
                <span className="text-xs text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
