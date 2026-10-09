'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Clock, Search } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { type FloodEvent } from '@/components/docs-page/flood-event-cards';
import { isTextEntryTarget } from '@/lib/dom/is-text-entry-target';
import {
  isFloodEvent,
  parseCompareEventParam,
  parseSectionParam,
} from '@/lib/docs/docs-params';
import { DEVELOPERS, SECTION_GROUPS, type SectionID } from './page.constants';
import { OverviewSection } from './sections/overview';
import { ArchitectureSection } from './sections/architecture';
import { FeaturesSection } from './sections/features';
import { TechStackSection } from './sections/tech-stack';
import { DataSourcesSection } from './sections/data-sources';
import { SimulationSection } from './sections/simulation';
import { UsersSection } from './sections/users';
import { DeploymentSection } from './sections/deployment';
import { LimitationsSection } from './sections/limitations';
import { ReportsSection } from './sections/reports';
import { DemoSection } from './sections/demo';
interface ExpandedSections {
  [key: string]: boolean;
}

const SECTION_IDS: SectionID[] = SECTION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.id)
);

function DocsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the one record of which section is open, so Back, reload and
  // a shared link all land on it. An unknown ?section= shows the overview.
  const activeSection = parseSectionParam(
    searchParams.get('section'),
    SECTION_IDS,
    'overview'
  );

  // A new history entry per section, so Back returns to the one before.
  // scroll: false keeps the reader where they are instead of jumping to top.
  const selectSection = (id: SectionID) => {
    if (id === activeSection) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [reportEvents, setReportEvents] = useState<FloodEvent[]>([]);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((data) =>
        setReportEvents(
          Array.isArray(data?.events) ? data.events.filter(isFloodEvent) : []
        )
      )
      .catch((e) => console.error('Failed to load flood reports:', e));
  }, []);

  // The event to compare against, passed in the URL by the map.
  const compareParam = searchParams.get('compareEvent');
  const comparisonEvent = useMemo<FloodEvent | null>(
    () => parseCompareEventParam(compareParam),
    [compareParam]
  );

  const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
    {}
  );
  const [sidebarSearch, setSidebarSearch] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Add scrollbar-gutter to body only for this page
  React.useEffect(() => {
    document.body.style.overflowY = 'scroll';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  // Handle / shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey) return;
      // Typing a "/" into a field, the search box included, is not the
      // shortcut.
      if (isTextEntryTarget(e.target as HTMLElement | null)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const sectionGroups = SECTION_GROUPS;
  const searchMatchesNothing = !sectionGroups.some((group) =>
    group.items.some((item) =>
      item.label.toLowerCase().includes(sidebarSearch.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-[#f1f1f1] px-4 max-md:pt-14">
      <div className="mx-auto pb-5">
        <div className="flex flex-col md:flex-row md:gap-4">
          {/* Sidebar Navigation */}
          <nav className="w-full md:w-52 md:flex-shrink-0">
            <div className="md:sticky md:top-2 md:max-h-[calc(100vh-1rem)] md:overflow-y-auto">
              <div className="mt-2 mb-4 flex items-center gap-2">
                <div className="flex w-full justify-center rounded-lg border border-[#dfdfdf] bg-white px-5 py-2">
                  <Image
                    src="/images/text.png"
                    alt="drAIn"
                    width={120}
                    height={36}
                    className="h-9 w-auto"
                  />
                </div>
              </div>
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search
                    aria-hidden="true"
                    className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    aria-label="Search the documentation sections"
                    aria-keyshortcuts="/"
                    value={sidebarSearch}
                    onChange={(e) => setSidebarSearch(e.target.value)}
                    className="w-full rounded-md bg-transparent py-1.5 pr-2 pl-7 text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none"
                  />
                </div>
                {!sidebarSearch && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#dfdfdf] bg-white">
                    <kbd className="text-xs font-semibold text-[#28385a]">
                      /
                    </kbd>
                  </div>
                )}
              </div>
              <div className="mt-0 mb-3 border-t-2 border-b border-t-[#e7e7e7] border-b-white" />
              <div className="space-y-3">
                {sectionGroups
                  .map((group) => {
                    const filtered = group.items.filter((item) =>
                      item.label
                        .toLowerCase()
                        .includes(sidebarSearch.toLowerCase())
                    );
                    if (filtered.length === 0) return null;
                    return (
                      <div key={group.heading}>
                        <h2 className="mb-2 px-2 text-xs text-gray-600">
                          {group.heading}
                        </h2>
                        <ul className="space-y-0.5">
                          {filtered.map(
                            ({
                              id,
                              label,
                              icon: Icon,
                              iconSolid: IconSolid,
                            }) => {
                              const ActiveIcon =
                                activeSection === id ? IconSolid : Icon;
                              return (
                                <li key={id}>
                                  <button
                                    onClick={() => selectSection(id)}
                                    className={`flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-[#535353] transition-colors ${
                                      activeSection === id
                                        ? 'bg-[#e7e7e7]'
                                        : 'hover:bg-[#e7e7e7]/50'
                                    }`}
                                  >
                                    <ActiveIcon className="h-3.5 w-3.5" />
                                    <span>{label}</span>
                                  </button>
                                </li>
                              );
                            }
                          )}
                        </ul>
                      </div>
                    );
                  })
                  .map((element, idx, arr) => (
                    <React.Fragment key={idx}>
                      {element}
                      {idx < arr.length - 1 && !sidebarSearch && (
                        <div className="my-3 border-t-2 border-b border-t-[#e7e7e7] border-b-white" />
                      )}
                    </React.Fragment>
                  ))}
                {searchMatchesNothing && (
                  <p className="px-2 text-xs text-gray-600">
                    No sections match &ldquo;{sidebarSearch}&rdquo;.
                  </p>
                )}
              </div>
            </div>
          </nav>

          {/* Main Content */}
          {/* div, not main: SidebarInset is already the main landmark */}
          <div className="mt-5 flex min-h-[calc(100vh-60px)] min-w-0 flex-1 flex-col">
            {/* Header */}
            <div className="rounded-t-xl border border-[#dfdfdf] bg-white px-6 py-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-foreground/70 font-semibold">
                  Documentation
                </p>

                <div className="flex items-center gap-3">
                  <div className="hidden items-center gap-2 text-xs text-gray-600 sm:flex">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                    <span>Last changed on November 2025 by</span>
                  </div>

                  <TooltipProvider>
                    <div className="flex -space-x-2">
                      {DEVELOPERS.map((dev) => (
                        <Tooltip key={dev.initials}>
                          <TooltipTrigger asChild>
                            <Avatar className="h-8 w-8 cursor-pointer border-2 border-white">
                              <AvatarFallback
                                className={`text-xs font-medium ${dev.color}`}
                              >
                                {dev.initials}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{dev.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            <div className="flex-1 border-x border-[#dfdfdf] bg-[#fcfcfc] px-8 pt-4 pb-4">
              {activeSection === 'overview' && <OverviewSection />}

              {activeSection === 'architecture' && <ArchitectureSection />}

              {activeSection === 'features' && (
                <FeaturesSection
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                />
              )}

              {activeSection === 'tech-stack' && <TechStackSection />}

              {activeSection === 'data-sources' && <DataSourcesSection />}

              {activeSection === 'simulation' && <SimulationSection />}

              {activeSection === 'users' && <UsersSection />}

              {activeSection === 'deployment' && <DeploymentSection />}

              {activeSection === 'limitations' && <LimitationsSection />}

              {activeSection === 'reports' && (
                <ReportsSection
                  reportEvents={reportEvents}
                  comparisonEvent={comparisonEvent}
                />
              )}

              {activeSection === 'demo' && <DemoSection />}
            </div>
            {/* Footer */}
            <div className="rounded-b-xl border border-[#dfdfdf] bg-white px-6 py-3.5 text-center text-sm text-gray-600">
              © 2026 drAIn Project. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Top-level `/docs` route. Wraps {@link DocsContent} in Suspense so the
 * component can read URL search params (`useSearchParams`) to preselect a
 * section / honour `?compareEvent=...` deep links from the EventWidget.
 */
export default function Docs() {
  return (
    <Suspense fallback={<div />}>
      <DocsContent />
    </Suspense>
  );
}
