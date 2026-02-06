# 3D Flood Effect Implementation Guide

## Overview

The 3D flood effect visualizes flooding data on the simulation map by creating extruded 3D polygons around flooded nodes. The height of each polygon represents the flood volume, and colors indicate vulnerability levels.

## Features

- **3D Extruded Polygons**: Water rises from the ground based on flood volume
- **Color-Coded Risk**: High/Medium/Low/No Risk indicated by colors
- **Smooth Animation**: Water rises smoothly over 3 seconds
- **Dynamic Radius**: Adjustable radius for flood visualization circles
- **Easy Toggle**: Show/hide the effect without removing data

## Implementation

### 1. Core Utilities (`lib/map/effects/flood-3d-utils.ts`)

The utility file provides these functions:

```typescript
// Enable 3D flood visualization
enableFlood3D(
  map: mapboxgl.Map,
  floodData: NodeDetails[],
  inlets: NodeCoordinates[],
  drains: NodeCoordinates[],
  options?: {
    radius?: number;           // Radius of flood circles in meters (default: 15)
    opacity?: number;          // Opacity of flood layers (default: 0.7)
    animate?: boolean;         // Enable rise animation (default: true)
    animationDuration?: number; // Animation duration in ms (default: 3000)
  }
)

// Disable and remove flood visualization
disableFlood3D(map: mapboxgl.Map)

// Toggle visibility without removing
toggleFlood3D(map: mapboxgl.Map, visible: boolean)

// Update with new data
updateFlood3D(
  map: mapboxgl.Map,
  floodData: NodeDetails[],
  inlets: NodeCoordinates[],
  drains: NodeCoordinates[]
)
```

### 2. Integration in Simulation Page

The effect is automatically enabled when vulnerability tables are generated:

**Model 2 (Historical Data)**:
```typescript
// In handleGenerateTable()
enableFlood3D(mapRef.current, data, inletsRef.current, drainsRef.current, {
  radius: 15,
  opacity: 0.7,
  animate: true,
  animationDuration: 3000,
});
```

**Model 3 (Custom Simulation)**:
```typescript
// In handleGenerateTable3()
enableFlood3D(mapRef.current, transformedData, inletsRef.current, drainsRef.current, {
  radius: 15,
  opacity: 0.7,
  animate: true,
  animationDuration: 3000,
});
```

### 3. Color Scheme

The flood visualization uses the same colors as node vulnerability:

- **High Risk**: `#D32F2F` (Red)
- **Medium Risk**: `#FFA000` (Amber)
- **Low Risk**: `#FFF176` (Yellow)
- **No Risk**: `#388E3C` (Green)
- **Default**: `#2196F3` (Blue)

### 4. Height Scaling

Flood height is calculated as:
```typescript
floodHeight = Math.min(Total_Flood_Volume * 0.5, 50)
```

- Multiply by 0.5 for reasonable visual scale
- Maximum height capped at 50 meters

## Customization Options

### Adjust Flood Radius

Change the size of flood circles:
```typescript
enableFlood3D(map, data, inlets, drains, {
  radius: 25, // Larger circles (default: 15)
});
```

### Change Opacity

Make flood more/less transparent:
```typescript
enableFlood3D(map, data, inlets, drains, {
  opacity: 0.5, // More transparent (default: 0.7)
});
```

### Disable Animation

Show floods instantly without rise animation:
```typescript
enableFlood3D(map, data, inlets, drains, {
  animate: false,
});
```

### Adjust Animation Speed

Change how fast water rises:
```typescript
enableFlood3D(map, data, inlets, drains, {
  animationDuration: 5000, // 5 seconds (default: 3000)
});
```

## Advanced Features

### Add UI Toggle Button

To add a button that toggles the 3D flood effect, you can use the `handleToggleFlood3D` function:

```typescript
// In your component
<Button onClick={() => handleToggleFlood3D(!isFlood3DActive)}>
  {isFlood3DActive ? 'Hide' : 'Show'} 3D Flood
</Button>
```

### Pulsing Effect (Future Enhancement)

Add a pulsing animation for emphasis:
```typescript
import { enableFloodPulse } from '@/lib/map/effects/flood-3d-utils';

// After enabling flood
enableFloodPulse(map);
```

### Custom Height Calculation

Modify the height calculation in `flood-3d-utils.ts`:

```typescript
// Current
floodHeight: Math.min(node.Total_Flood_Volume * 0.5, 50)

// Alternative: Log scale for extreme values
floodHeight: Math.min(Math.log10(node.Total_Flood_Volume + 1) * 10, 50)

// Alternative: Based on hours flooded
floodHeight: Math.min(node.Hours_Flooded * 2, 50)
```

## Performance Considerations

- **Polygon Count**: Creates one polygon per flooded node
- **Animation**: Uses requestAnimationFrame for smooth 60fps animation
- **Memory**: Automatically cleaned up when tables are closed
- **Rendering**: Leverages Mapbox GL's native 3D rendering (GPU-accelerated)

## Troubleshooting

### Flood not visible
1. Ensure 3D terrain is enabled (check line 353 in simulation page)
2. Check map pitch angle (should be > 0 for 3D view)
3. Verify flood data has `Total_Flood_Volume > 0`

### Animation stuttering
- Reduce `animationDuration` for faster animation
- Check device GPU performance
- Ensure other heavy animations aren't running simultaneously

### Colors not matching vulnerability
- Verify `Vulnerability_Category` field matches expected values
- Check console for color mapping logs
- See `getFloodColor()` function for case-insensitive matching

## Technical Details

### Polygon Generation

Each flood creates a circular polygon with 32 vertices around the node coordinates:

```typescript
// Convert meters to degrees (approximate)
const latOffset = (radiusMeters / 111320) * Math.cos(angle);
const lngOffset = (radiusMeters / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
```

### Layer Configuration

Uses Mapbox's `fill-extrusion` layer type:
- `fill-extrusion-height`: Controls water level
- `fill-extrusion-base`: Always 0 (ground level)
- `fill-extrusion-opacity`: Transparency
- `fill-extrusion-vertical-gradient`: Adds realistic shading

### Animation Easing

Uses cubic ease-out for natural water rise:
```typescript
const eased = 1 - Math.pow(1 - progress, 3);
```

## Example Use Cases

1. **Compare flood scenarios**: Show different year return periods side-by-side
2. **Validate simulation**: Visualize custom simulation results in 3D
3. **Risk assessment**: Identify high-risk areas with visual height indicators
4. **Public presentations**: Compelling 3D visualization for stakeholders

## Future Enhancements

Potential improvements:
- [ ] Add water ripple shader effects
- [ ] Interactive flood level slider
- [ ] Time-lapse animation showing flood progression
- [ ] Reflection effects on water surface
- [ ] Flow direction indicators
- [ ] Flood volume labels above 3D polygons
