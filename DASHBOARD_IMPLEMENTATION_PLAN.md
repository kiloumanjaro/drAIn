# drAIn Public Dashboard Implementation Plan

**REVISED:** Single public dashboard page combining transparency, analytics, and all reports

**Project:** drAIn Drainage Management System
**Framework:** Next.js 15.5.3 + TypeScript + Supabase
**Date Created:** 2025-11-21
**Last Updated:** 2025-11-21

---

## Table of Contents

1. [Overview](#overview)
2. [Dashboard Structure](#dashboard-structure)
3. [Database Schema Changes](#database-schema-changes)
4. [Component Architecture](#component-architecture)
5. [Implementation Steps](#implementation-steps)
6. [Data Fetching Patterns](#data-fetching-patterns)
7. [Dashboard Layout & Tabs](#dashboard-layout--tabs)

---

## Overview

### Core Concept
**ONE public dashboard page** (`/dashboard`) accessible to everyone (no auth required) that combines:
- Public transparency metrics (Overview tab)
- Analytics with GeoJSON overlays (Analytics tab)
- All reports with priority management (All Reports tab)
- All organized in tabs on a single page

### Access Control
- **PUBLIC** - No authentication required
- Everyone can view all data
- No admin-only sections
- Builds public trust through transparency

---

## Dashboard Structure

### Route
- **Path:** `app/dashboard/page.tsx`
- **Access:** Public (no auth check)
- **Styling:** Matches existing `/docs` and `/about` pages

### Three Tabs

#### **Tab 1: Overview (Public Transparency)**
Displays basic performance metrics to build trust

**Metrics:**
- **Issues Fixed This Month:** Count of resolved reports in current month
- **Pending Issues:** Count of pending reports
- **Average Repair Time:** Days between `created_at` and `last_cleaned_at`
  - Calculation: Join reports with maintenance records
  - Formula: `(maintenance.last_cleaned_at - report.created_at) / (1000 * 60 * 60 * 24)`
- **Repair Time Trend Chart:** Line chart showing avg repair time for last 30 days (Recharts)

**Components:**
- `OverviewTab.tsx` - Main container
- `StatsCards.tsx` - Display metric cards
- `RepairTrendChart.tsx` - Recharts line chart

---

#### **Tab 2: Analytics**
Detailed operational analytics visible to all

**Sections:**

**1. Issues Per Zone (GeoJSON Map)**
- Load: `public/additional-overlays/mandaue_population.geojson`
- Extract zone from report's `address` field
- Match to barangay names (29 total)
- Display: Mapbox map with GeoJSON polygons
- Badge on each polygon showing issue count
- Interactive - hover for details

**2. Repair Time By Component Type**
- Metric cards showing average repair days per component:
  - Inlets
  - Outlets
  - Storm Drains
  - Manhole Pipes
- Calculated: `AVG(last_cleaned_at - created_at)` grouped by component type

**3. Most Common Component Type Problems**
- Pie chart (Recharts)
- Shows distribution of issues by component type:
  - % Inlets
  - % Outlets
  - % Storm Drains
  - % Pipes
- NOT by report category (which is free-text)

**4. Team Performance Metrics**
- Table showing agency performance
- Columns: Agency Name | Total Issues | Resolved | Average Days
- Data-driven only (no subjective analysis)
- Sort by average days or resolved count

**Components:**
- `AnalyticsTab.tsx` - Main container
- `ZoneMap.tsx` - Mapbox + GeoJSON
- `ComponentTypeChart.tsx` - Pie chart
- `RepairTimeCards.tsx` - Metric cards
- `TeamTable.tsx` - Performance table

---

#### **Tab 3: All Reports**
Public list of all drainage reports with priority management

**Features:**
- Display all reports in grid/list layout
- Show for each report:
  - Report image (existing field)
  - Location/address
  - Component type badge (inlet, outlet, etc.)
  - Priority badge (color-coded: low, medium, high, critical)
  - Status badge (pending, in-progress, resolved)
  - Date submitted
  - Description
  - Completion photos (if resolved)

**Filters:**
- Priority: All, Critical, High, Medium, Low
- Status: All, Pending, In Progress, Resolved
- Component Type: All, Inlets, Outlets, Storm Drains, Pipes

**Sorting:**
- Date (newest first)
- Priority (critical first)

**Components:**
- `ReportsTab.tsx` - Main container
- `ReportCard.tsx` - Individual report card
- `ReportFilters.tsx` - Filter UI
- `PriorityBadge.tsx` - Color-coded badge
- `ImageGallery.tsx` - Report + completion photos

---

## Database Schema Changes

### Add Columns to `reports` Table

```sql
-- Priority system (manual assignment, no auto-escalation)
ALTER TABLE reports
ADD COLUMN priority TEXT
  CHECK (priority IN ('low', 'medium', 'high', 'critical'))
  DEFAULT 'low';

-- Zone for GeoJSON matching
ALTER TABLE reports
ADD COLUMN zone VARCHAR(255);

-- Indices for performance
CREATE INDEX idx_reports_priority ON reports(priority);
CREATE INDEX idx_reports_zone ON reports(zone);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_component_id ON reports(component_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
```

### Assume Already Exists

✅ `completion_photos` field in maintenance tables (already implemented)
✅ Report `image` field (already implemented)
✅ Maintenance `last_cleaned_at` field (already implemented)

### No Longer Needed

❌ `resolved_at` in reports (use maintenance `last_cleaned_at` via join)
❌ `duplicate_count` (no auto-escalation)
❌ Auto-escalation triggers

---

## Component Architecture

### Directory Structure

```
app/
└── dashboard/
    └── page.tsx                          # Main public dashboard

components/
└── dashboard/
    ├── DashboardTabs.tsx                 # Tab navigation wrapper
    │
    ├── overview/                         # Tab 1: Overview
    │   ├── OverviewTab.tsx
    │   ├── StatsCards.tsx
    │   └── RepairTrendChart.tsx
    │
    ├── analytics/                        # Tab 2: Analytics
    │   ├── AnalyticsTab.tsx
    │   ├── ZoneMap.tsx                   # Mapbox + GeoJSON
    │   ├── ComponentTypeChart.tsx        # Pie chart
    │   ├── RepairTimeCards.tsx
    │   └── TeamTable.tsx
    │
    └── reports/                          # Tab 3: All Reports
        ├── ReportsTab.tsx
        ├── ReportCard.tsx
        ├── ReportFilters.tsx
        ├── PriorityBadge.tsx
        └── ImageGallery.tsx

lib/
└── dashboard/
    ├── queries.ts                        # All Supabase queries
    ├── calculations.ts                   # Repair time logic
    └── geojson.ts                        # Zone extraction
```

### Component Specifications

#### DashboardTabs.tsx
```typescript
interface TabConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

// Handles tab navigation and switching
// Matches /docs and /about styling
```

#### StatsCards.tsx
```typescript
interface Metric {
  label: string;
  value: number | string;
  unit?: string;
  icon?: React.ReactNode;
}

// Displays: Fixed, Pending, Average Days
// Loading states with skeleton loaders
```

#### RepairTrendChart.tsx
```typescript
// Recharts line chart
// X-axis: Date (last 30 days)
// Y-axis: Average repair days
// Shows trend over time
```

#### ZoneMap.tsx
```typescript
// Mapbox GL map
// Loads mandaue_population.geojson
// Renders polygons for each barangay
// Overlays count badges on each zone
// Interactive hover/click
```

#### ComponentTypeChart.tsx
```typescript
// Recharts pie chart
// Data: Inlets, Outlets, Storm Drains, Pipes
// Shows percentage distribution
```

#### RepairTimeCards.tsx
```typescript
// Cards showing average repair days by component type
// 4 cards: Inlets | Outlets | Storm Drains | Pipes
// Calculated from joined data
```

#### TeamTable.tsx
```typescript
// Sortable table
// Columns: Agency Name | Total | Resolved | Avg Days
// Sort by column click
// Data-driven only
```

#### ReportCard.tsx
```typescript
interface ReportDisplay {
  id: string;
  image: string;
  address: string;
  componentType: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'resolved';
  created_at: string;
  description: string;
  completionPhotos?: string[];  // Completion proof images
}

// Grid layout with report details
// Images displayed in gallery
```

#### PriorityBadge.tsx
```typescript
// Color-coded badge
// 🔴 Critical (red-600)
// 🟠 High (orange-600)
// 🟡 Medium (yellow-600)
// ⚪ Low (gray-500)
```

---

## Implementation Steps

### Phase 1: Database Setup (1 hour)

1. Add columns to `reports` table:
   - `priority` (default 'low')
   - `zone` (varchar)
2. Create indices for performance
3. Verify changes in Supabase

### Phase 2: Dashboard Page Structure (2 hours)

1. Create `app/dashboard/page.tsx`
2. Add scrollbar management effect
3. Create tab navigation layout
4. Match styling with `/docs` and `/about`
5. Test public access (no auth)

### Phase 3: Tab 1 - Overview (3 hours)

1. Create `OverviewTab.tsx`
2. Create `StatsCards.tsx` for metrics display
3. Implement repair time calculation:
   - Query reports and join with maintenance
   - Calculate `last_cleaned_at - created_at`
4. Create `RepairTrendChart.tsx`:
   - Recharts line chart
   - Data for last 30 days
   - Grouped by date
5. Test all metrics with sample data

### Phase 4: Tab 2 - Analytics (5-6 hours)

**Most complex phase**

1. Create `AnalyticsTab.tsx` container
2. **Implement ZoneMap:**
   - Load GeoJSON from `public/additional-overlays/mandaue_population.geojson`
   - Create zone extraction function (match address to barangay)
   - Setup Mapbox with GeoJSON layer
   - Count reports per zone
   - Add badge overlays with counts
   - Interactive tooltips

3. **Component Type Analysis:**
   - Determine component type from `component_id` (prefix or lookup)
   - Count reports by component type
   - Create `ComponentTypeChart.tsx` (pie chart)
   - Create `RepairTimeCards.tsx` (metric cards)

4. **Team Performance:**
   - Query agencies with maintenance data
   - Calculate metrics per agency
   - Create `TeamTable.tsx`
   - Implement sorting

### Phase 5: Tab 3 - All Reports (3-4 hours)

1. Create `ReportsTab.tsx` container
2. Fetch all reports with images
3. Create `ReportCard.tsx`:
   - Display image
   - Show all metadata
   - Priority badge
   - Status badge
   - Component type
4. Create `ReportFilters.tsx`:
   - Priority filter (select)
   - Status filter (select)
   - Component type filter (select)
   - Filter logic (client-side)
5. Create sorting UI
6. Test with sample reports

### Phase 6: Utilities & Helpers (1-2 hours)

1. Create `lib/dashboard/queries.ts`:
   - `getOverviewMetrics()` - Fixed, pending counts
   - `getRepairTrendData()` - 30-day trend
   - `getIssuesPerZone()` - Zone counts
   - `getComponentTypeData()` - Distribution
   - `getRepairTimeByComponent()` - Avg days
   - `getTeamPerformance()` - Agency metrics
   - `getAllReports()` - Full reports list

2. Create `lib/dashboard/calculations.ts`:
   - `calculateRepairDays()` - Maintenance subtract logic
   - `calculateAverageDays()` - For metrics
   - `calculateTrendData()` - Date grouping

3. Create `lib/dashboard/geojson.ts`:
   - `extractZoneFromAddress()` - Address parsing
   - Barangay name list
   - Matching logic

### Phase 7: Polish & Testing (2 hours)

1. Loading states (skeleton loaders)
2. Empty states (no data messages)
3. Error handling
4. Responsive design (desktop/tablet/mobile)
5. Performance optimization
6. Accessibility checks
7. Verify public access

---

## Data Fetching Patterns

### Overview Metrics

```typescript
// Issues fixed this month
SELECT COUNT(*) as fixed_count
FROM reports
WHERE status = 'resolved'
AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

// Pending issues
SELECT COUNT(*) as pending_count
FROM reports
WHERE status = 'pending';

// Average repair time (all resolved)
SELECT AVG(EXTRACT(DAY FROM m.last_cleaned_at - r.created_at)) as avg_days
FROM reports r
JOIN {maintenance_table} m ON r.component_id = m.{id_column}
WHERE r.status = 'resolved' AND m.status = 'resolved';
```

### Repair Time Trend (30 days)

```typescript
SELECT
  DATE(r.created_at) as date,
  AVG(EXTRACT(DAY FROM m.last_cleaned_at - r.created_at)) as avg_days
FROM reports r
JOIN {maintenance_table} m ON r.component_id = m.{id_column}
WHERE r.created_at >= NOW() - INTERVAL '30 days'
  AND r.status = 'resolved'
GROUP BY DATE(r.created_at)
ORDER BY date;
```

### Issues Per Zone

```typescript
SELECT
  r.zone,
  COUNT(*) as count
FROM reports r
WHERE r.status IN ('pending', 'in-progress', 'resolved')
GROUP BY r.zone
ORDER BY count DESC;
```

### Component Type Analysis

```typescript
-- Determine component type from component_id
-- Reports with inlets start with inlet prefix
-- Outlets start with outlet prefix, etc.

SELECT
  CASE
    WHEN r.component_id LIKE 'inlet_%' THEN 'inlets'
    WHEN r.component_id LIKE 'outlet_%' THEN 'outlets'
    WHEN r.component_id LIKE 'drain_%' THEN 'storm_drains'
    WHEN r.component_id LIKE 'pipe_%' THEN 'man_pipes'
  END as component_type,
  COUNT(*) as count
FROM reports r
GROUP BY component_type;

-- Average repair time by component type
SELECT
  component_type,
  AVG(EXTRACT(DAY FROM m.last_cleaned_at - r.created_at)) as avg_days
FROM reports r
JOIN {maintenance_table} m ON ...
WHERE r.status = 'resolved'
GROUP BY component_type;
```

### Team Performance

```typescript
SELECT
  a.name as agency_name,
  COUNT(r.id) as total_issues,
  COUNT(CASE WHEN r.status = 'resolved' THEN 1 END) as resolved_count,
  AVG(EXTRACT(DAY FROM m.last_cleaned_at - r.created_at)) as avg_days
FROM agencies a
LEFT JOIN {maintenance_table} m ON a.id = m.agency_id
LEFT JOIN reports r ON m.addressed_report_id = r.id
WHERE r.status = 'resolved'
GROUP BY a.name
ORDER BY avg_days;
```

### All Reports

```typescript
SELECT
  r.*,
  r.image,
  r.priority,
  r.status,
  r.component_id
FROM reports r
ORDER BY r.created_at DESC;

-- With completion photos (assuming json field)
-- Fetch maintenance records with completion_photos
```

---

## Dashboard Layout & Tabs

### Visual Structure

```
┌──────────────────────────────────────────────────────────┐
│  drAIn Public Dashboard                                  │
│  Real-time Transparency & Analytics                     │
│  [Overview] [Analytics] [All Reports]  ← Tabs (Public)   │
└──────────────────────────────────────────────────────────┘

TAB 1: OVERVIEW
┌──────────────┬──────────────┬──────────────────┐
│ 📊 Fixed     │ 📋 Pending   │ ⏱️  Avg Time     │
│ This Month   │ Issues       │ To Repair        │
│ 45           │ 12           │ 2.3 days         │
└──────────────┴──────────────┴──────────────────┘
┌────────────────────────────────────────────────┐
│ Repair Time Trend (Last 30 Days)              │
│ 📈 Line Chart                                  │
│   4.0 |           ┌─────┐                     │
│   3.5 |    ┌──────┘     └──┐                  │
│   3.0 |    │               └────┐             │
│   2.5 |────┤                    └──┐          │
│       └────┴──────────────────────┘          │
│        Day 1  Day 15        Day 30           │
└────────────────────────────────────────────────┘

TAB 2: ANALYTICS
┌────────────────────────────────────────────────┐
│ Issues Per Zone (Barangay Breakdown)          │
│ [Mapbox Map with GeoJSON Polygons]            │
│ Bakilid: 8  Centro: 12  Casili: 5             │
└────────────────────────────────────────────────┘

┌──────────────────────┬───────────────────────┐
│ Component Problems   │ Avg Time by Component │
│ 🥧 Pie Chart         │ Inlet:  2.1 days      │
│ Inlets: 35%          │ Outlet: 3.4 days      │
│ Outlets: 25%         │ Drain:  2.8 days      │
│ Drains: 30%          │ Pipe:   2.5 days      │
│ Pipes: 10%           │                       │
└──────────────────────┴───────────────────────┘

┌────────────────────────────────────────────────┐
│ Team Performance                               │
│ Agency    │ Total │ Resolved │ Avg Days       │
│ Agency A  │  45   │    38    │ 2.1 days       │
│ Agency B  │  32   │    28    │ 3.2 days       │
│ Agency C  │  28   │    24    │ 2.8 days       │
└────────────────────────────────────────────────┘

TAB 3: ALL REPORTS
┌────────────────────────────────────────────────┐
│ Filters: [Priority▼] [Status▼] [Type▼]        │
│ Sort: [By Date▼] [By Priority▼]               │
└────────────────────────────────────────────────┘

Report Grid (3 columns):
┌──────────────┬──────────────┬──────────────┐
│ [Image]      │ [Image]      │ [Image]      │
│              │              │              │
│ 🔴 CRITICAL  │ 🟠 HIGH      │ 🟡 MEDIUM    │
│ Inlet        │ Outlet       │ Drain        │
│ Bakilid      │ Centro       │ Casili       │
│ Pending      │ Resolved     │ In Progress  │
│ Nov 20, 2025 │ Nov 18, 2025 │ Nov 21, 2025 │
└──────────────┴──────────────┴──────────────┘
```

### Color Palette

| Element | Color | Tailwind |
|---------|-------|----------|
| Background | Light Gray | `bg-[#e8e8e8]/50` |
| Card | White | `bg-white` |
| Border | Light Gray | `border-[#ced1cd]` |
| Critical Priority | Red | `text-red-600` |
| High Priority | Orange | `text-orange-600` |
| Medium Priority | Yellow | `text-yellow-600` |
| Low Priority | Gray | `text-gray-500` |
| Resolved Status | Green | `text-green-600` |
| In Progress Status | Blue | `text-blue-600` |
| Pending Status | Orange | `text-orange-600` |

---

## Key Implementation Details

### Repair Time Calculation Logic

Based on maintenance tab pattern from `components/control-panel/tabs/maintenance.tsx`:

```typescript
// Get report created_at and maintenance last_cleaned_at
// Calculate difference in days
const repairDays = (maintenanceRecord.last_cleaned_at - report.created_at)
  / (1000 * 60 * 60 * 24);

// For average: Sum all repair days, divide by count
const averageRepairDays = totalRepairDays / resolvedReportCount;
```

### Zone Extraction from Address

```typescript
const barangays = [
  "Bakilid", "Centro", "Casuntingan", "Casili", "Canduman",
  "Cambaro", "Cabancalan", "Cubacub", "Basak", "Banilad",
  "Alang-alang", "Ibabao", "Jagobiao", "Guizo", "Looc",
  "Maguikay", "Opao", "Labogon", "Mantuyong", "Pagsabungan",
  "Pakna-an", "Recle", "Tabok", "Subangdaku", "Tawason",
  "Tingub", "Tipolo", "Umapad"
];

function extractZoneFromAddress(address: string): string {
  const lowerAddress = address.toLowerCase();
  const found = barangays.find(b =>
    lowerAddress.includes(b.toLowerCase())
  );
  return found || "Unknown";
}
```

### Component Type Determination

```typescript
// From component_id, determine type
// Or from which maintenance table record came from

function getComponentType(componentId: string):
  'inlets' | 'outlets' | 'storm_drains' | 'man_pipes' {
  if (componentId.startsWith('inlet')) return 'inlets';
  if (componentId.startsWith('outlet')) return 'outlets';
  if (componentId.startsWith('drain')) return 'storm_drains';
  if (componentId.startsWith('pipe')) return 'man_pipes';
  return 'inlets'; // default
}
```

---

## Timeline & Effort

| Phase | Task | Hours |
|-------|------|-------|
| 1 | Database Setup | 1h |
| 2 | Page Structure | 2h |
| 3 | Overview Tab | 3h |
| 4 | Analytics Tab | 5-6h |
| 5 | Reports Tab | 3-4h |
| 6 | Utilities | 1-2h |
| 7 | Polish | 2h |
| **Total** | | **17-20h** |

---

## What's Not Needed

❌ Auth/Admin checks - everything is public
❌ Auto-escalation logic - manual priority only
❌ Duplicate detection - not required
❌ Separate transparency page - all in one
❌ `resolved_at` field - use maintenance records
❌ `duplicate_count` field - not needed
❌ Completion proof upload - assume implemented, just display

---

## Success Criteria

✅ Public dashboard accessible to everyone
✅ All 3 tabs functional with real data
✅ Repair time calculated from maintenance records
✅ GeoJSON overlay showing issue counts per barangay
✅ Component type analysis (not category)
✅ Priority badges displayed on all reports
✅ Images displayed (report + completion photos)
✅ Responsive design
✅ Performance optimized
✅ Public transparency builds trust
