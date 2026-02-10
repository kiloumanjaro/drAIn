# Flood Visualization Suite Documentation

Complete guide to the three-part flood visualization system that provides comprehensive understanding of flood propagation and risks in drainage networks.

## Overview

The flood visualization suite consists of three complementary visualization layers that work together to provide users with multiple perspectives on flood behavior:

1. **[3D Lines](./3d-lines.md)** - Gradient-colored flood propagation along pipe network
2. **[Flood Propagation (Heatmap)](./flood-propagation.md)** - Animated intensity visualization at nodes and lines
3. **[Rain Effect](./rain-effect.md)** - Environmental context showing the rainfall event

## Quick Start

### Enabling Visualizations

```typescript
// When simulation completes with flood data
const vulnerabilityData = await runSimulation(...);

// All three visualization layers can be enabled together
if (vulnerabilityData) {
  // 1. Enable 3D lines (gradient flood propagation)
  await enableFlood3D(mapRef.current, vulnerabilityData, inlets, drains, {
    animate: true,
    animationDuration: 3000
  });

  // 2. Enable Flood Propagation heatmap
  await updateFloodPropagation(vulnerabilityData);
  setIsFloodPropagationActive(true);

  // 3. Enable rain effect (optional context)
  enableRain(mapRef.current, 0.8);
}
```

### Toggling Visualizations

```typescript
// User can toggle each visualization independently
handleToggleFloodPropagation(true);   // Show/hide heatmap
toggleFlood3D(mapRef.current, true);  // Show/hide 3D lines
handleToggleRain(true);                // Show/hide rain
```

## Feature Comparison

| Feature | 3D Lines | Flood Propagation | Rain Effect |
|---|---|---|---|
| **Type** | Gradient lines | Heatmap | Weather simulation |
| **Primary Use** | Show flood paths | Show flood intensity | Environmental context |
| **Data Input** | Node categories | Node flood volumes | Constant animation |
| **Update Frequency** | Once per simulation | Continuous (~20fps) | GPU-accelerated |
| **Zoom Dependent** | Visible at all zooms | More intense at zoom 12+ | Hidden until zoom 10 |
| **Interactive** | User can enable/disable | User can enable/disable | User can enable/disable |
| **Performance Impact** | Low | Low-Medium | Negligible |
| **GPU Required** | No | No | Yes |

## Layer Architecture

### Rendering Order (Bottom to Top)

```
1. Terrain/DEM layer
   ↓
2. 3D buildings
   ↓
3. flood_propagation-lines-layer (Flood Propagation - lines)
   ↓
4. flood_propagation-nodes-layer (Flood Propagation - nodes)
   ↓
5. flood-gradient-layer (3D Lines)
   ↓
6. Infrastructure layers (pipes, drains, inlets, outlets)
```

This carefully ordered stack ensures:
- Heatmaps render below infrastructure for context
- 3D lines appear above heatmap for clarity
- Infrastructure remains on top for interaction
- Visual hierarchy guides user attention

### GeoJSON Sources

```typescript
// Flood Propagation heatmap data
map.addSource('flood_propagation_nodes', {...});
map.addSource('flood_propagation_lines', {...});

// 3D Lines flood visualization
map.addSource('flood-3d', {...});
```

## Data Flow

### Typical Flood Visualization Pipeline

```
Simulation Execution
    ↓
Vulnerability Data Generated
    ↓
├─→ 3D Lines Layer
│   - Process node categories
│   - Create gradient segments
│   - Add to flood-3d source
│   - Animate fade-in
│   └─→ Shows flood paths with colors
│
├─→ Flood Propagation Layer
│   - Create node features
│   - Sample line points
│   - Filter overlaps
│   - Add to heatmap sources
│   - Start animation loop
│   └─→ Shows flood intensity with pulsing
│
└─→ Rain Effect (Optional)
    - Enable based on user preference
    - Zoom-dependent visibility
    └─→ Shows rainfall context
```

### Feature Properties Used

Each visualization uses different node properties:

**3D Lines:**
```json
{
  "Node_ID": "string",
  "Vulnerability_Category": "High Risk|Medium Risk|Low Risk|No Risk",
  "Total_Flood_Volume": "number"
}
```

**Flood Propagation:**
```json
{
  "Node_ID": "string",
  "Vulnerability_Category": "Risk level",
  "Total_Flood_Volume": "number",
  "Maximum_Rate": "number",
  "Hours_Flooded": "number"
}
```

**Rain Effect:**
```
No data properties - constant environmental effect
```

## Configuration & Customization

### Color Schemes

**3D Lines Color Gradient:**
```typescript
// Edit getFloodColorRGB() in flood-3d-utils.ts
High Risk:    'rgb(211, 47, 47)'     // Red
Medium Risk:  'rgb(255, 160, 0)'     // Orange
Low Risk:     'rgb(255, 235, 100)'   // Yellow
No Risk:      'rgb(56, 142, 60)'     // Green
```

**Flood Propagation Heatmap:**
```typescript
// Edit heatmapColor in app/simulation/page.tsx (line 389)
0.15: 'rgba(30, 144, 255, 0.7)'    // Dodger Blue - low
0.5:  'rgba(0, 71, 171, 0.85)'     // Blue - moderate
1.0:  'rgba(0, 0, 100, 1.0)'       // Navy Blue - peak
```

**Rain Effect:**
```typescript
// Edit enableRain() in lib/map/effects/rain-utils.ts
color: '#a8adbc'              // Rain color
'vignette-color': '#464646'   // Edge darkening
```

### Animation Parameters

**3D Lines Animation:**
```typescript
// In enableFlood3D() call
enableFlood3D(map, data, inlets, drains, {
  animate: true,
  animationDuration: 3000  // ms for fade-in
});
```

**Flood Propagation Pulsing:**
```typescript
// In app/simulation/page.tsx (line 1748-1750)
const pulseSpeed = 0.3;      // Cycles per second
const pulseAmount = 0.35;    // Oscillation depth
```

**Flood Propagation Wobble:**
```typescript
// In updateFloodPropagation() (line 1323)
offsetDistance: Math.random() * 0.00009  // ~9 meters max
```

## Performance Optimization

### Feature Count Management

```typescript
// Typical counts
Flooded Nodes:        50-500 features
Sampled Line Points:  500-2000+ features
3D Line Segments:     2000-5000+ features
Total Heatmap Update: ~20fps throttled
```

### Memory Usage

```
Node Features:        ~0.5KB each
Line Features:        ~0.5KB each
Full Heatmap Set:     250KB-1.5MB
3D Lines Features:    500KB-2MB
Total Peak:           <5MB typical
```

### Optimization Techniques

1. **Lazy Loading**: Pipe data loaded only when needed
2. **Throttling**: Heatmap updates limited to 50ms intervals
3. **Ref Storage**: Features cached to avoid re-creation
4. **Geometry Simplification**: Tolerance=1 for line smoothing
5. **Early Filtering**: Strict endpoint matching reduces processing
6. **Zoom-Based Hiding**: Rain hidden at low zooms
7. **GPU Acceleration**: Mapbox handles all rendering

## Troubleshooting Guide

### Common Issues

| Issue | Cause | Solution |
|---|---|---|
| Visualizations not appearing | Style not loaded | Wait for `map.isStyleLoaded()` |
| Gradient colors wrong | Bad RGB values | Check `getFloodColorRGB()` |
| Heatmap stuttering | Too many features | Filter or reduce node count |
| Rain not visible | Wrong style or zoom < 10 | Check style name and zoom |
| Memory leak | Animation not cancelled | Verify `cancelAnimationFrame()` called |

### Debug Commands

```javascript
// Check what visualizations are enabled
console.log(mapRef.current?.getLayer('flood_propagation-nodes-layer'));
console.log(mapRef.current?.getLayer('flood-gradient-layer'));
console.log(mapRef.current.getRain?.());

// Check feature counts
const nodeSource = mapRef.current.getSource('flood_propagation_nodes');
console.log(nodeSource._data.features.length);

// Check animation frame status
console.log(animationFrameRef.current);  // Should be null when stopped
```

## Best Practices

### When to Use Each Visualization

**Use 3D Lines when:**
- Showing flood propagation paths
- Emphasizing connections between nodes
- Displaying category-based risk assessment
- Highlighting pipe-to-pipe flood spread

**Use Flood Propagation when:**
- Showing flood intensity distribution
- Displaying dynamic animated effects
- Comparing intensity between nodes
- Providing detailed node-level information

**Use Rain Effect when:**
- Adding environmental storytelling
- Contextualizing the flood event
- Showing what caused the simulation
- Enhancing visual engagement

### Recommended Configurations

**Overview Mode (Zoom 8-11):**
```typescript
isFloodPropagationActive: false   // Heatmap too subtle
toggleFlood3D(map, true)           // 3D lines visible
enableRain(map, 0.5)               // Light rain
```

**Detailed Analysis (Zoom 12-15):**
```typescript
isFloodPropagationActive: true    // Heatmap prominent
toggleFlood3D(map, true)          // 3D lines detailed
enableRain(map, 0.8)              // Rain visible
```

**Planning Mode (Zoom 16+):**
```typescript
isFloodPropagationActive: true    // Full intensity
toggleFlood3D(map, true)          // All details visible
enableRain(map, 1.0)              // Maximum rain
```

## Related Documentation

- [3D Lines](./3d-lines.md) - Detailed gradient line documentation
- [Flood Propagation](./flood-propagation.md) - Heatmap animation details
- [Rain Effect](./rain-effect.md) - Weather visualization guide
- [Simulation Guide](../guides/simulation.md) - Running simulations
- [Control Panel](../components/control-panel.md) - UI controls

## Future Roadmap

### Short-term Enhancements
1. Custom color palette selector
2. Animation speed controls
3. Opacity adjustment sliders
4. Feature filtering by risk level

### Medium-term Features
1. Time-series animation (flood progression over time)
2. Side-by-side comparison views
3. Animation playback/scrubbing
4. Data export functionality

### Long-term Vision
1. 3D elevation rendering of flood surfaces
2. Volumetric flood water visualization
3. Real-time flow direction arrows
4. Integration with real-time sensor data
5. AR/VR flood visualization

## Performance Benchmarks

### Modern Hardware (2020+)

```
Feature Count    | Update Time | Memory | FPS Impact
500 features     | <5ms       | 0.5MB  | None
2500 features    | 10-15ms    | 2MB    | None
5000 features    | 20-30ms    | 4MB    | Minimal
10000 features   | 50-75ms    | 8MB    | Slight
```

### Older Hardware (2015-2019)

```
Similar performance, may see 2-3x slower updates
Monitor console logs for performance warnings
Consider disabling heatmap animation on low-end devices
```

## Browser Support

All visualization features are supported in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL 2.0 is required for all effects.
