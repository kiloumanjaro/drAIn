# System Architecture

## Overview

drAIn is a modern full-stack web application built with Next.js 15, featuring real-time data synchronization, 3D visualization, and AI-powered flood prediction. The system integrates multiple technologies to provide a comprehensive urban drainage management platform.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Next.js 15 Application (React 19)            │   │
│  │  ┌────────────┐  ┌──────────┐  ┌─────────────────┐  │   │
│  │  │ Map View   │  │Dashboard │  │ Simulation UI   │  │   │
│  │  │ (Mapbox)   │  │ (Charts) │  │ (Three.js 3D)  │  │   │
│  │  └────────────┘  └──────────┘  └─────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend Services & Data Layer                   │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Supabase     │  │  Railway     │  │   Mapbox GL    │  │
│  │  - PostgreSQL  │  │  - SWMM API  │  │  - Map Tiles   │  │
│  │  - Auth        │  │  - ML Models │  │  - Geocoding   │  │
│  │  - Storage     │  │  - FastAPI   │  │                │  │
│  │  - Realtime    │  │              │  │                │  │
│  └────────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Application Structure

### Frontend Architecture (Next.js App Router)

```
app/
├── layout.tsx              # Root layout with providers
├── providers.tsx           # Context providers setup
├── page.tsx               # Landing page
├── (auth)/                # Authentication routes
│   ├── login/
│   └── signup/
├── map/                   # Interactive map interface
├── dashboard/             # Analytics dashboard
├── simulation/            # SWMM simulation interface
├── reports/              # Flood reporting system
└── api/                  # API routes
    ├── reports/
    └── closestPipe/
```

### Component Architecture

**Three-Layer Component Structure:**

1. **UI Layer** (`components/ui/`)
   - Base components from shadcn/ui and Radix UI
   - Form controls, buttons, dialogs, tables
   - Reusable, accessible primitives

2. **Feature Layer** (`components/`)
   - Domain-specific components
   - Control Panel, Map Visualizations, Report Forms
   - Business logic integration

3. **Layout Layer** (`components/`)
   - Navigation, Sidebar, Headers
   - Page structure and routing

### State Management

**Context Providers:**
- `AuthProvider` - User authentication and session management
- `ReportProvider` - Real-time report data with caching
- `NavigationLoadingProvider` - Page transition states
- `EventWidgetProvider` - Event notification system

**Local State:**
- Zustand for component-level state
- React Hook Form for form state
- Custom hooks for data fetching (useInlets, usePipes, etc.)

## Data Architecture

### Database Schema (Supabase/PostgreSQL)

**Core Tables:**

```sql
-- User profiles
profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  created_at TIMESTAMP
)

-- Flood reports
reports (
  id UUID PRIMARY KEY,
  category TEXT,
  description TEXT,
  image TEXT,
  reporter_name TEXT,
  status TEXT,
  component_id TEXT,
  long DECIMAL,
  lat DECIMAL,
  address TEXT,
  geocoded_status TEXT,
  created_at TIMESTAMP,
  user_id UUID REFERENCES profiles(id)
)

-- Maintenance records
inlets_maintenance (...)
outlets_maintenance (...)
drains_maintenance (...)
pipes_maintenance (...)
```

**Storage Buckets:**
- `ReportImage/` - User-uploaded report photos
- `Avatars/` - User profile avatars

### GeoJSON Data

Static drainage infrastructure data stored in `public/drainage/`:
- `inlets.geojson` - Storm drain inlets
- `outlets.geojson` - Drainage outlets
- `storm_drains.geojson` - Storm drain structures
- `man_pipes.geojson` - Pipe network

Each loaded via custom hooks (useInlets, usePipes, etc.)

## Integration Architecture

### External Services

1. **Supabase (Primary Backend)**
   - PostgreSQL database with PostGIS extension
   - Real-time subscriptions for live updates
   - Authentication (email/password, OAuth)
   - File storage with CDN

2. **Railway (Simulation Backend)**
   - FastAPI application
   - SWMM (Storm Water Management Model) integration
   - Machine learning prediction models
   - Python/PySWMM runtime

3. **Mapbox GL**
   - Vector tile rendering
   - Interactive map controls
   - Geocoding and reverse geocoding

4. **Google Generative AI**
   - AI chatbot for user assistance
   - Natural language query processing

### API Communication Flow

```
Client Component
    ↓
Custom Hook (e.g., useReports)
    ↓
API Client (lib/supabase/client.ts)
    ↓
Supabase SDK
    ↓
PostgreSQL Database
    ↓
Real-time Channel (WebSocket)
    ↓
Context Provider Update
    ↓
Component Re-render
```

## Feature Modules

### 1. Map Visualization Module

**Files:**
- `app/map/page.tsx` - Main map page
- `lib/map/config.ts` - Mapbox configuration
- `components/report-bubble.tsx` - Report markers

**Flow:**
1. Load GeoJSON data via hooks
2. Initialize Mapbox with config
3. Add layers for inlets, pipes, outlets, drains
4. Subscribe to real-time reports
5. Render report bubbles on map
6. Handle user interactions (click, hover)

### 2. Simulation Module

**Files:**
- `app/simulation/page.tsx` - Simulation UI
- `lib/simulation-api/simulation.ts` - API client
- `components/ModelViewer.tsx` - 3D visualization

**Flow:**
1. User configures node/link parameters
2. Set rainfall scenario
3. Call Railway SWMM API
4. Transform results to vulnerability table
5. Display metrics and 3D model
6. Export results

### 3. Reporting Module

**Files:**
- `app/reports/page.tsx` - Report listing
- `components/FloodReportClient.tsx` - Report form
- `lib/supabase/report.ts` - Report API

**Flow:**
1. User fills report form with photo
2. Extract EXIF metadata from image
3. Upload image to Supabase storage
4. Insert report to database
5. Real-time subscription broadcasts update
6. All connected clients receive new report

### 4. Dashboard Module

**Files:**
- `app/dashboard/page.tsx` - Dashboard page
- `lib/dashboard/queries.ts` - Data queries
- `components/dashboard/` - Tab components

**Flow:**
1. Load overview metrics from database
2. Aggregate maintenance records
3. Calculate trends and statistics
4. Render charts and stats cards
5. Filter by date range or component type

## Security Architecture

### Authentication & Authorization

- Supabase Auth for user management
- JWT tokens for API authentication
- Row-level security (RLS) policies in PostgreSQL
- Protected routes with middleware

### Data Validation

- Zod schemas for runtime type checking
- React Hook Form validation
- Server-side validation in API routes
- SQL injection prevention via parameterized queries

### File Upload Security

- File type validation (images only)
- Size limits enforced
- Secure storage bucket policies
- Signed URLs for temporary access

## Performance Optimizations

### Frontend

1. **Code Splitting**
   - Dynamic imports for heavy components
   - Route-based chunking via Next.js

2. **Image Optimization**
   - Next.js Image component
   - Lazy loading with blur placeholders
   - Responsive images

3. **Caching**
   - SWR for data fetching
   - React Query for server state
   - LocalStorage for user preferences

4. **Rendering**
   - Server Components where possible
   - Client Components only when needed
   - Streaming with Suspense boundaries

### Backend

1. **Database**
   - Indexes on frequently queried columns
   - Materialized views for analytics
   - Connection pooling

2. **API**
   - Edge functions for low latency
   - CDN for static assets
   - Rate limiting on endpoints

## Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│              Vercel Edge Network                  │
│  ┌──────────────────────────────────────────┐   │
│  │        Next.js Application                │   │
│  │  - Static generation (SSG)               │   │
│  │  - Server-side rendering (SSR)           │   │
│  │  - API routes                             │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ↓                        ↓
┌───────────────┐        ┌──────────────┐
│   Supabase    │        │   Railway    │
│   (Cloud)     │        │   (Cloud)    │
└───────────────┘        └──────────────┘
```

**Hosting:**
- Frontend: Vercel (Edge Network, Serverless Functions)
- Database: Supabase Cloud (PostgreSQL + PostGIS)
- Simulation API: Railway (Docker containers)

**CI/CD:**
- GitHub Actions for automated testing
- Automatic deployments on push to main
- Preview deployments for pull requests

## Scalability Considerations

### Current Scale
- Support for hundreds of concurrent users
- Thousands of reports and maintenance records
- Real-time updates across clients

### Future Scaling
- Database read replicas for high-traffic queries
- Redis caching layer for frequently accessed data
- Message queue for async processing
- Microservices for simulation workloads

## Monitoring & Observability

- Vercel Analytics for performance metrics
- Supabase logs for database queries
- Error tracking with Sentry (recommended)
- Custom logging in API routes

## Technology Choices & Rationale

| Technology | Why Chosen |
|------------|------------|
| Next.js 15 | Server components, App Router, excellent DX |
| TypeScript | Type safety, better tooling, fewer runtime errors |
| Supabase | Real-time capabilities, PostgreSQL, auth built-in |
| Mapbox GL | Superior performance, vector tiles, extensive API |
| Three.js | 3D visualization for drainage models |
| Tailwind CSS | Rapid UI development, consistent design system |
| Radix UI | Accessible primitives, headless components |

## Future Architecture Plans

1. **Microservices Split**
   - Separate simulation service
   - Dedicated ML inference service
   - Background job processor

2. **Enhanced Real-time**
   - WebRTC for peer-to-peer features
   - Operational transforms for collaborative editing

3. **Mobile Applications**
   - React Native app for field reporting
   - Progressive Web App (PWA) support

4. **Advanced Analytics**
   - Data warehouse for historical analysis
   - Machine learning pipeline automation
   - Predictive maintenance models

---

For more details on specific components, see the [Components Documentation](../components/).
