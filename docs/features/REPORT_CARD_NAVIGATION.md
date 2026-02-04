# Report Card Navigation Implementation

**Date:** 2026-02-03  
**Status:** ✅ Implemented  
**Components:** `ReportCard.tsx`, `app/map/page.tsx`

## Overview

This document describes the implementation of clickable report cards that navigate to the map and automatically select the specific infrastructure component (inlet, outlet, storm drain, or pipe) where the report was filed.

## User Flow

1. User views a report card in the dashboard
2. User clicks anywhere on the report card
3. Application redirects to `/map` page
4. Map automatically:
   - Selects the specific component tied to the report
   - Flies camera to the component location
   - Opens the admin tab showing report history

## Database Schema

Reports contain the necessary linkage data:

```typescript
interface Report {
  id: string;
  componentId: string;      // ID of the infrastructure component
  category: string;          // Type: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
  // ... other fields
}
```

## Implementation Details

### 1. ReportCard Component (`components/dashboard/reports/ReportCard.tsx`)

#### Button Wrapper
The entire card is wrapped in a `<button>` element to make it clickable:

```tsx
<button
  onClick={handleCardClick}
  className="flex h-full max-h-100 flex-col overflow-hidden rounded-lg border border-[#ced1cd] bg-white transition-shadow hover:shadow-lg text-left w-full">
  {/* Card content */}
</button>
```

#### Click Handler
```tsx
const handleCardClick = () => {
  if (report.componentId && report.category) {
    // Navigate with component details
    router.push(`/map?component=${report.componentId}&type=${report.category}`);
  } else {
    // Fallback to report ID if component data missing
    router.push(`/map?reportId=${report.id}`);
  }
};
```

#### Event Propagation Prevention
Interactive elements within the card (badges, copy button, description) prevent event bubbling:

```tsx
// Example: Priority badge
<div onClick={(e) => e.stopPropagation()}>
  <PriorityBadge
    priority={report.priority}
    size="sm"
    onClick={onPriorityFilter}
  />
</div>

// Copy ID button
const handleCopyId = async (e: React.MouseEvent) => {
  e.stopPropagation(); // Prevent card click
  // ... copy logic
};
```

### 2. Map Page Component (`app/map/page.tsx`)

#### URL Parameter Handling
A dedicated `useEffect` watches for component selection parameters:

```tsx
useEffect(() => {
  const componentId = searchParams.get('component');
  const componentType = searchParams.get('type');
  
  if (!componentId || !componentType) return;
  if (!mapRef.current) return;

  // Wait for data to load
  const timer = setTimeout(() => {
    switch (componentType) {
      case 'inlets': {
        const inlet = inlets.find((i) => i.id === componentId);
        if (inlet) {
          handleSelectInlet(inlet);
          handleTabChange('admin');
        }
        break;
      }
      case 'outlets': {
        const outlet = outlets.find((o) => o.id === componentId);
        if (outlet) {
          handleSelectOutlet(outlet);
          handleTabChange('admin');
        }
        break;
      }
      case 'man_pipes': {
        const pipe = pipes.find((p) => p.id === componentId);
        if (pipe) {
          handleSelectPipe(pipe);
          handleTabChange('admin');
        }
        break;
      }
      case 'storm_drains': {
        const drain = drains.find((d) => d.id === componentId);
        if (drain) {
          handleSelectDrain(drain);
            handleTabChange('admin');
          }
          break;
        }
      }
    }, 500); // 500ms delay for data loading

    return () => clearTimeout(timer);
  }, [searchParams, inlets, outlets, pipes, drains]);
```

#### Component Selection Functions
Each component type has a dedicated selection handler:

```tsx
const handleSelectInlet = (inlet: Inlet) => {
  if (!mapRef.current) return;
  const [lng, lat] = inlet.coordinates;

  clearSelections(); // Clear previous selections
  
  setSelectedInlet(inlet);
  setControlPanelDataset('inlets');

  // Highlight on map
  mapRef.current.setFeatureState(
    { source: 'inlets', id: inlet.id },
    { selected: true }
  );
  
  setSelectedFeature({
    id: inlet.id,
    source: 'inlets',
    layer: 'inlets-layer',
  });

  // Smooth camera animation
  mapRef.current.flyTo({
    center: [lng, lat],
    zoom: CAMERA_ANIMATION.targetZoom,
    speed: CAMERA_ANIMATION.speed,
    curve: CAMERA_ANIMATION.curve,
    essential: CAMERA_ANIMATION.essential,
    easing: CAMERA_ANIMATION.easing,
  });
};
```

## URL Parameters

### Navigation from Report Card
```
/map?component={componentId}&type={category}
```

**Example:**
```
/map?component=Inlet_001&type=inlets
```

### Parameters
- `component` (string): The unique ID of the infrastructure component
- `type` (string): Component category - one of:
  - `inlets`
  - `outlets`
  - `storm_drains`
  - `man_pipes`

### Fallback
If `componentId` or `category` is missing from the report:
```
/map?reportId={reportId}
```

## Navigation Pattern Consistency

This implementation follows the same pattern used in the inlet table (`components/control-panel/tabs/tables-content/inlet-table.tsx`):

1. **Table Row Click** → `onSelectInlet(inlet)` → Fly to component
2. **Report Card Click** → URL params → `handleSelectInlet(inlet)` → Fly to component

Both methods result in:
- Component highlighted on map
- Camera animation to location
- Control panel showing component details
- Admin tab displaying report history

## Technical Considerations

### Data Loading Delay
A 500ms timeout ensures component data is loaded before attempting selection:

```tsx
const timer = setTimeout(() => {
  // Selection logic
}, 500);
```

### Event Propagation
Interactive child elements use `e.stopPropagation()` to prevent triggering the card click when:
- Clicking filter badges
- Copying report ID
- Expanding description text

### State Management
- `selectedInlet/Outlet/Pipe/Drain`: Controls which component is displayed in panel
- `selectedFeature`: Tracks map feature state for highlighting
- `controlPanelTab`: Set to 'admin' to show report history

## Testing Checklist

- [ ] Click report card navigates to map
- [ ] Map selects correct component based on report category
- [ ] Camera flies to component location
- [ ] Admin tab opens showing report history
- [ ] Badge clicks don't trigger card navigation
- [ ] Copy ID button doesn't trigger card navigation
- [ ] Description expand doesn't trigger card navigation
- [ ] Fallback works when component data is missing
- [ ] Works for all component types (inlets, outlets, storm drains, pipes)

## Future Enhancements

1. **Direct Report Highlighting**: Add URL param support for `reportId` to highlight specific report bubble on map
2. **Breadcrumb Navigation**: Show navigation path (Dashboard → Report → Map)
3. **Back Navigation**: Remember previous page for "Back" button
4. **Loading States**: Show skeleton loader during navigation transition

## Related Files

- `components/dashboard/reports/ReportCard.tsx` - Report card component
- `app/map/page.tsx` - Map page with URL parameter handling
- `lib/dashboard/queries.ts` - Report data fetching
- `lib/supabase/report.ts` - Report type definitions
- `components/control-panel/tabs/tables-content/inlet-table.tsx` - Reference implementation

## References

- Next.js `useRouter` documentation
- Next.js `useSearchParams` documentation
- Mapbox GL JS `flyTo()` API
