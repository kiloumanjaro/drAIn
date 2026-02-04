# Technology Stack

Complete breakdown of all technologies, libraries, and tools used in the drAIn project.

## Core Framework

### Next.js 15.5.4

- **Purpose**: Full-stack React framework
- **Features Used**:
  - App Router with React Server Components
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API routes
  - Image optimization
  - File-based routing
- **Why**: Industry-leading performance, excellent DX, strong TypeScript support

### React 19

- **Purpose**: UI library
- **Features Used**:
  - Functional components with hooks
  - Context API for state management
  - Suspense for loading states
  - Concurrent rendering
- **Why**: Industry standard, massive ecosystem, great performance

### TypeScript 5.x

- **Purpose**: Type-safe JavaScript
- **Configuration**: Strict mode enabled
- **Why**: Catches bugs at compile time, better IDE support, improved maintainability

## Styling & UI

### Tailwind CSS 4.1.13

- **Purpose**: Utility-first CSS framework
- **Configuration**: Custom theme in `tailwind.config.js`
- **Plugins**:
  - `@tailwindcss/typography`
  - `tailwindcss-animate`
- **Why**: Rapid development, small bundle size, consistent design system

### Radix UI

- **Purpose**: Headless accessible component primitives
- **Components Used**:
  - Dialog, Dropdown Menu, Select, Tabs
  - Toast, Tooltip, Popover
  - Slider, Switch, Checkbox
  - Accordion, Collapsible
- **Version**: Latest stable
- **Why**: Full keyboard navigation, ARIA compliance, unstyled flexibility

### shadcn/ui

- **Purpose**: Pre-built component library based on Radix
- **Components**: Button, Card, Form, Input, Table, etc.
- **Integration**: Copy-paste components into project
- **Why**: Beautiful defaults, fully customizable, consistent with design system

### Framer Motion 12.23

- **Purpose**: Animation library
- **Features Used**:
  - Page transitions
  - Component animations
  - SVG path animations
  - Gesture handling
- **Why**: Declarative API, great performance, spring physics

## Visualization & Maps

### Mapbox GL 3.15.0

- **Purpose**: Interactive map rendering
- **Features Used**:
  - Vector tile rendering
  - Custom layers and styles
  - 3D terrain
  - Marker clustering
  - Geocoding API
- **Configuration**: Custom map styles in `lib/map/config.ts`
- **Why**: Best-in-class performance, extensive features, beautiful defaults

### Three.js 0.167 + React Three Fiber + Drei

- **Purpose**: 3D visualization
- **Components**:
  - `@react-three/fiber` - React renderer for Three.js
  - `@react-three/drei` - Useful helpers and abstractions
- **Use Cases**:
  - 3D drainage model visualization
  - Simulation result rendering
- **Why**: Industry standard for WebGL, great React integration

### Recharts 2.15.4

- **Purpose**: Chart library
- **Chart Types Used**:
  - Line charts (trends over time)
  - Bar charts (component breakdowns)
  - Pie charts (distributions)
- **Why**: React-first, responsive, good defaults

## Backend & Database

### Supabase 2.58.0

- **Services Used**:
  - PostgreSQL database with PostGIS
  - Authentication (email/password)
  - Real-time subscriptions
  - File storage
  - Row-level security (RLS)
- **Client Libraries**:
  - `@supabase/supabase-js` - Client SDK
  - `@supabase/ssr` - Server-side rendering support
- **Why**: All-in-one backend, real-time built-in, great DX

### PostgreSQL + PostGIS

- **Purpose**: Relational database with spatial extensions
- **Features Used**:
  - Geographic queries (ST_Distance, ST_Contains)
  - GeoJSON support
  - Spatial indexing
- **Why**: Open source, powerful spatial capabilities, scales well

## State Management

### Zustand 5.0.8

- **Purpose**: Lightweight state management
- **Use Cases**:
  - UI state (sidebar open/closed)
  - Filter preferences
  - Temporary form state
- **Why**: Simple API, minimal boilerplate, great TypeScript support

### React Hook Form 7.63

- **Purpose**: Form state management and validation
- **Integration**: Works with Zod schemas
- **Features Used**:
  - Field validation
  - Error handling
  - Form submission
- **Why**: Performant, fewer re-renders, great UX

### Zod 4.1.11

- **Purpose**: Runtime schema validation
- **Use Cases**:
  - Form validation
  - API response validation
  - Type inference
- **Why**: Type-safe, composable schemas, excellent TypeScript inference

## Data Fetching & Utilities

### GeoJSON Processing

- **Libraries**:
  - `@turf/turf` - Spatial analysis
  - `@turf/distance` - Distance calculations
  - `@turf/helpers` - GeoJSON utilities
- **Why**: Powerful geospatial operations in JavaScript

### Date & Time

- **Library**: `date-fns` (implied from usage patterns)
- **Use Cases**: Date formatting, relative time
- **Why**: Lightweight, tree-shakeable, immutable

### Image Processing

- **Library**: `exifreader` 4.32.0
- **Purpose**: Extract EXIF metadata from images
- **Use Cases**: GPS coordinates from photos, camera info
- **Why**: Complete EXIF support, works in browser

## Drag & Drop

### React DnD Kit

- **Libraries**:
  - `@dnd-kit/core` - Core drag-and-drop
  - `@dnd-kit/sortable` - Sortable lists
  - `@dnd-kit/utilities` - Helper functions
- **Use Cases**:
  - Sortable tables
  - Draggable components
- **Why**: Accessibility-focused, touch support, performant

### React Draggable 4.5.0

- **Purpose**: Simple draggable components
- **Use Cases**: Movable dialogs, floating panels
- **Why**: Lightweight, easy to use

## Icons

### Lucide React

- **Purpose**: Icon library
- **Style**: Consistent, minimal, customizable
- **Usage**: Import individual icons
- **Why**: Beautiful design, tree-shakeable, active development

### Tabler Icons

- **Purpose**: Additional icon set
- **Usage**: Supplementary icons not in Lucide
- **Why**: Great selection, consistent style

## AI & Machine Learning

### Google Generative AI

- **Library**: `@google/generative-ai`
- **Purpose**: AI chatbot integration
- **Model**: Gemini
- **Use Cases**: User assistance, natural language queries
- **Why**: Powerful language model, good API

### Custom ML Models (Railway Backend)

- **Framework**: scikit-learn (Python)
- **Models**: K-Means clustering for vulnerability ranking
- **Purpose**: Flood prediction and risk assessment
- **Why**: Industry standard, well-documented

## Simulation

### PySWMM

- **Purpose**: Storm Water Management Model integration
- **Backend**: FastAPI on Railway
- **Language**: Python
- **Use Cases**: Hydraulic simulation, flood modeling
- **Why**: Industry standard for urban drainage modeling

## Development Tools

### Package Manager

- **Tool**: pnpm
- **Version**: Latest
- **Why**: Fast, disk-efficient, strict dependency resolution

### Linting & Formatting

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting (implied)
- **Configuration**: `eslint.config.mjs`
- **Why**: Code quality, consistent style

### Type Checking

- **Tool**: TypeScript compiler
- **Script**: `pnpm typecheck`
- **Configuration**: `tsconfig.json` (strict mode)
- **Why**: Catch type errors before runtime

## Deployment & Hosting

### Vercel

- **Purpose**: Frontend hosting
- **Features**:
  - Edge network CDN
  - Serverless functions
  - Automatic deployments
  - Preview deployments
- **Why**: Created by Next.js team, excellent performance, generous free tier

### Railway

- **Purpose**: Backend hosting (FastAPI + PySWMM)
- **Features**:
  - Docker container hosting
  - Automatic HTTPS
  - Environment variables
- **Why**: Simple deployment, good pricing, Python support

### Supabase Cloud

- **Purpose**: Database and backend services
- **Features**:
  - Managed PostgreSQL
  - Global CDN
  - Automatic backups
- **Why**: Fully managed, scales automatically, built-in auth

## Version Control & CI/CD

### Git

- **Platform**: GitHub
- **Workflow**: Feature branches with PR reviews
- **Protected Branch**: `main`

### GitHub Actions (Planned)

- **Jobs**:
  - Type checking
  - Linting
  - Tests
  - Build verification
- **Triggers**: Push to main, pull requests

## Testing (To Be Implemented)

### Recommended Stack

- **Unit Testing**: Vitest
- **Integration Testing**: Testing Library
- **E2E Testing**: Playwright
- **API Testing**: Supertest or Vitest

## Monitoring & Analytics

### Recommended Tools

- **Error Tracking**: Sentry
- **Analytics**: Vercel Analytics, PostHog
- **Logging**: Axiom, Datadog
- **Performance**: Lighthouse CI

## Security

### Authentication

- **Provider**: Supabase Auth
- **Methods**: Email/password, OAuth (Google, GitHub)
- **Token**: JWT with refresh tokens

### Database Security

- **Row-Level Security**: PostgreSQL RLS policies
- **Encryption**: At-rest and in-transit
- **Backups**: Automated daily backups

## Bundle Size Optimizations

### Code Splitting

- Dynamic imports for heavy libraries (Three.js, Mapbox)
- Route-based splitting via Next.js
- Component-level splitting for large features

### Tree Shaking

- ES modules for all dependencies
- Selective imports (e.g., import specific icons)
- Modern bundling with Turbopack

### Asset Optimization

- Image optimization via Next.js Image
- SVG optimization with SVGO
- Font subsetting

## Environment Variables

### Required Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_RAILWAY_URL=your_railway_url
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
```

## Dependency Management

### Package.json Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit"
}
```

### Update Strategy

- Regular security updates
- Quarterly dependency audits
- Test thoroughly before major version updates
- Use `pnpm update` with caution

## Browser Support

### Target Browsers

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile: iOS Safari 14+, Chrome Android 90+

### Polyfills

- Modern features assumed (ES2020+)
- No IE11 support
- CSS Grid and Flexbox required

## Performance Targets

### Metrics

- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

### Bundle Size

- **Initial JS**: ~200KB gzipped
- **CSS**: ~50KB gzipped
- **Images**: WebP with fallbacks

---

For architecture details, see [System Architecture](SYSTEM_ARCHITECTURE.md).
For data flow, see [Data Flow](DATA_FLOW.md).
