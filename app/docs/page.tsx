'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BookOpenIcon as BookOpenOutline,
  BoltIcon as BoltOutline,
  UsersIcon as UsersOutline,
  Square3Stack3DIcon as Square3Stack3DOutline,
  CubeIcon as CubeOutline,
  CircleStackIcon as CircleStackOutline,
  ChartBarIcon as ChartBarOutline,
  ServerIcon as ServerOutline,
  ExclamationTriangleIcon as ExclamationTriangleOutline,
  PlayIcon as PlayOutline,
  DocumentTextIcon as DocumentTextOutline,
} from '@heroicons/react/24/outline';
import {
  BookOpenIcon as BookOpenSolid,
  BoltIcon as BoltSolid,
  UsersIcon as UsersSolid,
  Square3Stack3DIcon as Square3Stack3DSolid,
  CubeIcon as CubeSolid,
  CircleStackIcon as CircleStackSolid,
  ChartBarIcon as ChartBarSolid,
  ServerIcon as ServerSolid,
  ExclamationTriangleIcon as ExclamationTriangleSolid,
  PlayIcon as PlaySolid,
  InformationCircleIcon as InformationCircleSolid,
  DocumentTextIcon as DocumentTextSolid,
} from '@heroicons/react/24/solid';
import {
  Code,
  GitBranch,
  Layers,
  Server,
  Cloud,
  Map,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  Database,
  Clock,
  Search,
  Users,
  Droplets,
  Target,
  Heart,
  FileText,
  Mail,
  Info,
  Zap as ZapIcon,
  Users as UsersIcon,
  TrendingDown,
  GitFork,
  Eye,
  CheckSquare,
  Scale,
  Smile,
  Gauge,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import FeatureCards from '@/components/docs/FeatureCards';
import PrincipleItem from '@/components/docs/PrincipleItem';
import FloodEventCards from '@/components/docs/FloodEventCards';

const developers = [
  {
    name: 'Kint Louise Borbano',
    initials: 'KB',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    name: 'Eliseo Alcaraz',
    initials: 'EA',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    name: 'Christian James Bayadog',
    initials: 'CJ',
    color: 'bg-violet-100 text-violet-700',
  },
  {
    name: 'Norman Jazul Jr.',
    initials: 'NJ',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    name: 'John Carlo Sandro',
    initials: 'JC',
    color: 'bg-rose-100 text-rose-700',
  },
];

type SectionID =
  | 'overview'
  | 'architecture'
  | 'features'
  | 'tech-stack'
  | 'data-sources'
  | 'simulation'
  | 'users'
  | 'deployment'
  | 'limitations'
  | 'demo'
  | 'reports';

interface ExpandedSections {
  [key: string]: boolean;
}

function DocsContent() {
  const searchParams = useSearchParams();
  const initialSection =
    (searchParams.get('section') as SectionID) || 'overview';
  const [activeSection, setActiveSection] = useState<SectionID>(initialSection);

  useEffect(() => {
    const section = searchParams.get('section') as SectionID | null;
    if (section) setActiveSection(section);
  }, [searchParams]);

  const [reportEvents, setReportEvents] = useState<
    Array<{ eventName: string; summary: string; data: Record<string, string> }>
  >([]);
  const [comparisonEvent, setComparisonEvent] = useState<{
    eventName: string;
    summary: string;
    data: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((data) => setReportEvents(data.events ?? []));

    const param = searchParams.get('compareEvent');
    if (param) {
      try {
        setComparisonEvent(JSON.parse(decodeURIComponent(param)));
      } catch (e) {
        console.error('Failed to parse comparison event:', e);
      }
    }
  }, [searchParams]);

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
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
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

  const sectionGroups = [
    {
      heading: 'General',
      items: [
        {
          id: 'overview',
          label: 'Overview',
          icon: BookOpenOutline,
          iconSolid: BookOpenSolid,
        },
        {
          id: 'features',
          label: 'Core Features',
          icon: BoltOutline,
          iconSolid: BoltSolid,
        },
        {
          id: 'users',
          label: 'User Stories',
          icon: UsersOutline,
          iconSolid: UsersSolid,
        },
        {
          id: 'reports',
          label: 'Flood Reports',
          icon: DocumentTextOutline,
          iconSolid: DocumentTextSolid,
        },
      ],
    },
    {
      heading: 'Technical',
      items: [
        {
          id: 'architecture',
          label: 'Architecture',
          icon: Square3Stack3DOutline,
          iconSolid: Square3Stack3DSolid,
        },
        {
          id: 'tech-stack',
          label: 'Technology Stack',
          icon: CubeOutline,
          iconSolid: CubeSolid,
        },
        {
          id: 'data-sources',
          label: 'Data Sources',
          icon: CircleStackOutline,
          iconSolid: CircleStackSolid,
        },
        {
          id: 'simulation',
          label: 'Simulation Models',
          icon: ChartBarOutline,
          iconSolid: ChartBarSolid,
        },
      ],
    },
    {
      heading: 'Operations',
      items: [
        {
          id: 'deployment',
          label: 'Deployment',
          icon: ServerOutline,
          iconSolid: ServerSolid,
        },
        {
          id: 'limitations',
          label: 'Limitations',
          icon: ExclamationTriangleOutline,
          iconSolid: ExclamationTriangleSolid,
        },
        {
          id: 'demo',
          label: 'Demonstration',
          icon: PlayOutline,
          iconSolid: PlaySolid,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f1f1f1] px-4">
      <div className="mx-auto pb-5">
        <div className="flex gap-4">
          {/* Sidebar Navigation */}
          <nav className="w-52 flex-shrink-0">
            <div className="sticky">
              <div className="mt-2 mb-4 flex items-center gap-2">
                <div className="flex w-full justify-center rounded-lg border border-[#dfdfdf] bg-white px-5 py-2">
                  <img src="/images/text.png" alt="drAIn" className="h-9" />
                </div>
              </div>
              <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
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
                        <h2 className="mb-2 px-2 text-xs text-gray-400">
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
                                    onClick={() =>
                                      setActiveSection(id as SectionID)
                                    }
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
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="mt-5 flex min-h-[calc(100vh-60px)] flex-1 flex-col">
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
                      {developers.map((dev) => (
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
              {activeSection === 'overview' && (
                <div>
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Overview
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      AI-driven urban flood intelligence — what drAin is and why
                      it matters.
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
                        title: 'AI Clustering',
                        description:
                          'ML identifies vulnerability patterns and weak points in drainage systems',
                        tooltip:
                          'Machine learning identifies vulnerability clusters for drainage components',
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
                        intensifying rainfall, rapid urbanization, and
                        inadequate drainage infrastructure. Existing flood
                        hazard maps show <em>where</em> floods happen but not{' '}
                        <em>why</em>, failing to reveal which specific drainage
                        components are vulnerable.
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
                        <h3 className="text-sm text-slate-900">
                          Core Principles
                        </h3>
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
              )}

              {activeSection === 'architecture' && (
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
              )}

              {activeSection === 'features' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Core Features
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Key capabilities of the platform across map, simulation,
                      and reporting.
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
                          'Dynamic model with real-time adjustments',
                          'Vulnerability classification (No Risk to High)',
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
                            <h3 className="text-foreground text-base">
                              {feature.title}
                            </h3>
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
              )}

              {activeSection === 'tech-stack' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Technology Stack
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Frameworks, libraries, and services powering the
                      application.
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
                        description:
                          'Utility-first CSS framework for rapid UI development',
                        tooltip:
                          'Low-level utility classes for flexible design system',
                      },
                      {
                        icon: Server,
                        title: 'Python FastAPI',
                        description:
                          'High-performance async API framework for backend processing',
                        tooltip:
                          'Modern async framework with automatic API documentation',
                      },
                      {
                        icon: Cloud,
                        title: 'Supabase',
                        description:
                          'Real-time database and authentication backend services',
                        tooltip:
                          'Open-source Firebase alternative with PostgreSQL',
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
                        description:
                          'Next-generation bundler for lightning-fast builds',
                        tooltip:
                          'Incremental bundler written in Rust for ultra-fast compilation',
                      },
                      {
                        icon: Cloud,
                        title: 'Vercel',
                        description:
                          'Serverless deployment platform for frontend hosting',
                        tooltip:
                          'Optimized hosting platform for Next.js and static sites',
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
              )}

              {activeSection === 'data-sources' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Data Sources
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Satellite and field datasets used for modeling and
                      analysis.
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
                        tooltip:
                          'Light Detection and Ranging derived topographic data',
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
                          'Computed flooding predictions for drainage network nodes',
                      },
                      {
                        icon: Database,
                        title: 'Subcatchments',
                        description:
                          'Aggregated subcatchment derived from drainage network spatial data',
                        tooltip:
                          'Watershed delineation for hydrological modeling units',
                      },
                    ]}
                  />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      'Enhanced spatial accuracy with DEM',
                      'Real-world surface characteristics',
                      'Up-to-date precipitation measurements',
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
                        <span className="text-xs text-slate-700">
                          {benefit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'simulation' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Simulation Models
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      SWMM-based static and dynamic flood simulation engines.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] px-6 py-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
                          <Database className="h-4 w-4 text-slate-600" />
                        </div>
                        <h3 className="text-sm text-slate-900">Static Model</h3>
                      </div>
                      <p className="mb-3 text-xs text-slate-700">
                        Pre-simulated rainfall-runoff analysis based on
                        historical data and PAGASA RIDF curves.
                      </p>
                      <div className="space-y-2">
                        {[
                          'Node flooding summaries',
                          'Predicted time to overflow',
                          'Vulnerability classifications',
                          'Multiple rainfall return periods',
                          'Color-coded vulnerability layers',
                        ].map((feature, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2"
                          >
                            <span className="text-xs text-slate-700">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] px-6 py-4">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
                          <Zap className="h-4 w-4 text-slate-600" />
                        </div>
                        <h3 className="text-sm text-slate-900">
                          Dynamic Model
                        </h3>
                      </div>
                      <p className="mb-3 text-xs text-slate-700">
                        Interactive on-demand simulations with real-time
                        parameter adjustments.
                      </p>
                      <div className="space-y-2">
                        {[
                          'Modify rainfall intensity & duration',
                          'Adjust node elevations',
                          'Change conduit dimensions',
                          'Alter flow capacity',
                          'Real-time vulnerability updates',
                          'What-if scenario analysis',
                        ].map((feature, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2"
                          >
                            <span className="text-xs text-slate-700">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <FeatureCards
                    columns={2}
                    features={[
                      {
                        icon: Gauge,
                        title: 'No Risk',
                        description:
                          'Drainage nodes with no predicted flooding under simulated rainfall conditions',
                        tooltip: 'Safe zones with adequate drainage capacity',
                        iconColor: 'text-green-500',
                      },
                      {
                        icon: Gauge,
                        title: 'Low Risk',
                        description:
                          'Minor overflow potential under heavy rainfall with minimal infrastructure impact',
                        tooltip:
                          'Areas requiring monitoring during extreme events',
                        iconColor: 'text-yellow-500',
                      },
                      {
                        icon: Gauge,
                        title: 'Medium Risk',
                        description:
                          'Moderate flooding likelihood requiring drainage improvements and maintenance',
                        tooltip: 'Priority areas for infrastructure upgrades',
                        iconColor: 'text-orange-500',
                      },
                      {
                        icon: Gauge,
                        title: 'High Risk',
                        description:
                          'Critical vulnerability with significant overflow and potential urban damage',
                        tooltip:
                          'Immediate intervention and capacity expansion needed',
                        iconColor: 'text-red-500',
                      },
                    ]}
                  />
                </div>
              )}

              {activeSection === 'users' && (
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
                          'Identify vulnerable drainage components, and prioritize maintenance schedules to optimize infrastructure planning',
                        tooltip:
                          'Efficient planning without manual network inspection',
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
                        tooltip:
                          'Prepare early warnings and allocate emergency resources',
                      },
                      {
                        icon: BarChart3,
                        title: 'Environmental Researcher',
                        description:
                          'Study urban flooding behavior through detailed simulation and analyze correlations between urbanization patterns and vulnerability',
                        tooltip:
                          'Explore correlations between urbanization and vulnerability',
                      },
                      {
                        icon: FileText,
                        title: 'Policy Maker',
                        description:
                          'Review comprehensive visual maps, vulnerability reports, and data-driven evidence for infrastructure and disaster mitigation strategies',
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
              )}

              {activeSection === 'deployment' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Deployment
                    </h2>
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
                        tooltip:
                          'Publicly accessible deployment hosted on Vercel',
                      },
                      {
                        icon: Users,
                        title: 'Test Credentials',
                        description: 'tester@gmail.com (123password)',
                        tooltip:
                          'Use these credentials to explore the platform',
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
                      <p className="mb-3 text-xs text-slate-700">
                        Frontend Deployment
                      </p>
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
                            <span className="text-xs text-slate-700">
                              {item}
                            </span>
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
                      <p className="mb-3 text-xs text-slate-700">
                        Backend Deployment
                      </p>
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
                            <span className="text-xs text-slate-700">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'limitations' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Limitations & Future Work
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Current constraints and planned improvements.
                    </p>
                  </div>

                  <FeatureCards
                    columns={2}
                    features={[
                      {
                        icon: Target,
                        title: 'Simulation Precision',
                        description:
                          'Simplified approach vs high-end software. Enhances efficiency and accessibility.',
                        tooltip:
                          'Trade-off between computational speed and modeling detail',
                      },
                      {
                        icon: Database,
                        title: 'Data Dependency',
                        description:
                          'Accuracy depends on quality of satellite data and drainage information.',
                        tooltip:
                          'Results are only as reliable as the input datasets',
                      },
                      {
                        icon: BarChart3,
                        title: 'Clustering Interpretation',
                        description:
                          'K-means provides relative groupings requiring expert validation.',
                        tooltip:
                          'Vulnerability classifications should be reviewed by domain experts',
                      },
                      {
                        icon: Users,
                        title: 'User Participation',
                        description:
                          'Citizen reporting depends on consistent participation and verified submissions.',
                        tooltip:
                          'Community engagement is essential for accurate field data',
                      },
                    ]}
                  />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      'Refine model parameters',
                      'Improve simulation accuracy',
                      'Enhance decision-support features',
                      'Expand to additional cities',
                      'Integrate real-time sensor data',
                      'Develop mobile applications',
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-lg border border-[#dfdfdf] bg-[#f7f7f7] p-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white">
                          <CheckCircle className="h-4 w-4 text-slate-600" />
                        </div>
                        <span className="text-xs text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'reports' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      Flood Reports
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Historical flood event records and comparison data.
                    </p>
                  </div>
                  <FloodEventCards
                    events={reportEvents}
                    comparisonEvent={comparisonEvent}
                  />
                </div>
              )}

              {activeSection === 'demo' && (
                <div className="space-y-3">
                  <div className="mb-5 ml-2">
                    <h2 className="mb-1 text-xl font-semibold text-gray-900">
                      System Demo
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Video walkthrough of the platform in action.
                    </p>
                  </div>

                  {/* Demo Video Section */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-700">
                    <iframe
                      className="absolute top-0 left-0 h-full w-full"
                      src="https://www.youtube.com/embed/ZHE9dCcayRQ"
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="rounded-b-xl border border-[#dfdfdf] bg-white px-6 py-3.5 text-center text-sm text-gray-600">
              © 2026 drAIn Project. All rights reserved.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Docs() {
  return (
    <Suspense fallback={<div />}>
      <DocsContent />
    </Suspense>
  );
}
