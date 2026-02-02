# Component Documentation

Documentation for all React components in the drAIn application.

## Component Organization

Components are organized by domain and purpose:

### UI Components ([components/ui/](../../components/ui/))
Base components from shadcn/ui and Radix UI. These are the building blocks for the application.

**Common UI Components:**
- `button.tsx` - Button component with variants
- `card.tsx` - Card container
- `dialog.tsx` - Modal dialogs
- `form.tsx` - Form wrapper with validation
- `input.tsx` - Text input fields
- `select.tsx` - Dropdown select
- `table.tsx` - Data tables
- `tabs.tsx` - Tabbed interfaces
- `toast.tsx` - Toast notifications

### Feature Components ([components/](../../components/))
Domain-specific components that implement business logic.

## Key Components

### Control Panel

**Location:** [components/control-panel/](../../components/control-panel/)

The Control Panel is a complex feature that manages drainage component data.

**Main Files:**
- `index.tsx` - Main control panel component
- `components/` - Sidebar, top bar, content renderer
- `tabs/` - Different tab views (model selector, reports, chatbot, maintenance)
- `hooks/use-control-panel-state.ts` - State management hook

**Usage:**
```tsx
import ControlPanel from '@/components/control-panel'

<ControlPanel
  inlets={inlets}
  outlets={outlets}
  drains={drains}
  pipes={pipes}
  onFeatureSelect={(feature) => console.log(feature)}
/>
```

**Features:**
- Switch between 4 datasets (inlets, outlets, drains, pipes)
- View detailed parameters for each component
- Submit maintenance reports
- AI chatbot assistance
- Search and filter components

---

### Map Components

#### Report Bubble

**Location:** [components/report-bubble.tsx](../../components/report-bubble.tsx)

Displays flood reports as interactive markers on the map.

**Usage:**
```tsx
import ReportBubble from '@/components/report-bubble'

<ReportBubble
  report={report}
  onClick={() => handleReportClick(report)}
/>
```

**Props:**
- `report` - Report object with location and details
- `onClick` - Handler for when bubble is clicked

#### Flood Prone Toggle

**Location:** [components/flood-prone-toggle.tsx](../../components/flood-prone-toggle.tsx)

Toggle to show/hide flood-prone areas on the map.

**Usage:**
```tsx
import FloodProneToggle from '@/components/flood-prone-toggle'

<FloodProneToggle
  enabled={showFloodZones}
  onToggle={setShowFloodZones}
/>
```

#### Population Toggle

**Location:** [components/population-toggle.tsx](../../components/population-toggle.tsx)

Toggle to show/hide population density overlay.

---

### Dashboard Components

**Location:** [components/dashboard/](../../components/dashboard/)

#### Overview Tab

Displays key metrics and statistics.

**Usage:**
```tsx
import OverviewTab from '@/components/dashboard/overview/OverviewTab'

<OverviewTab />
```

**Features:**
- Stats cards (fixed, pending, average repair time)
- Repair trend chart
- Quick filters by date range

#### Analytics Tab

Advanced analytics and visualizations.

**Features:**
- Component type breakdown
- Team performance metrics
- Geographic distribution

#### Reports Tab

List and manage all reports.

**Features:**
- Filterable report list
- Status updates
- Export to CSV

---

### Visualization Components

#### DataFlow Pipeline

**Location:** [components/data-flow.tsx](../../components/data-flow.tsx)

**Full Documentation:** [DataFlow Component](data-flow-README.md)

Animated SVG pipeline visualization with optional map overlay.

**Usage:**
```tsx
import DataFlowPipeline from '@/components/data-flow'

<DataFlowPipeline
  background
  showMap
  mapOpacity={0.15}
  enableHover
  onPathClick={(pathId) => console.log(pathId)}
/>
```

#### Model Viewer

**Location:** [components/ModelViewer.tsx](../../components/ModelViewer.tsx)

3D visualization using Three.js.

**Usage:**
```tsx
import ModelViewer from '@/components/ModelViewer'

<ModelViewer
  nodes={nodes}
  links={links}
  results={simulationResults}
/>
```

#### Vulnerability Data Table

**Location:** [components/vulnerability-data-table.tsx](../../components/vulnerability-data-table.tsx)

Displays SWMM simulation results in a sortable table.

**Usage:**
```tsx
import VulnerabilityDataTable from '@/components/vulnerability-data-table'

<VulnerabilityDataTable
  data={vulnerabilityData}
  onRowClick={(row) => console.log(row)}
/>
```

---

### Form Components

#### Flood Report Form

**Location:** [app/reports/FloodReportClient.tsx](../../app/reports/FloodReportClient.tsx)

Form for submitting flood reports.

**Usage:**
```tsx
import FloodReportClient from '@/app/reports/FloodReportClient'

<FloodReportClient
  onSuccess={() => router.push('/reports')}
/>
```

**Features:**
- Category selection
- Description textarea
- Image upload with EXIF extraction
- Location selection (GPS or manual)
- Address input

#### Image Uploader

**Location:** [components/image-uploader.tsx](../../components/image-uploader.tsx)

Drag-and-drop image upload component.

**Usage:**
```tsx
import ImageUploader from '@/components/image-uploader'

<ImageUploader
  onImageSelect={(file) => setImage(file)}
  maxSize={5 * 1024 * 1024} // 5MB
/>
```

---

### Authentication Components

#### Login Form

**Location:** [components/auth/login-form.tsx](../../components/auth/login-form.tsx)

User login form with email/password.

**Usage:**
```tsx
import LoginForm from '@/components/auth/login-form'

<LoginForm
  onSuccess={() => router.push('/dashboard')}
/>
```

#### Sign Up Form

**Location:** [components/auth/sign-up-form.tsx](../../components/auth/sign-up-form.tsx)

User registration form.

---

### Navigation Components

#### Sidebar Layout

**Location:** [components/sidebar-layout.tsx](../../components/sidebar-layout.tsx)

Main application layout with collapsible sidebar.

**Usage:**
```tsx
import SidebarLayout from '@/components/sidebar-layout'

<SidebarLayout>
  <YourPageContent />
</SidebarLayout>
```

#### Nav Main

**Location:** [components/nav-main.tsx](../../components/nav-main.tsx)

Main navigation menu items.

#### Nav User

**Location:** [components/nav-user.tsx](../../components/nav-user.tsx)

User profile dropdown with settings and logout.

---

### Context Providers

#### AuthProvider

**Location:** [components/context/AuthProvider.tsx](../../components/context/AuthProvider.tsx)

Manages authentication state.

**Usage:**
```tsx
import { useAuth } from '@/components/context/AuthProvider'

function MyComponent() {
  const { user, profile, signOut } = useAuth()

  if (!user) return <LoginPage />

  return <div>Welcome, {profile?.full_name}</div>
}
```

#### ReportProvider

**Location:** [components/context/ReportProvider.tsx](../../components/context/ReportProvider.tsx)

Manages flood reports with real-time updates.

**Usage:**
```tsx
import { useReports } from '@/components/context/ReportProvider'

function ReportsMap() {
  const { reports, latestReports, loading, refreshReports } = useReports()

  return (
    <Map>
      {reports.map(report => (
        <ReportBubble key={report.id} report={report} />
      ))}
    </Map>
  )
}
```

---

## Component Patterns

### Server vs Client Components

drAIn uses Next.js 15's App Router with React Server Components.

**Server Components** (default):
- Fetch data directly
- No client-side JavaScript
- Better performance

**Client Components** (use 'use client'):
- Interactive features
- Hooks (useState, useEffect)
- Event handlers

Example:
```tsx
// Server Component
export default async function ReportsPage() {
  const reports = await fetchReports()
  return <ReportsList reports={reports} />
}

// Client Component
'use client'
export function ReportsList({ reports }) {
  const [filter, setFilter] = useState('')
  // ... interactive logic
}
```

### Compound Components

Many components follow the compound component pattern:

```tsx
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    Content here
  </DialogContent>
</Dialog>
```

### Custom Hooks

Components often use custom hooks for data fetching:

```typescript
// hooks/useDrain.ts
export function useDrain() {
  const [drains, setDrains] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/drainage/storm_drains.geojson')
      .then(res => res.json())
      .then(data => {
        const transformed = transformGeoJSON(data)
        setDrains(transformed)
      })
      .finally(() => setLoading(false))
  }, [])

  return { drains, loading }
}
```

## Styling Patterns

### Tailwind CSS Classes

Components use Tailwind utility classes:

```tsx
<div className="flex items-center gap-4 p-6 bg-card rounded-lg shadow-sm">
  <h2 className="text-2xl font-bold">Title</h2>
</div>
```

### cn() Utility

Merge classes conditionally:

```tsx
import { cn } from '@/lib/utils'

<button
  className={cn(
    "px-4 py-2 rounded",
    isActive && "bg-blue-500",
    disabled && "opacity-50"
  )}
>
  Click me
</button>
```

### CSS Variables

Theme colors use CSS variables:

```css
.card {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
}
```

## Accessibility

All components follow accessibility best practices:

- Semantic HTML
- ARIA attributes
- Keyboard navigation
- Focus management
- Screen reader support

Example:
```tsx
<button
  aria-label="Close dialog"
  aria-pressed={isOpen}
  onClick={handleClick}
>
  <X className="h-4 w-4" />
</button>
```

## Testing Components

Recommended testing approach:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import ReportBubble from '@/components/report-bubble'

describe('ReportBubble', () => {
  it('renders report details', () => {
    const report = { id: '1', category: 'blockage', description: 'Test' }
    render(<ReportBubble report={report} />)

    expect(screen.getByText('blockage')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<ReportBubble report={report} onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## Performance Optimization

### Memoization

Use React.memo for expensive components:

```tsx
import { memo } from 'react'

const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // Heavy rendering logic
  return <div>{data}</div>
})
```

### Lazy Loading

Dynamically import heavy components:

```tsx
import dynamic from 'next/dynamic'

const ModelViewer = dynamic(
  () => import('@/components/ModelViewer'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

### Virtual Lists

For long lists, use virtualization:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  })

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map(virtualRow => (
        <div key={virtualRow.index}>
          {items[virtualRow.index]}
        </div>
      ))}
    </div>
  )
}
```

## Component Checklist

When creating a new component:

- [ ] Choose correct component type (server/client)
- [ ] Add TypeScript prop types
- [ ] Include JSDoc comments
- [ ] Handle loading and error states
- [ ] Add accessibility attributes
- [ ] Test on mobile devices
- [ ] Optimize performance if needed
- [ ] Document usage examples

---

For more detailed component documentation, see individual component README files in their respective directories.
