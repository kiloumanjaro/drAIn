# Flood Propagation (Heatmap Visualization)

## Overview

Flood Propagation is an animated heatmap visualization that displays flood risk intensity across both drainage nodes and pipe networks. It combines pulsing intensity effects with subtle position wobbling to create an engaging and informative visualization of how flood water spreads through the drainage system.

## Location & Implementation

- **Main Logic**: [`app/simulation/page.tsx`](../../app/simulation/page.tsx) (lines 379-550 for layer setup, 1282-1449 for animation)
- **Animation**: Lines 1720-1830 (`animateFloodPropagationIntensity`)
- **Toggle Handler**: Lines 1832-1875 (`handleToggleFloodPropagation`)
- **Mapbox Layer IDs**:
  - `flood_propagation-nodes-layer` - Node points
  - `flood_propagation-lines-layer` - Pipe network lines

## Features

### Color Gradient System

The heatmap uses a blue color gradient representing flood water intensity:

| Density Level | Color | Opacity | Meaning |
|---|---|---|---|
| 0% | Transparent | 0.0 | No flood |
| 15% | Dodger Blue | 0.7 | Low density/early warning |
| 30% | Strong Blue | 0.8 | Low-moderate flood |
| 50% | Blue | 0.85 | Moderate flood |
| 70% | Dark Blue | 0.9 | High flood |
| 85% | Very Dark Blue | 0.95 | Very high flood |
| 100% | Navy Blue | 1.0 | Peak flood (fully opaque) |

### Dual-Layer Architecture

Two separate heatmap layers allow independent control:

1. **Nodes Layer** (`flood_propagation-nodes-layer`)
   - Displays intensity at inlet and drain points
   - Higher weight for "High Risk" nodes (5.0x multiplier)
   - Medium weight for "Medium Risk" (1.5x multiplier)
   - Low weight for "Low Risk" (0.6x multiplier)
   - Zoom-dependent radius: 3px → 80px (zoom 0 → 15)

2. **Lines Layer** (`flood_propagation-lines-layer`)
   - Shows flood propagation along pipe routes
   - Uniform lower intensity weight (0.15)
   - Zoom-dependent radius: 1px → 60px (zoom 0 → 15)

### Pulsing Animation

Each point features synchronized pulsing that varies per point:

- **Pulse Speed**: 0.3 cycles per second
- **Pulse Depth**: 35% (oscillates from 0.65 to 1.0)
- **Per-Point Phase**: Random initial phase offset for natural appearance
- **Formula**: `pulse = 1 - 0.175 + 0.35 * sin(time * π * 2 + phase)`

### Position Wobbling

Subtle coordinate oscillation adds visual interest:

- **Wobble Distance**: ~9 meters maximum (0.00009 degrees)
- **Wobble Direction**: Random per point
- **Wobble Speed**: Matches pulse speed for synchronized motion
- **Effect**: Points drift gently in an oval pattern, simulating water movement

### Zoom-Dependent Behavior

Visualization adapts to zoom level for optimal visibility:

| Zoom | Node Intensity | Node Radius | Node Opacity | Line Intensity | Line Radius | Line Opacity |
|---|---|---|---|---|---|---|
| 0 | 0.4 | 3px | 0.15 | 0.2 | 1px | 0.05 |
| 7 | - | - | 0.2 | - | - | 0.1 |
| 10 | - | - | 0.3 | - | - | 0.2 |
| 12 | 1.0 | 12px | 0.4 | 0.6 | 6px | 0.3 |
| 13 | 1.8 | 35px | - | 1.2 | 20px | - |
| 14 | - | - | 0.5 | - | - | 0.45 |
| 15 | 3.0 | 80px | 0.6 | 2.0 | 60px | 0.55 |
| 16 | - | - | 0.6 | - | - | 0.55 |

At lower zooms, the heatmap is subtle and mostly invisible, becoming more prominent as users zoom in for detailed analysis.

## Data Flow

### 1. Simulation Data Collection

When a flood simulation completes:

```
Simulation Output
     ↓
NodeDetails[] with:
  - Node_ID
  - Vulnerability_Category (High/Medium/Low/None Risk)
  - Total_Flood_Volume
  - Maximum_Rate
  - Hours_Flooded
     ↓
updateFloodPropagation() function called
```

### 2. Node Feature Generation

For each flooded node (Total_Flood_Volume > 0):

```javascript
{
  type: 'Feature',
  properties: {
    source: 'node',           // Distinguishes from line points
    nodeId: string,           // Original node ID
    vulnerability: string,    // Risk category
    floodVolume: number,      // For weight calculation
    phase: number,            // Random 0-2π for pulse offset
    offsetAngle: number,      // Random direction for wobble
    offsetDistance: number,   // ~9 meter max wobble
  },
  geometry: {
    type: 'Point',
    coordinates: [lng, lat]   // From inlet/drain coordinates
  }
}
```

### 3. Line Feature Generation

For pipe-based flood propagation:

1. Loads pipe network from `/drainage/man_pipes.geojson`
2. Generates flood line features using 3D flood logic (see [3D Lines](./3d-lines.md))
3. Samples midpoint coordinates from each line segment
4. Filters out points too close to node points (< 8 meters)
5. Creates point features at sampled locations

### 4. Real-Time Animation

Continuously updates features with animation:

- **Throttled to ~20fps**: 50ms minimum between updates
- **RequestAnimationFrame**: Smooth integration with browser rendering
- **Per-Point Variation**: Each point pulses and wobbles independently
- **Update Scope**: Only updates if features exist

Animation runs until:
- User disables Flood Propagation
- Simulation changes
- Page unloads

## API Reference

### `updateFloodPropagation()`

Processes simulation data and updates heatmap layers.

```typescript
const updateFloodPropagation = async (vulnerabilityData: NodeDetails[]) => {
  // Implementation in app/simulation/page.tsx:1282
}
```

**Process:**
1. Filters nodes with flood volume > 0
2. Creates node GeoJSON features
3. Loads and processes pipe network
4. Generates line sample points
5. Filters overlapping points
6. Updates both sources with retry logic

**Retry Logic:**
- Maximum 10 retry attempts
- 300ms delay between retries
- Ensures map is fully loaded before updating

### `animateFloodPropagationIntensity()`

Main animation loop for pulsing and wobbling effects.

```typescript
const animateFloodPropagationIntensity = useCallback(() => {
  // Implementation in app/simulation/page.tsx:1720
}, [])
```

**Key Features:**
- Throttled to ~20fps (50ms intervals)
- Uses `requestAnimationFrame` for smooth animation
- Updates both node and line sources
- Applies dynamic pulse multiplier to each feature
- Applies wobble offset to coordinates

**Animation Calculations:**

```typescript
// Pulse multiplier (0.65 to 1.0 range)
const pulse = 1 - 0.175 + 0.35 * Math.sin(time * 0.3 * π * 2 + phase);

// Wobble offset
const wobbleAmount = Math.sin(time * 0.3 * π * 2 + phase) * offsetDistance;
const wobbledLng = lng + Math.cos(offsetAngle) * wobbleAmount;
const wobbledLat = lat + Math.sin(offsetAngle) * wobbleAmount;
```

### `handleToggleFloodPropagation()`

Controls visibility and animation state.

```typescript
const handleToggleFloodPropagation = useCallback((enabled: boolean) => {
  // Implementation in app/simulation/page.tsx:1832
}, [animateFloodPropagationIntensity])
```

**When Enabled:**
- Shows both heatmap layers
- Starts animation loop
- Sets animation ref flag

**When Disabled:**
- Hides both layers (visibility: 'none')
- Cancels animation loop
- Clears animation frame

**Map Repaint:** Triggers `map.triggerRepaint()` to force redraw

## State Management

### React State

```typescript
const [isFloodPropagationActive, setIsFloodPropagationActive] = useState(true);
const [isFloodPropagationAnimating, setIsFloodPropagationAnimating] = useState(false);
```

### Refs (Performance Optimization)

```typescript
const nodeFloodPropagationFeaturesRef = useRef<GeoJSON.Feature[]>([]);
const lineFloodPropagationFeaturesRef = useRef<GeoJSON.Feature[]>([]);
const shouldAnimateFloodPropagationRef = useRef<boolean>(true);
const lastAnimationTimeRef = useRef<number>(0);
const animationFrameRef = useRef<number | null>(null);
```

## Usage Example

```typescript
// Enable after simulation generates data
if (vulnerabilityData && vulnerabilityData.length > 0) {
  await updateFloodPropagation(vulnerabilityData);
  setIsFloodPropagationActive(true);
}

// Toggle visibility
handleToggleFloodPropagation(shouldShow);

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
}, []);
```

## Performance Characteristics

### Feature Counts
- **Typical Node Points**: 50-500 flooded nodes
- **Typical Line Sample Points**: 500-2000+ sampled from pipe network
- **Total Features Per Update**: 500-2500 features

### Update Frequency
- **Animation Loop**: ~20 updates per second
- **Source Update Cost**: O(n) where n = feature count
- **Throttling**: Prevents excessive updates

### Memory Usage
- **Node Features**: ~0.5KB per feature in refs
- **Line Features**: ~0.5KB per feature in refs
- **Typical Memory**: 250KB-1.5MB for full feature set

### Browser Performance
- **Canvas Rendering**: Handled by Mapbox GL JS
- **GPU Acceleration**: Modern browsers provide GLSL rendering
- **CPU Overhead**: Minimal with proper throttling
- **Impact**: Negligible on typical devices

## Configuration Options

### Customizable Parameters

Edit values in `app/simulation/page.tsx`:

```typescript
// Heatmap color gradient (line 389-407)
const heatmapColor = [
  'interpolate',
  ['linear'],
  ['heatmap-density'],
  0, 'rgba(0, 0, 0, 0)',
  // ... color stops
];

// Node heatmap weight (line 489-501)
'heatmap-weight': [
  '*',
  ['coalesce', ['get', 'pulseMultiplier'], 1],
  [
    'case',
    ['==', ['get', 'vulnerability'], 'High Risk'], 5.0,    // Customize
    ['==', ['get', 'vulnerability'], 'Medium Risk'], 1.5,  // Customize
    ['==', ['get', 'vulnerability'], 'Low Risk'], 0.6,     // Customize
    0.2,
  ],
];

// Animation parameters (line 1748-1750)
const pulseSpeed = 0.3;        // Cycles per second
const pulseAmount = 0.35;      // 35% depth
```

## Common Issues & Troubleshooting

### Heatmap not visible
- Check if `isFloodPropagationActive` is true
- Verify features are being generated: Check console logs for `[Flood Propagation]` messages
- Ensure vulnerability data exists: `vulnerabilityData.length > 0`
- Check layer visibility: `map.getLayer('flood_propagation-nodes-layer').layout.visibility`

### Animation stuttering or jerky
- Check browser tab performance: Other tabs consuming resources?
- Verify throttling is working: Should be 50ms minimum between updates
- Monitor feature count: If > 10,000 features, consider filtering
- Check animation frame ref: Ensure no duplicate animation loops

### Colors not showing expected intensity
- Verify heatmap-weight calculations are correct
- Check pulse multiplier is between 0.65-1.0
- Ensure vulnerability categories match expected values
- Test with known flood nodes

### Memory leaks
- Verify animation frame is cancelled on disable: `cancelAnimationFrame()`
- Check refs are cleared on unmount
- Ensure listeners are removed

## Related Features

- [3D Lines](./3d-lines.md) - Gradient-colored flood propagation lines
- [Rain Effect Toggle](./rain-effect.md) - Weather visualization
- [Vulnerability Data Tables](./vulnerability-visualization.md) - Node metrics

## Future Enhancements

1. **Time-Series Animation**: Show flood propagation progression over simulation time
2. **Custom Color Schemes**: User-selectable heatmap color palettes
3. **Risk Level Thresholds**: Dynamic feature filtering based on risk level
4. **Intensity Presets**: Quick-select animation speed presets
5. **Statistical Overlay**: Show real-time statistics of flood extent
6. **Export Heatmap**: Save heatmap as image or data overlay
