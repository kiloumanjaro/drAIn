/**
 * Static configuration for the /docs page sidebar and contributor avatars.
 *
 * Moved out of `page.tsx` so the route file is shorter and the navigation
 * structure can be edited without touching the renderer.
 */

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
  DocumentTextIcon as DocumentTextSolid,
} from '@heroicons/react/24/solid';

/** Avatar metadata for each contributor shown in the docs header. */
export const DEVELOPERS = [
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

/** All section identifiers selectable in the docs sidebar. */
export type SectionID =
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

/** Grouped navigation entries rendered in the docs sidebar. */
export const SECTION_GROUPS = [
  {
    heading: 'General',
    items: [
      {
        id: 'overview' as SectionID,
        label: 'Overview',
        icon: BookOpenOutline,
        iconSolid: BookOpenSolid,
      },
      {
        id: 'features' as SectionID,
        label: 'Core Features',
        icon: BoltOutline,
        iconSolid: BoltSolid,
      },
      {
        id: 'users' as SectionID,
        label: 'User Stories',
        icon: UsersOutline,
        iconSolid: UsersSolid,
      },
      {
        id: 'reports' as SectionID,
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
        id: 'architecture' as SectionID,
        label: 'Architecture',
        icon: Square3Stack3DOutline,
        iconSolid: Square3Stack3DSolid,
      },
      {
        id: 'tech-stack' as SectionID,
        label: 'Technology Stack',
        icon: CubeOutline,
        iconSolid: CubeSolid,
      },
      {
        id: 'data-sources' as SectionID,
        label: 'Data Sources',
        icon: CircleStackOutline,
        iconSolid: CircleStackSolid,
      },
      {
        id: 'simulation' as SectionID,
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
        id: 'deployment' as SectionID,
        label: 'Deployment',
        icon: ServerOutline,
        iconSolid: ServerSolid,
      },
      {
        id: 'limitations' as SectionID,
        label: 'Limitations',
        icon: ExclamationTriangleOutline,
        iconSolid: ExclamationTriangleSolid,
      },
      {
        id: 'demo' as SectionID,
        label: 'Demonstration',
        icon: PlayOutline,
        iconSolid: PlaySolid,
      },
    ],
  },
] as const;
