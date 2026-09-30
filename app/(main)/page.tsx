import DataFlowPipeline from '@/components/landing/data-flow';
import Image from 'next/image';
import { FullscreenButton } from '@/components/landing/fullscreen-button';
import { ExploreMapButton } from '@/components/landing/explore-map-button';

export default function WelcomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e8e8e8]/50">
      <div className="pointer-events-auto absolute top-4 right-4 z-20">
        <FullscreenButton />
      </div>

      <DataFlowPipeline
        background
        cover
        showMap
        mapOpacity={1}
        enableHover={true}
        hoverColor="#3b82f6"
        fillOnHover={true}
        fillOpacity={0.2}
        hoverTrailDelay={300}
        debug={false}
      />

      <div className="pointer-events-none relative z-10 flex h-full flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="flex max-w-3xl flex-col gap-20">
          <h1 className="flex flex-wrap items-center justify-center gap-4 font-[family-name:var(--font-century-gothic)] text-5xl leading-2 font-bold text-[#34332e]">
            <span>a blueprint</span>
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={80}
              height={60}
              className="animate-rotate-in pointer-events-auto mb-1 rotate-0 transition-transform duration-300 hover:rotate-12"
            />
            <span>for efficient</span>
            <span className="text-shine">drainage management system</span>
          </h1>

          <div>
            <ExploreMapButton />
          </div>
        </div>
      </div>
    </main>
  );
}
