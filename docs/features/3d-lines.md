# 3D Lines (Flood Propagation Visualization)

## Overview

The 3D Lines feature provides a real-time visualization of flood propagation through the drainage pipe network. It creates gradient-colored lines that represent water flow and flooding intensity as it propagates through connected pipes from high-risk flood nodes to surrounding areas.

## Location & Implementation

- **Main Logic**: [`lib/map/effects/flood-3d-utils.ts`](../../lib/map/effects/flood-3d-utils.ts)
- **Integration**: [`app/simulation/page.tsx`](../../app/simulation/page.tsx)
- **Mapbox Layer ID**: `flood-gradient-layer`

## Features

### Gradient Color Visualization

The 3D lines use color gradients to represent flood propagation severity:

- **Red** (RGB: 211, 47, 47) - High Risk nodes
- **Orange** (RGB: 255, 160, 0) - Medium Risk nodes
- **Yellow** (RGB: 255, 235, 100) - Low Risk nodes
- **Green** (RGB: 56, 142, 60) - No Risk / Safe areas

Color transitions are smoothly interpolated between node endpoints to show the gradual change in flood severity.

### Line Width Scaling

Line width is dynamically scaled based on flood volume using data-driven styling:

```
0 cubic meters   → 4px width
10 cubic meters  → 8px width
25 cubic meters  → 14px width
50+ cubic meters → 20px width
```

This visual encoding allows users to quickly identify pipes with the most significant flood volumes.

### Opacity Based on Flood Volume

Line opacity increases with flood severity to emphasize high-risk areas:

```
0 cubic meters   → 0.2 opacity (faint)
5 cubic meters   → 0.6 opacity (moderate)
15 cubic meters  → 0.8 opacity (prominent)
```

## How It Works

### 1. Flood Data Processing

When a simulation generates vulnerability/flood data:

1. The system identifies all flooded nodes (Total_Flood_Volume > 0)
2. Creates a map of flooded nodes for fast lookup
3. Categorizes each node by vulnerability level (High/Medium/Low/None)

### 2. Pipe Flood Lines Creation

For each drainage pipe in the network:

1. **Endpoint Detection**: Finds if pipe endpoints are near flooded nodes
2. **Strict Matching**: Only processes pipes with BOTH endpoints near flooded nodes
3. **Gradient Generation**: Creates multiple line segments with interpolated colors
4. **Volume Calculation**: Uses average flood volume of both endpoints for line width

#### Example Pipe Processing:

```
Start Node: High Risk (Red)    →  End Node: Medium Risk (Orange)
       ↓
Creates 10 gradient segments with smooth color transition
       ↓
Result: Red→Orange gradient line showing flood progression
```

### 3. Isolated High-Risk Node Handling

For high-risk nodes not connected via pipes:

1. Finds the nearest non-green (at-risk) node
2. Creates a direct connection line between them
3. Uses the vulnerability categories of both nodes for coloring

This ensures all flood risks are visualized, even if not directly connected in the pipe network.

### 4. Layer Rendering

- **GeoJSON Source**: `flood-3d` contains all flood line segments
- **LineMetrics Enabled**: Allows smooth line gradient rendering
- **Rendering Order**:
  - Flood Propagation heatmap (below)
  - Flood gradient lines (middle)
  - Infrastructure layers (above)

### 5. Animation

Flood lines fade in when first displayed:

- **Duration**: 3000ms (default, configurable)
- **Easing**: Ease-out cubic for natural motion
- **Animation Type**: Opacity fade-in from 0 to target opacity
- **Throttling**: ~20fps to avoid excessive rendering

## API Reference

### `createFloodAlongPipes()`

Creates gradient-colored line segments along pipes showing flood propagation.

```typescript
function createFloodAlongPipes(
  floodData: NodeDetails[],
  nodeCoordinates: NodeCoordinates[],
  pipes: PipeFeature[]
): GeoJSON.FeatureCollection;
```

**Parameters:**

- `floodData`: Array of node flood metrics with vulnerability categories
- `nodeCoordinates`: Mapping of node IDs to their [lng, lat] coordinates
- `pipes`: GeoJSON pipe features with geometry and properties

**Returns:** GeoJSON FeatureCollection with line segments ready for Mapbox rendering

**Key Properties in Features:**

- `color`: Interpolated RGB color string
- `floodVolume`: Average flood volume for width calculation
- `startNodeId` / `endNodeId`: Reference node IDs
- `pipeName`: Original pipe name

### `enableFlood3D()`

Activates the 3D flood visualization on the map.

```typescript
async function enableFlood3D(
  map: mapboxgl.Map,
  floodData: NodeDetails[],
  inlets: NodeCoordinates[],
  drains: NodeCoordinates[],
  options?: {
    opacity?: number;
    animate?: boolean;
    animationDuration?: number;
  }
): Promise<void>;
```

**Parameters:**

- `map`: Mapbox GL JS map instance
- `floodData`: Vulnerability data from simulation
- `inlets`: Inlet node coordinates
- `drains`: Storm drain node coordinates
- `options`:
  - `opacity`: Line opacity (default: calculated per volume)
  - `animate`: Enable fade-in animation (default: true)
  - `animationDuration`: Animation duration in ms (default: 3000)

**Process:**

1. Loads pipe GeoJSON from `/drainage/man_pipes.geojson`
2. Calls `createFloodAlongPipes()` to generate features
3. Creates Mapbox GeoJSON source and layer
4. Positions layer correctly in rendering stack
5. Triggers fade-in animation if enabled

### `disableFlood3D()`

Removes all flood visualization from the map.

```typescript
function disableFlood3D(map: mapboxgl.Map): void;
```

Clears:

- `flood-gradient-layer` layer
- `flood-3d` source
- Associated legacy layers/sources (backwards compatibility)

### `toggleFlood3D()`

Shows or hides the flood visualization.

```typescript
function toggleFlood3D(map: mapboxgl.Map, visible: boolean): void;
```

Changes layer visibility without removing source/features, allowing quick toggling.

## Usage Example

```typescript
// When user runs a simulation and flood data becomes available:
if (floodData && isFlood3DActive) {
  await enableFlood3D(mapRef.current, floodData, inlets, drains, {
    animate: true,
    animationDuration: 3000,
  });
}

// When user wants to hide/show:
if (mapRef.current) {
  toggleFlood3D(mapRef.current, shouldShow);
}

// On cleanup or switching simulations:
if (mapRef.current) {
  disableFlood3D(mapRef.current);
}
```

## Performance Considerations

### Optimization Techniques

1. **Lazy Loading**: Pipe data loaded only when 3D flood is enabled
2. **Tolerance Simplification**: Geometry simplified with tolerance=1 for smoother curves
3. **Segment Subdivision**: Only for direct connections (2-point lines) to achieve smooth gradients
4. **Strict Matching**: Reduces unnecessary processing by filtering early

### Performance Metrics

- **Typical Pipe Count**: 500-2000+ pipes
- **Typical Flooded Nodes**: 50-500 nodes
- **Typical Line Segments Generated**: 2000-5000+ segments
- **Rendering Impact**: Negligible on modern GPUs with Mapbox GL JS

### Scaling Considerations

For very large networks (10,000+ pipes):

1. Consider data tiling or progressive loading
2. Implement feature clustering at lower zoom levels
3. Cache results when possible
4. Monitor console logs for performance warnings

## Common Issues & Troubleshooting

### Lines not appearing

- Verify pipe data is loaded: Check `/drainage/man_pipes.geojson`
- Ensure flooded nodes exist: Check `floodData` array is not empty
- Verify both pipe endpoints are near flooded nodes (strict matching requirement)
- Check layer visibility: `map.getLayer('flood-gradient-layer').layout.visibility`

### Lines appearing in wrong colors

- Verify vulnerability categories match expected values: 'High Risk', 'Medium Risk', 'Low Risk', 'No Risk'
- Check color interpolation logic in `getFloodColorRGB()`
- Ensure data isn't malformed

### Performance issues

- Check if too many features (>10,000 segments) are being created
- Monitor network requests for `/drainage/man_pipes.geojson`
- Check browser console for rendering performance warnings
- Consider toggling off other heatmap effects

## Related Features

- [Flood Propagation (Heatmap)](./flood-propagation.md) - Animated node/line heatmap
- [Rain Effect Toggle](./rain-effect.md) - Environmental weather visualization
- [Vulnerability Data Visualization](./vulnerability-visualization.md) - Node flood metrics

## Future Enhancements

1. **3D Extrusion**: Render flood as 3D volumes along pipes
2. **Time Animation**: Animate flood progression over time
3. **Flow Direction Arrows**: Add directional indicators for water flow
4. **Thematic Styling**: User-customizable color schemes and thresholds
5. **Multi-Layer Flood**: Show separate layers for different return periods
