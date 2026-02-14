'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import FeatureCards from '@/components/docs/FeatureCards';
import PrincipleItem from '@/components/docs/PrincipleItem';

const developers = [
  { name: 'Kint Borbano', initials: 'KB', color: 'bg-blue-100 text-blue-700' },
  {
    name: 'Eli Alcaraz',
    initials: 'EA',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    name: 'Christian James',
    initials: 'CJ',
    color: 'bg-violet-100 text-violet-700',
  },
  {
    name: 'Norman Jazul',
    initials: 'NJ',
    color: 'bg-amber-100 text-amber-700',
  },
  { name: 'John Carlo', initials: 'JC', color: 'bg-rose-100 text-rose-700' },
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
  | 'demo';

interface ExpandedSections {
  [key: string]: boolean;
}

export default function Docs() {
  const [activeSection, setActiveSection] = useState<SectionID>('overview');
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

                  <div className="flex -space-x-2">
                    {developers.map((dev) => (
                      <Avatar
                        key={dev.initials}
                        className="h-8 w-8 border-2 border-white"
                        title={dev.name}
                      >
                        <AvatarFallback
                          className={`text-xs font-medium ${dev.color}`}
                        >
                          {dev.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 border-x border-[#dfdfdf] bg-[#fcfcfc] px-8 pt-4 pb-4">
              {activeSection === 'overview' && (
                <div className="space-y-3">
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

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-4">
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

                  <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="overflow-hidden rounded-lg border border-[#dfdfdf] bg-white">
                      <div className="border-b border-[#dfdfdf] bg-[#f7f7f7] px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Our Vision
                        </h3>
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
                        <h3 className="text-sm font-semibold text-slate-900">
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

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <Server className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-slate-900">
                            Frontend Layer
                          </h3>
                          <p className="mb-2 text-xs text-slate-600">
                            Next.js application with Turbopack build
                            optimization, styled with Tailwind CSS
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              Next.js
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              React
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              Tailwind CSS
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                          <Code className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-slate-900">
                            Backend Layer
                          </h3>
                          <p className="mb-2 text-xs text-slate-600">
                            Python FastAPI for simulation processing and
                            Supabase backend services
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              Python FastAPI
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              SWMM
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              K-means ML
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100">
                          <Database className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-slate-900">
                            Data Layer
                          </h3>
                          <p className="mb-2 text-xs text-slate-600">
                            Supabase PostgreSQL database with real-time
                            capabilities
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              Supabase
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              PostgreSQL
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                          <Cloud className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 text-sm font-semibold text-slate-900">
                            Deployment
                          </h3>
                          <p className="mb-2 text-xs text-slate-600">
                            Distributed deployment across cloud platforms
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              Vercel (Frontend)
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-700">
                              Railway (Backend)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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

                  <div className="space-y-1.5">
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
                        className="overflow-hidden rounded-lg border border-slate-200"
                      >
                        <button
                          onClick={() => toggleSection(feature.title)}
                          className="flex w-full items-center justify-between bg-white px-3 py-2 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-100">
                              <feature.icon className="h-3.5 w-3.5 text-slate-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {feature.title}
                            </h3>
                          </div>
                          {expandedSections[feature.title] ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </button>
                        {expandedSections[feature.title] && (
                          <div className="bg-slate-50 px-3 py-2">
                            <ul className="space-y-1">
                              {feature.features.map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-slate-700"
                                >
                                  <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-500" />
                                  <span>{item}</span>
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

                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {[
                      {
                        category: 'Frontend',
                        tech: 'Next.js',
                        description:
                          'React framework with server-side rendering',
                      },
                      {
                        category: 'Styling',
                        tech: 'Tailwind CSS',
                        description: 'Utility-first CSS framework',
                      },
                      {
                        category: 'Backend',
                        tech: 'Python FastAPI',
                        description: 'High-performance async API framework',
                      },
                      {
                        category: 'Backend Services',
                        tech: 'Supabase',
                        description: 'Real-time database and authentication',
                      },
                      {
                        category: 'Database',
                        tech: 'PostgreSQL',
                        description: 'Via Supabase cloud platform',
                      },
                      {
                        category: 'Build Tool',
                        tech: 'Turbopack',
                        description: 'Next-gen bundler for fast builds',
                      },
                      {
                        category: 'Frontend Deploy',
                        tech: 'Vercel',
                        description: 'Serverless deployment platform',
                      },
                      {
                        category: 'Backend Deploy',
                        tech: 'Railway',
                        description: 'Cloud infrastructure for APIs',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="mb-0.5 text-[10px] font-medium text-slate-500">
                          {item.category}
                        </div>
                        <h3 className="mb-0.5 text-sm font-semibold text-slate-900">
                          {item.tech}
                        </h3>
                        <p className="text-xs text-slate-700">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
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

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs text-blue-900">
                      <strong>Primary Source:</strong> Datasets adapted from
                      Quijano and Bañados (2023) - Integrated flood modeling for
                      urban resilience planning in Mandaue City, Philippines
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      {
                        dataset: 'Rainfall',
                        source:
                          'RIDF data from PAGASA via Quijano and Bañados (2023)',
                        icon: Cloud,
                      },
                      {
                        dataset: 'Elevation',
                        source: 'LiDAR derived via Quijano and Bañados (2023)',
                        icon: Map,
                      },
                      {
                        dataset: 'Land Cover',
                        source:
                          'Global Map of Local Climate Zones (Demuzere et al, 2022)',
                        icon: Layers,
                      },
                      {
                        dataset: 'Drainage Network',
                        source: 'Quijano and Bañados (2023)',
                        icon: GitBranch,
                      },
                      {
                        dataset: 'Node Flooding',
                        source: 'SWMM simulation derived',
                        icon: BarChart3,
                      },
                      {
                        dataset: 'Subcatchments',
                        source: 'Aggregated from drainage network data',
                        icon: Database,
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100">
                          <item.icon className="h-3.5 w-3.5 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-0.5 text-sm font-semibold text-slate-900">
                            {item.dataset}
                          </h3>
                          <p className="text-xs text-slate-600">
                            {item.source}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">
                      Satellite Data Benefits
                    </h3>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {[
                        'Enhanced spatial accuracy with DEM',
                        'Real-world surface characteristics',
                        'Up-to-date precipitation measurements',
                        'Reduced data collection costs',
                        'Support for continuous model updates',
                      ].map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-green-600" />
                          <span className="text-xs text-slate-700">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
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

                  <p className="text-xs text-slate-700">
                    drAin uses the Storm Water Management Model (SWMM) to
                    simulate rainfall-runoff-flooding processes, combined with
                    K-means clustering for vulnerability classification.
                  </p>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200">
                          <Database className="h-3.5 w-3.5 text-slate-700" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Static Model
                        </h3>
                      </div>
                      <p className="mb-2 text-xs text-slate-700">
                        Pre-simulated rainfall-runoff analysis based on
                        historical data and PAGASA RIDF curves.
                      </p>
                      <ul className="space-y-0.5">
                        {[
                          'Node flooding summaries',
                          'Predicted time to overflow',
                          'Vulnerability classifications',
                          'Multiple rainfall return periods',
                          'Color-coded vulnerability layers',
                        ].map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700"
                          >
                            <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400"></div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200">
                          <Zap className="h-3.5 w-3.5 text-slate-700" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Dynamic Model
                        </h3>
                      </div>
                      <p className="mb-2 text-xs text-slate-700">
                        Interactive on-demand simulations with real-time
                        parameter adjustments.
                      </p>
                      <ul className="space-y-0.5">
                        {[
                          'Modify rainfall intensity & duration',
                          'Adjust node elevations',
                          'Change conduit dimensions',
                          'Alter flow capacity',
                          'Real-time vulnerability updates',
                          'What-if scenario analysis',
                        ].map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700"
                          >
                            <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400"></div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h4 className="mb-1 text-sm font-semibold text-slate-900">
                      Vulnerability Classification
                    </h4>
                    <p className="mb-2 text-xs text-slate-700">
                      K-means clustering algorithm classifies drainage assets
                      based on:
                    </p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                        <div className="mx-auto mb-1.5 h-2.5 w-2.5 rounded-full bg-green-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          No Risk
                        </span>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                        <div className="mx-auto mb-1.5 h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          Low Risk
                        </span>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                        <div className="mx-auto mb-1.5 h-2.5 w-2.5 rounded-full bg-orange-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          Medium Risk
                        </span>
                      </div>
                      <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                        <div className="mx-auto mb-1.5 h-2.5 w-2.5 rounded-full bg-red-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          High Risk
                        </span>
                      </div>
                    </div>
                  </div>
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

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        role: 'City Engineer',
                        description:
                          'Identify vulnerable drainage components and prioritize maintenance schedules',
                        benefit:
                          'Efficient planning without manual network inspection',
                      },
                      {
                        role: 'Urban Planner',
                        description:
                          'Simulate infrastructure changes and evaluate design scenarios',
                        benefit: 'Ensure flood-resilient city development',
                      },
                      {
                        role: 'Disaster Risk Reduction',
                        description:
                          'Run rainfall simulations to predict overflow areas',
                        benefit:
                          'Prepare early warnings and allocate emergency resources',
                      },
                      {
                        role: 'Environmental Researcher',
                        description:
                          'Study urban flooding behavior through simulation outputs',
                        benefit:
                          'Explore correlations between urbanization and vulnerability',
                      },
                      {
                        role: 'Policy Maker',
                        description:
                          'Review visual maps and vulnerability reports',
                        benefit:
                          'Data-driven evidence for funding and infrastructure decisions',
                      },
                      {
                        role: 'Citizen',
                        description:
                          'Report drainage issues with real-time updates',
                        benefit:
                          'Enhanced situational awareness and faster maintenance response',
                      },
                    ].map((user, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <h3 className="mb-0.5 text-sm font-semibold text-slate-900">
                          {user.role}
                        </h3>
                        <p className="mb-1.5 text-xs text-slate-700">
                          {user.description}
                        </p>
                        <div className="flex items-start gap-1.5">
                          <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
                          <span className="text-xs font-medium text-green-700">
                            {user.benefit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <h3 className="mb-1 text-sm font-semibold text-slate-900">
                        Live Demo Access
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-700">URL:</span>
                        <code className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-blue-600">
                          https://project-drain.vercel.app/
                        </code>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h3 className="mb-1 text-sm font-semibold text-slate-900">
                        Test Credentials
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-700">User:</span>
                          <code className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900">
                            tester@gmail.com
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-700">Pass:</span>
                          <code className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900">
                            123password
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-900">
                          <Server className="h-3.5 w-3.5 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Vercel
                        </h3>
                      </div>
                      <p className="mb-1.5 text-xs text-slate-700">
                        Frontend Deployment
                      </p>
                      <ul className="space-y-0.5">
                        {[
                          'Next.js application hosting',
                          'Automatic deployments from Git',
                          'Global CDN distribution',
                          'Serverless functions',
                          'Built with Turbopack',
                        ].map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-600"
                          >
                            <div className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400"></div>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-purple-600">
                          <Server className="h-3.5 w-3.5 text-white" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          Railway
                        </h3>
                      </div>
                      <p className="mb-1.5 text-xs text-slate-700">
                        Backend Deployment
                      </p>
                      <ul className="space-y-0.5">
                        {[
                          'Python FastAPI hosting',
                          'SWMM simulation processing',
                          'Automated scaling',
                          'Environment management',
                          'Integration with Supabase',
                        ].map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-600"
                          >
                            <div className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-purple-400"></div>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
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

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        title: 'Geographic Scope',
                        text: 'Currently focused on Mandaue City. Framework is scalable to other urban areas.',
                        border: 'border-amber-200',
                        bg: 'bg-amber-50',
                        titleColor: 'text-amber-900',
                        textColor: 'text-amber-800',
                        iconColor: 'text-amber-600',
                      },
                      {
                        title: 'Simulation Precision',
                        text: 'Simplified approach vs high-end software. Enhances efficiency and accessibility.',
                        border: 'border-blue-200',
                        bg: 'bg-blue-50',
                        titleColor: 'text-blue-900',
                        textColor: 'text-blue-800',
                        iconColor: 'text-blue-600',
                      },
                      {
                        title: 'Data Dependency',
                        text: 'Accuracy depends on quality of satellite data and drainage information.',
                        border: 'border-purple-200',
                        bg: 'bg-purple-50',
                        titleColor: 'text-purple-900',
                        textColor: 'text-purple-800',
                        iconColor: 'text-purple-600',
                      },
                      {
                        title: 'Clustering Interpretation',
                        text: 'K-means provides relative groupings requiring expert validation.',
                        border: 'border-cyan-200',
                        bg: 'bg-cyan-50',
                        titleColor: 'text-cyan-900',
                        textColor: 'text-cyan-800',
                        iconColor: 'text-cyan-600',
                      },
                      {
                        title: 'User Participation',
                        text: 'Citizen reporting depends on consistent participation and verified submissions.',
                        border: 'border-green-200',
                        bg: 'bg-green-50',
                        titleColor: 'text-green-900',
                        textColor: 'text-green-800',
                        iconColor: 'text-green-600',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border ${item.border} ${item.bg} p-2.5`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <AlertCircle
                            className={`h-3.5 w-3.5 shrink-0 ${item.iconColor}`}
                          />
                          <h3
                            className={`text-sm font-semibold ${item.titleColor}`}
                          >
                            {item.title}
                          </h3>
                        </div>
                        <p className={`text-xs ${item.textColor}`}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <GitBranch className="h-3.5 w-3.5" />
                      Future Development
                    </h3>
                    <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
                      {[
                        'Refine model parameters',
                        'Improve simulation accuracy',
                        'Enhance decision-support features',
                        'Expand to additional cities',
                        'Integrate real-time sensor data',
                        'Develop mobile applications',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-blue-600" />
                          <span className="text-xs text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
                  <div
                    className="relative w-full overflow-hidden rounded-lg bg-slate-700 shadow-lg"
                    style={{
                      aspectRatio: '16/9',
                      maxHeight: 'calc(100vh - 300px)',
                    }}
                  >
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
            <div className="rounded-b-xl border border-[#dfdfdf] bg-linear-to-b from-[#ffffff] to-[#f3f3f3] px-6 py-3.5 text-center text-sm text-gray-600">
              © 2024 drAin Project. All rights reserved.
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
