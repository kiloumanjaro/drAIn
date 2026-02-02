'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Droplets,
  Target,
  Users,
  Code,
  Heart,
  FileText,
} from 'lucide-react';

export default function About() {
  // Add scrollbar-gutter to body only for this page
  React.useEffect(() => {
    document.body.style.overflowY = 'scroll';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#e8e8e8]/50">
      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="mx-auto w-[1280px] space-y-16 px-4 md:px-6">
          {/* Hero Section */}
          <section className="rounded-xl border border-[#ced1cd] bg-white px-10 py-10">
            <h2 className="text-foreground mb-4 text-3xl font-bold">
              AI-Driven Urban Flood Intelligence
            </h2>
            <p className="text-foreground text-base leading-relaxed">
              drAin combines hydrological modeling, machine learning, and
              satellite data to help cities understand, predict, and manage
              urban flooding through actionable insights.
            </p>
          </section>
          {/* Key Features Grid */}
          <section>
            <h2 className="text-foreground mb-6 text-center text-3xl font-bold">
              What Makes drAin Unique
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6 transition-colors hover:border-[#3B82F6]">
                <div className="bg-secondary mb-4 flex h-12 w-12 items-center justify-center rounded-sm">
                  <Droplets className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <h3 className="text-foreground mb-2 text-lg font-bold">
                  SWMM Integration
                </h3>
                <p className="text-muted-foreground text-base md:text-sm">
                  Industry-standard hydrological modeling for accurate drainage
                  network simulation
                </p>
              </div>

              <div className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6 transition-colors hover:border-[#3B82F6]">
                <div className="bg-secondary mb-4 flex h-12 w-12 items-center justify-center rounded-sm">
                  <Target className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <h3 className="text-foreground mb-2 text-lg font-bold">
                  AI Clustering
                </h3>
                <p className="text-muted-foreground text-base md:text-sm">
                  K-means algorithms identify vulnerability patterns and weak
                  points in drainage systems
                </p>
              </div>

              <div className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6 transition-colors hover:border-[#3B82F6]">
                <div className="bg-secondary mb-4 flex h-12 w-12 items-center justify-center rounded-sm">
                  <Users className="h-6 w-6 text-[#3B82F6]" />
                </div>
                <h3 className="text-foreground mb-2 text-lg font-bold">
                  Citizen Engagement
                </h3>
                <p className="text-muted-foreground text-base md:text-sm">
                  Real-time reporting and monitoring capabilities for community
                  participation
                </p>
              </div>
            </div>
          </section>

          {/* Story Section */}
          <section className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <div>
                <div className="bg-secondary text-foreground mb-4 inline-block rounded-sm px-4 py-2 text-sm font-semibold">
                  Our Story
                </div>
                <h2 className="text-foreground mb-4 text-3xl font-bold">
                  Born from Real-World Challenges
                </h2>
                <div className="text-foreground space-y-4 text-base leading-relaxed md:text-sm">
                  <p>
                    drAin emerged from a university research initiative at the{' '}
                    <strong>University of the Philippines Cebu</strong>, driven
                    by Computer Science students who witnessed the devastating
                    impact of recurring floods in <strong>Mandaue City</strong>.
                  </p>
                  <p>
                    While traditional flood maps show <em>where</em> flooding
                    occurs, drAin reveals <em>why</em>—identifying which
                    drainage components are at risk and how infrastructure
                    changes affect resilience.
                  </p>
                  <p>
                    We bridge the gap between academic research, AI innovation,
                    and civic technology to deliver actionable flood
                    intelligence.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#ced1cd] bg-[#f7f7f7] px-6 py-6">
                <h3 className="text-foreground mb-4 text-2xl font-bold">
                  Our Vision
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#3B82F6]">
                      <span className="text-xs text-white">✓</span>
                    </div>
                    <p className="text-foreground text-base md:text-sm">
                      Empower local governments with actionable flood data
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#3B82F6]">
                      <span className="text-xs text-white">✓</span>
                    </div>
                    <p className="text-foreground text-base md:text-sm">
                      Enable citizens to report and monitor drainage conditions
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#3B82F6]">
                      <span className="text-xs text-white">✓</span>
                    </div>
                    <p className="text-foreground text-base md:text-sm">
                      Reduce hydrological study costs using AI and open data
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#3B82F6]">
                      <span className="text-xs text-white">✓</span>
                    </div>
                    <p className="text-foreground text-base md:text-sm">
                      Promote open-source collaboration for urban resilience
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Principles */}
          <section className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6">
            <h2 className="text-foreground mb-4 text-center text-3xl font-bold">
              Our Principles
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm">
                  <FileText className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">
                  Transparency
                </h3>
                <p className="text-muted-foreground text-base md:text-sm">
                  Built with open-source tools and public datasets
                </p>
              </div>
              <div className="text-center">
                <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm">
                  <Code className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">
                  Reproducibility
                </h3>
                <p className="text-muted-foreground text-base md:text-sm">
                  Consistent simulation results you can trust
                </p>
              </div>
              <div className="text-center">
                <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm">
                  <Target className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">
                  Scalability
                </h3>
                <p className="text-muted-foreground text-base md:text-sm">
                  Adaptable to new cities and datasets
                </p>
              </div>
              <div className="text-center">
                <div className="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm">
                  <Heart className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <h3 className="text-foreground mb-2 font-semibold">
                  User-Centricity
                </h3>
                <p className="text-muted-foreground text-base md:text-sm">
                  Designed for experts and citizens alike
                </p>
              </div>
            </div>
          </section>

          {/* Contribution */}
          <section className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <h2 className="mb-4 text-3xl font-bold text-gray-900">
                Join Our Mission
              </h2>
              <p className="mb-6 text-gray-700">
                We welcome developers, researchers, and civic innovators to
                contribute to sustainable flood management.
              </p>
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">
                  Contribution Areas:
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    Frontend UI
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    Backend API
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    Data Science
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    Documentation
                  </span>
                </div>
              </div>
            </div>

            <Card className="border-2 border-blue-200 md:col-span-3">
              <CardContent className="p-6">
                <h3 className="mb-4 font-semibold text-gray-900">
                  Quick Start Guide
                </h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      1
                    </span>
                    <span>
                      Fork the{' '}
                      <a
                        href="https://github.com/eliseoalcaraz/drAIn"
                        target="_blank"
                      >
                        <span className="font-bold text-blue-500 underline decoration-blue-500">
                          repository
                        </span>
                      </a>{' '}
                      and set up your environment
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      2
                    </span>
                    <div className="flex-1">
                      <span className="mb-1 block">Install dependencies:</span>
                      <code className="block rounded bg-gray-900 px-3 py-2 text-xs text-green-400">
                        pnpm install
                      </code>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      3
                    </span>
                    <div className="flex-1">
                      <span className="mb-1 block">Run the backend:</span>
                      <code className="block rounded bg-gray-900 px-3 py-2 text-xs text-green-400">
                        uvicorn server:app --reload
                      </code>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                      4
                    </span>
                    <span>Create a branch and submit a pull request</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </section>

          {/* Team & Contact */}
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6 pb-8">
              <h2 className="text-foreground mb-4 text-2xl font-bold">
                Meet the Team
              </h2>

              <p className="text-foreground mb-6 text-base md:text-sm">
                Developed and maintained by <strong>Team 2Ls</strong> from the
                University of the Philippines Cebu, Department of Computer
                Science.
              </p>
              <div className="space-y-4">
                <a
                  href="mailto:epalcaraz@up.edu.ph"
                  className="group flex items-center gap-3 text-[#3B82F6] transition-colors hover:text-[#2563EB]"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-base md:text-sm">
                    epalcaraz@up.edu.ph
                  </span>
                </a>
                <a
                  href="mailto:kborbano@up.edu.ph"
                  className="group flex items-center gap-3 text-[#3B82F6] transition-colors hover:text-[#2563EB]"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-base md:text-sm">
                    kborbano@up.edu.ph
                  </span>
                </a>
                <a
                  href="mailto:ccbayadog@up.edu.ph"
                  className="group flex items-center gap-3 text-[#3B82F6] transition-colors hover:text-[#2563EB]"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-base md:text-sm">
                    ccbayadog@up.edu.ph
                  </span>
                </a>
                <a
                  href="mailto:najazul@up.edu.ph"
                  className="group flex items-center gap-3 text-[#3B82F6] transition-colors hover:text-[#2563EB]"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-base md:text-sm">
                    najazul@up.edu.ph
                  </span>
                </a>
                <a
                  href="mailto:jpsandro@up.edu.ph"
                  className="group flex items-center gap-3 text-[#3B82F6] transition-colors hover:text-[#2563EB]"
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-base md:text-sm">
                    jpsandro@up.edu.ph
                  </span>
                </a>

                {/*
                  <a href="https://github.com/team-2Ls" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#3B82F6] hover:text-[#2563EB] transition-colors">
                    <Github className="w-5 h-5" />
                    <span>github.com/eliseoalcaraz/drAIn</span> 
                  </a> */}
              </div>
            </div>

            <div className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6">
              <h2 className="text-foreground mb-4 text-2xl font-bold">
                License
              </h2>

              <p className="text-foreground mb-6 text-base md:text-sm">
                This project is licensed under the{' '}
                <strong>GNU General Public License v2.0 (GPL-2.0)</strong>. You
                are free to use, modify, and distribute the code with proper
                attribution.
              </p>
              <Button
                className="rounded-sm border border-[#2b3ea7] bg-[#4b72f3] text-white transition-colors hover:bg-[#2563EB]"
                asChild
              >
                <a href="/LICENSE" download>
                  View License
                </a>
              </Button>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-foreground mt-8 border-t border-[#ced1cd] bg-white py-8">
        <div className="mx-auto w-[1280px] px-4 text-center md:px-6">
          <p className="text-base md:text-sm">
            © 2025 Team 2Ls, University of the Philippines Cebu. Building
            resilient cities through open-source innovation.
          </p>
        </div>
      </footer>
    </div>
  );
}
