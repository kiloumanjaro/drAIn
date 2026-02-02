# Data Flow Architecture

This document explains how data flows through the drAIn system, from user interactions to database updates and real-time synchronization.

## Overview

drAIn uses a multi-layered data flow architecture with real-time capabilities:
- **Client Layer**: React components and hooks
- **State Layer**: Context providers and Zustand stores
- **API Layer**: Supabase client and REST APIs
- **Backend Layer**: PostgreSQL database and external services

## Core Data Flows

### 1. Map Visualization Data Flow

```
Public GeoJSON Files
  (inlets.geojson, pipes.geojson, etc.)
         ↓
  Custom Data Hooks
  (useInlets, usePipes, useDrain, useOutlets)
         ↓
  Transform to TypeScript Objects
  { id, properties, coordinates }
         ↓
  Mapbox GL Layers
  (point, line, fill layers)
         ↓
  Interactive Map Rendering
  (click, hover, select)
         ↓
  Control Panel Updates
  (display selected feature details)
```

**Key Files:**
- [hooks/useDrain.ts](../../hooks/useDrain.ts)
- [hooks/useInlets.ts](../../hooks/useInlets.ts)
- [hooks/useOutlets.ts](../../hooks/useOutlets.ts)
- [hooks/usePipes.ts](../../hooks/usePipes.ts)
- [lib/map/config.ts](../../lib/map/config.ts)
- [app/map/page.tsx](../../app/map/page.tsx)

**Data Transformations:**
```typescript
// Raw GeoJSON
{
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { id: "1", name: "Inlet A", ... }
    }
  ]
}

// Transformed to
{
  id: "1",
  name: "Inlet A",
  coordinates: [lng, lat],
  // ... other properties
}
```

### 2. Flood Report Submission Flow

```
User Fills Report Form
  (FloodReportClient component)
         ↓
  Select Photo + Extract EXIF
  (extractEXIF.ts)
         ↓
  Get GPS Coordinates
  (from EXIF or manual input)
         ↓
  Upload Image to Storage
  (Supabase Storage: ReportImage/)
         ↓
  Insert Report to Database
  (reports table)
         ↓
  Real-time Subscription Trigger
  (Supabase Realtime Channel)
         ↓
  ReportProvider Updates All Clients
  (Context broadcasts new report)
         ↓
  Map Renders New Report Bubble
  (report-bubble.tsx)
```

**Key Files:**
- [app/reports/FloodReportClient.tsx](../../app/reports/FloodReportClient.tsx)
- [lib/report/extractEXIF.ts](../../lib/report/extractEXIF.ts)
- [lib/supabase/report.ts](../../lib/supabase/report.ts)
- [components/context/ReportProvider.tsx](../../components/context/ReportProvider.tsx)
- [components/report-bubble.tsx](../../components/report-bubble.tsx)

**API Call:**
```typescript
// Upload report
await uploadReport({
  category: "blockage",
  description: "Severe flooding on Main St",
  image: File,
  reporter_name: "John Doe",
  status: "pending",
  long: 120.12345,
  lat: 14.12345,
  address: "Main St, City",
  user_id: "uuid"
})
```

**Real-time Subscription:**
```typescript
const channel = supabase
  .channel('reports-changes')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'reports' },
    (payload) => {
      // Broadcast to all subscribed clients
      setReports(prev => [...prev, payload.new])
    }
  )
  .subscribe()
```

### 3. SWMM Simulation Flow

```
User Configures Parameters
  (Node/Link parameters, Rainfall)
         ↓
  Collect Data from Control Panel
  (Model3 component)
         ↓
  Format Simulation Request
  { nodes: [...], links: [...], rainfall: {...} }
         ↓
  POST to Railway API
  (/swmm-simulate endpoint)
         ↓
  PySWMM Runs Simulation
  (Python backend with EPA SWMM)
         ↓
  Return Simulation Results
  { node_results: {...}, link_results: {...} }
         ↓
  Transform to Vulnerability Table
  (transformToNodeDetails)
         ↓
  Display in UI
  (VulnerabilityDataTable, 3D Model)
```

**Key Files:**
- [app/simulation/page.tsx](../../app/simulation/page.tsx)
- [lib/simulation-api/simulation.ts](../../lib/simulation-api/simulation.ts)
- [components/vulnerability-data-table.tsx](../../components/vulnerability-data-table.tsx)
- [components/ModelViewer.tsx](../../components/ModelViewer.tsx)

**Request Format:**
```typescript
interface SimulationRequest {
  nodes: Array<{
    id: string
    inlet_type: string
    max_depth: number
    // ... other node parameters
  }>
  links: Array<{
    id: string
    from_node: string
    to_node: string
    length: number
    // ... other link parameters
  }>
  rainfall: {
    total_precipitation: number
    duration_hours: number
    time_step_minutes: number
  }
}
```

**Response Format:**
```typescript
interface SimulationResponse {
  node_results: {
    [nodeId: string]: {
      max_flooding: number
      total_flooding: number
      peak_inflow: number
      flooding_volume: number
      overflow_duration: number
    }
  }
  link_results: {
    [linkId: string]: {
      peak_flow: number
      max_velocity: number
      max_depth: number
    }
  }
}
```

### 4. Dashboard Analytics Flow

```
Dashboard Page Load
  (dashboard/page.tsx)
         ↓
  Fetch Overview Metrics
  (getOverviewMetrics)
         ↓
  Query Reports Table
  SELECT status, COUNT(*), AVG(repair_time)
  FROM reports
  GROUP BY status
         ↓
  Query Maintenance Tables
  (inlets_maintenance, pipes_maintenance, etc.)
         ↓
  Aggregate Data
  (calculate trends, totals, averages)
         ↓
  Transform for Charts
  (format for Recharts)
         ↓
  Render Dashboard Components
  (StatsCards, RepairTrendChart, etc.)
```

**Key Files:**
- [app/dashboard/page.tsx](../../app/dashboard/page.tsx)
- [lib/dashboard/queries.ts](../../lib/dashboard/queries.ts)
- [lib/dashboard/calculations.ts](../../lib/dashboard/calculations.ts)
- [components/dashboard/overview/OverviewTab.tsx](../../components/dashboard/overview/OverviewTab.tsx)

**Query Examples:**
```typescript
// Get overview metrics
export async function getOverviewMetrics() {
  const { data, error } = await supabase
    .from('reports')
    .select('status, created_at')

  const fixed = data?.filter(r => r.status === 'fixed').length
  const pending = data?.filter(r => r.status === 'pending').length
  const avgRepairTime = calculateAverageRepairTime(data)

  return { fixed, pending, avgRepairTime }
}

// Get repair trend data
export async function getRepairTrendData(days: number) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabase
    .from('reports')
    .select('created_at, status')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })

  // Group by date
  return groupByDate(data)
}
```

### 5. Authentication Flow

```
User Opens Login Page
  (app/(auth)/login/page.tsx)
         ↓
  Enter Email/Password
  (LoginForm component)
         ↓
  Submit to Supabase Auth
  supabase.auth.signInWithPassword()
         ↓
  Receive JWT Token + Session
         ↓
  Store in LocalStorage
  (Supabase SDK handles this)
         ↓
  Fetch User Profile
  (getProfile from profiles table)
         ↓
  Update AuthProvider Context
  (user, session, profile)
         ↓
  Redirect to Dashboard/Map
         ↓
  Protected Routes Check Session
  (middleware validates JWT)
```

**Key Files:**
- [app/(auth)/login/page.tsx](../../app/(auth)/login/page.tsx)
- [components/auth/login-form.tsx](../../components/auth/login-form.tsx)
- [lib/supabase/profile.ts](../../lib/supabase/profile.ts)
- [components/context/AuthProvider.tsx](../../components/context/AuthProvider.tsx)

**Authentication API:**
```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Get session
const { data: { session } } = await supabase.auth.getSession()

// Sign out
await supabase.auth.signOut()
```

## Real-time Data Synchronization

### ReportProvider Real-time Updates

The ReportProvider uses Supabase Realtime to keep all clients synchronized:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('reports-db-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'reports'
      },
      (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            setReports(prev => [...prev, payload.new])
            break
          case 'UPDATE':
            setReports(prev =>
              prev.map(r => r.id === payload.new.id ? payload.new : r)
            )
            break
          case 'DELETE':
            setReports(prev => prev.filter(r => r.id !== payload.old.id))
            break
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

**Benefits:**
- Instant updates across all connected clients
- No polling required
- Automatic reconnection on network issues
- Efficient WebSocket connection

## Data Caching Strategy

### Client-Side Caching

1. **Context Providers**: Cache data in React Context
   - Reports cached in ReportProvider
   - User data cached in AuthProvider
   - Reduces redundant API calls

2. **LocalStorage**: Persist user preferences
   - Theme (dark/light mode)
   - Map settings (zoom, center)
   - Filter selections

3. **SWR/React Query** (Recommended):
   - Automatic revalidation
   - Background refetching
   - Optimistic updates

### Server-Side Caching

1. **Next.js Static Generation**:
   - Pre-render public pages at build time
   - Incremental Static Regeneration (ISR)

2. **Edge Caching**:
   - Vercel Edge Network caches responses
   - CDN for static assets

3. **Database Query Optimization**:
   - Indexed columns for fast lookups
   - Materialized views for complex aggregations

## Error Handling

### API Error Flow

```
API Call Fails
  (Network error, 500, etc.)
         ↓
  Catch in try/catch
         ↓
  Log Error
  (console.error or Sentry)
         ↓
  Display User-Friendly Message
  (Toast notification)
         ↓
  Offer Retry Option
  (Retry button)
         ↓
  Fallback to Cached Data
  (if available)
```

**Example:**
```typescript
async function fetchReports() {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    toast.error('Failed to load reports. Please try again.')
    return cachedReports // Fallback
  }
}
```

## Data Validation Flow

```
User Input
  (Form field)
         ↓
  Client-Side Validation
  (Zod schema + React Hook Form)
         ↓
  Display Inline Errors
  (Field-level error messages)
         ↓
  Submit to API
  (if validation passes)
         ↓
  Server-Side Validation
  (API route validates again)
         ↓
  Database Constraints
  (NOT NULL, UNIQUE, CHECK, etc.)
         ↓
  Return Success/Error
         ↓
  Update UI
```

**Zod Schema Example:**
```typescript
const reportSchema = z.object({
  category: z.enum(['blockage', 'overflow', 'damage']),
  description: z.string().min(10).max(500),
  image: z.instanceof(File).optional(),
  long: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90)
})
```

## Performance Optimizations

### 1. Lazy Loading
- Dynamic imports for heavy components
- Load Mapbox/Three.js only when needed
- Route-based code splitting

### 2. Debouncing/Throttling
- Search input debounced (300ms)
- Map move events throttled
- Reduce API calls

### 3. Pagination
- Load reports in batches (50 per page)
- Infinite scroll for long lists
- Reduces initial load time

### 4. Optimistic Updates
- Update UI immediately
- Sync with server in background
- Rollback on error

## Data Flow Diagrams

### Complete System Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React Components (Map, Dashboard, Reports, Sim)     │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↕                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Context Providers (Auth, Reports, Navigation)        │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↕                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Custom Hooks (useDrain, useInlets, useReports)      │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↕                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Clients (Supabase, Railway, Mapbox)             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Supabase    │  │  Railway     │  │  Mapbox      │      │
│  │  - Database  │  │  - SWMM API  │  │  - Maps      │      │
│  │  - Storage   │  │  - ML Models │  │  - Geocoding │      │
│  │  - Realtime  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

For more details on the architecture, see [System Architecture](SYSTEM_ARCHITECTURE.md).
For API documentation, see [API Documentation](../api/).
