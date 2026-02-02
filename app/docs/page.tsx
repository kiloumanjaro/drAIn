'use client';

import React, { useState } from 'react';
import {
  Book,
  Database,
  Layers,
  Zap,
  Users,
  Code,
  GitBranch,
  Server,
  Cloud,
  Map,
  BarChart3,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Play,
} from 'lucide-react';

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

  // Add scrollbar-gutter to body only for this page
  React.useEffect(() => {
    document.body.style.overflowY = 'scroll';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: Book },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'features', label: 'Core Features', icon: Zap },
    { id: 'tech-stack', label: 'Technology Stack', icon: Code },
    { id: 'data-sources', label: 'Data Sources', icon: Database },
    { id: 'simulation', label: 'Simulation Models', icon: BarChart3 },
    { id: 'users', label: 'User Stories', icon: Users },
    { id: 'deployment', label: 'Deployment', icon: Server },
    { id: 'limitations', label: 'Limitations', icon: AlertCircle },
    { id: 'demo', label: 'Demonstration', icon: Play },
  ];

  return (
    <div className="min-h-screen bg-[#e8e8e8]/50">
      <div className="mx-auto w-[1280px] px-4 py-8 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <nav className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-[#ced1cd] bg-white px-6 py-6">
              <h2 className="text-foreground mb-3 px-2 text-sm font-semibold">
                Contents
              </h2>
              <ul className="space-y-1">
                {sections.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <button
                      onClick={() => setActiveSection(id as SectionID)}
                      className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                        activeSection === id
                          ? 'bg-[#3B82F6] font-medium text-white'
                          : 'text-foreground hover:bg-[#f5f5f5]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div className="rounded-xl border border-[#ced1cd] bg-white px-6 py-6">
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-foreground mb-3 text-3xl font-bold">
                      Overview
                    </h2>
                  </div>

                  <div className="prose max-w-none">
                    <p className="text-foreground text-base leading-relaxed md:text-sm">
                      <strong>drAin</strong> is an AI-driven vulnerability
                      ranking and simulation platform that empowers cities to
                      better understand and manage urban flooding. It integrates
                      satellite-derived datasets with drainage network
                      attributes to model stormwater flows under different
                      scenarios.
                    </p>
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                      <BarChart3 className="mb-3 h-8 w-8 text-blue-600" />
                      <h3 className="mb-2 font-semibold text-slate-900">
                        Data-Driven
                      </h3>
                      <p className="text-sm text-slate-600">
                        Powered by satellite data and AI clustering
                      </p>
                    </div>
                    <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
                      <Zap className="mb-3 h-8 w-8 text-purple-600" />
                      <h3 className="mb-2 font-semibold text-slate-900">
                        Interactive
                      </h3>
                      <p className="text-sm text-slate-600">
                        Real-time simulation and scenario testing
                      </p>
                    </div>
                    <div className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
                      <Users className="mb-3 h-8 w-8 text-green-600" />
                      <h3 className="mb-2 font-semibold text-slate-900">
                        Collaborative
                      </h3>
                      <p className="text-sm text-slate-600">
                        Citizen reporting and admin management
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
                    <div className="flex gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                      <div>
                        <h4 className="mb-1 font-semibold text-amber-900">
                          Problem Statement
                        </h4>
                        <p className="text-sm text-amber-800">
                          Mandaue City grapples with chronic urban flooding due
                          to intensifying rainfall, rapid urbanization, and
                          inadequate drainage infrastructure. Existing flood
                          hazard maps show where floods happen but not why,
                          failing to reveal which specific drainage components
                          are vulnerable.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'architecture' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-foreground mb-3 text-3xl font-bold">
                      System Architecture
                    </h2>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <Server className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-2 font-semibold text-slate-900">
                            Frontend Layer
                          </h3>
                          <p className="mb-3 text-sm text-slate-600">
                            Next.js application with Turbopack build
                            optimization, styled with Tailwind CSS
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              Next.js
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              React
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              Tailwind CSS
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                          <Code className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-2 font-semibold text-slate-900">
                            Backend Layer
                          </h3>
                          <p className="mb-3 text-sm text-slate-600">
                            Python FastAPI for simulation processing and
                            Supabase backend services
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              Python FastAPI
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              SWMM
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              K-means ML
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                          <Database className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-2 font-semibold text-slate-900">
                            Data Layer
                          </h3>
                          <p className="mb-3 text-sm text-slate-600">
                            Supabase PostgreSQL database with real-time
                            capabilities
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              Supabase
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              PostgreSQL
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100">
                          <Cloud className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-2 font-semibold text-slate-900">
                            Deployment
                          </h3>
                          <p className="mb-3 text-sm text-slate-600">
                            Distributed deployment across cloud platforms
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              Vercel (Frontend)
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
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
                <div className="space-y-6">
                  <div>
                    <h2 className="text-foreground mb-3 text-3xl font-bold">
                      Core Features
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        title: 'Interactive Map',
                        icon: Map,
                        color: 'blue',
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
                        color: 'purple',
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
                        color: 'green',
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
                        color: 'amber',
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
                        color: 'cyan',
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
                        color: 'emerald',
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
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <button
                          onClick={() => toggleSection(feature.title)}
                          className="flex w-full items-center justify-between bg-white p-5 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 bg-${feature.color}-100 flex items-center justify-center rounded-lg`}
                            >
                              <feature.icon
                                className={`h-5 w-5 text-${feature.color}-600`}
                              />
                            </div>
                            <h3 className="font-semibold text-slate-900">
                              {feature.title}
                            </h3>
                          </div>
                          {expandedSections[feature.title] ? (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                        {expandedSections[feature.title] && (
                          <div className="bg-slate-50 px-5 pb-5">
                            <ul className="space-y-2">
                              {feature.features.map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-slate-700"
                                >
                                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
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
                <div className="space-y-6">
                  <div>
                    <h2 className="text-foreground mb-3 text-3xl font-bold">
                      Technology Stack
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[
                      {
                        category: 'Frontend',
                        tech: 'Next.js',
                        description:
                          'React framework with server-side rendering',
                        color: 'blue',
                      },
                      {
                        category: 'Styling',
                        tech: 'Tailwind CSS',
                        description: 'Utility-first CSS framework',
                        color: 'cyan',
                      },
                      {
                        category: 'Backend',
                        tech: 'Python FastAPI',
                        description: 'High-performance async API framework',
                        color: 'green',
                      },
                      {
                        category: 'Backend Services',
                        tech: 'Supabase',
                        description: 'Real-time database and authentication',
                        color: 'emerald',
                      },
                      {
                        category: 'Database',
                        tech: 'PostgreSQL',
                        description: 'Via Supabase cloud platform',
                        color: 'purple',
                      },
                      {
                        category: 'Build Tool',
                        tech: 'Turbopack',
                        description: 'Next-gen bundler for fast builds',
                        color: 'orange',
                      },
                      {
                        category: 'Frontend Deploy',
                        tech: 'Vercel',
                        description: 'Serverless deployment platform',
                        color: 'slate',
                      },
                      {
                        category: 'Backend Deploy',
                        tech: 'Railway',
                        description: 'Cloud infrastructure for APIs',
                        color: 'pink',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`bg-gradient-to-br from-${item.color}-50 to-${item.color}-100 rounded-xl border p-6 border-${item.color}-200`}
                      >
                        <div className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                          {item.category}
                        </div>
                        <h3 className="mb-1 text-xl font-bold text-slate-900">
                          {item.tech}
                        </h3>
                        <p className="text-sm text-slate-700">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'data-sources' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="mb-3 text-3xl font-bold text-slate-900">
                      Data Sources
                    </h2>
                  </div>

                  <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
                    <p className="text-sm text-blue-900">
                      <strong>Primary Source:</strong> Datasets adapted from
                      Quijano and Bañados (2023) - Integrated flood modeling for
                      urban resilience planning in Mandaue City, Philippines
                    </p>
                  </div>

                  <div className="space-y-3">
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
                        className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <item.icon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 font-semibold text-slate-900">
                            {item.dataset}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {item.source}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                    <h3 className="mb-4 font-semibold text-slate-900">
                      Satellite Data Benefits
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {[
                        'Enhanced spatial accuracy with DEM',
                        'Real-world surface characteristics',
                        'Up-to-date precipitation measurements',
                        'Reduced data collection costs',
                        'Support for continuous model updates',
                      ].map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                          <span className="text-sm text-slate-700">
                            {benefit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'simulation' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-foreground mb-3 text-3xl font-bold">
                      Simulation Models
                    </h2>
                  </div>

                  <p className="text-slate-700">
                    drAin uses the Storm Water Management Model (SWMM) to
                    simulate rainfall-runoff-flooding processes, combined with
                    K-means clustering for vulnerability classification.
                  </p>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
                        <Database className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-slate-900">
                        Static Model
                      </h3>
                      <p className="mb-4 text-sm text-slate-700">
                        Pre-simulated rainfall-runoff analysis based on
                        historical data and PAGASA RIDF curves.
                      </p>
                      <ul className="space-y-2">
                        {[
                          'Node flooding summaries',
                          'Predicted time to overflow',
                          'Vulnerability classifications',
                          'Multiple rainfall return periods',
                          'Color-coded vulnerability layers',
                        ].map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600"></div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-slate-900">
                        Dynamic Model
                      </h3>
                      <p className="mb-4 text-sm text-slate-700">
                        Interactive on-demand simulations with real-time
                        parameter adjustments.
                      </p>
                      <ul className="space-y-2">
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
                            className="flex items-start gap-2 text-sm text-slate-700"
                          >
                            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-600"></div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-300 bg-slate-100 p-6">
                    <h4 className="mb-3 font-semibold text-slate-900">
                      Vulnerability Classification
                    </h4>
                    <p className="mb-4 text-sm text-slate-700">
                      K-means clustering algorithm classifies drainage assets
                      based on:
                    </p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <div className="mx-auto mb-2 h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          No Risk
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <div className="mx-auto mb-2 h-3 w-3 rounded-full bg-yellow-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          Low Risk
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <div className="mx-auto mb-2 h-3 w-3 rounded-full bg-orange-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          Medium Risk
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                        <div className="mx-auto mb-2 h-3 w-3 rounded-full bg-red-500"></div>
                        <span className="text-xs font-medium text-slate-700">
                          High Risk
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'users' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-foreground mb-3 text-3xl font-bold">
                      User Stories
                    </h2>
                  </div>

                  <div className="space-y-4">
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
                        className="rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100">
                            <Users className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="mb-2 text-lg font-bold text-slate-900">
                              {user.role}
                            </h3>
                            <p className="mb-2 text-sm text-slate-700">
                              {user.description}
                            </p>
                            <div className="flex items-start gap-2">
                              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                {user.benefit}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'deployment' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="mb-3 text-3xl font-bold text-slate-900">
                      Deployment
                    </h2>
                  </div>

                  <div className="mb-6 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                    <div className="flex items-start gap-3">
                      <Cloud className="mt-1 h-6 w-6 flex-shrink-0 text-blue-600" />
                      <div>
                        <h3 className="mb-2 font-semibold text-slate-900">
                          Live Demo Access
                        </h3>
                        <p className="mb-3 text-sm text-slate-700">
                          The drAin platform is currently deployed and
                          accessible for testing and demonstration purposes.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">
                              URL:
                            </span>
                            <code className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-blue-600">
                              https://project-drain.vercel.app/
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="mb-4 font-semibold text-slate-900">
                      Test Credentials
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="w-24 text-sm font-medium text-slate-700">
                          Username:
                        </span>
                        <code className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900">
                          tester@gmail.com
                        </code>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-24 text-sm font-medium text-slate-700">
                          Password:
                        </span>
                        <code className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900">
                          123password
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
                          <Server className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-bold text-slate-900">Vercel</h3>
                      </div>
                      <p className="mb-3 text-sm text-slate-700">
                        Frontend Deployment
                      </p>
                      <ul className="space-y-2">
                        {[
                          'Next.js application hosting',
                          'Automatic deployments from Git',
                          'Global CDN distribution',
                          'Serverless functions',
                          'Built with Turbopack',
                        ].map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400"></div>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
                          <Server className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-bold text-slate-900">Railway</h3>
                      </div>
                      <p className="mb-3 text-sm text-slate-700">
                        Backend Deployment
                      </p>
                      <ul className="space-y-2">
                        {[
                          'Python FastAPI hosting',
                          'SWMM simulation processing',
                          'Automated scaling',
                          'Environment management',
                          'Integration with Supabase',
                        ].map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-sm text-slate-600"
                          >
                            <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400"></div>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'limitations' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="mb-3 text-3xl font-bold text-slate-900">
                      Limitations & Future Work
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                        <div>
                          <h3 className="mb-2 font-semibold text-amber-900">
                            Geographic Scope
                          </h3>
                          <p className="text-sm text-amber-800">
                            Currently focused on Mandaue City due to data
                            availability. However, the framework and methodology
                            are scalable and can be adapted to other urban areas
                            with compatible data sources.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                        <div>
                          <h3 className="mb-2 font-semibold text-blue-900">
                            Simulation Precision
                          </h3>
                          <p className="text-sm text-blue-800">
                            Offers a simplified approach compared to high-end
                            hydrodynamic software with detailed 3D
                            visualizations. While this limits precision, it
                            greatly enhances computational efficiency,
                            cost-effectiveness, and accessibility for local
                            governments.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-600" />
                        <div>
                          <h3 className="mb-2 font-semibold text-purple-900">
                            Data Dependency
                          </h3>
                          <p className="text-sm text-purple-800">
                            System accuracy depends on the quality and
                            completeness of satellite data and drainage
                            information available. Incomplete or outdated data
                            may affect simulation reliability.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-600" />
                        <div>
                          <h3 className="mb-2 font-semibold text-cyan-900">
                            Clustering Interpretation
                          </h3>
                          <p className="text-sm text-cyan-800">
                            K-means clustering provides relative vulnerability
                            groupings that require expert interpretation for
                            decision-making. Results should be validated by
                            domain experts.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                        <div>
                          <h3 className="mb-2 font-semibold text-green-900">
                            User Participation
                          </h3>
                          <p className="text-sm text-green-800">
                            Citizen reporting feature depends on consistent user
                            participation and verified data submissions to
                            maintain accuracy and effectiveness.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 rounded-xl border border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                      <GitBranch className="h-5 w-5" />
                      Future Development
                    </h3>
                    <p className="mb-4 text-sm text-slate-700">
                      Further development will involve collaboration with civil
                      and environmental engineering experts to:
                    </p>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {[
                        'Refine model parameters',
                        'Improve simulation accuracy',
                        'Enhance decision-support features',
                        'Expand to additional cities',
                        'Integrate real-time sensor data',
                        'Develop mobile applications',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                          <span className="text-sm text-slate-700">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'demo' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="mb-3 text-3xl font-bold text-slate-900">
                      System Demo
                    </h2>
                  </div>

                  {/* Demo Video Section */}

                  <div
                    className="relative w-full overflow-hidden rounded-xl bg-slate-700 shadow-2xl"
                    style={{ paddingBottom: '56.25%' }}
                  >
                    <iframe
                      className="absolute top-0 left-0 h-full w-full"
                      src="https://www.youtube.com/embed/ZHE9dCcayRQ"
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-slate-600">
              <p>
                Built by Computer Science students from University of the
                Philippines - Cebu
              </p>
              <p className="mt-1">© 2024 drAin Project. All rights reserved.</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
