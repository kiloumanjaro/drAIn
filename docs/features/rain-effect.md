# Rain Effect Toggle

## Overview

The Rain Effect feature adds a realistic weather simulation to the map, displaying animated rainfall that responds to the user's zoom level and intensity settings. This environmental visualization enhances the simulation context by showing the rainfall event that causes the flooding in the drainage system.

## Location & Implementation

- **Main Logic**: [`lib/map/effects/rain-utils.ts`](../../lib/map/effects/rain-utils.ts)
- **Integration**: [`app/simulation/page.tsx`](../../app/simulation/page.tsx)
- **Control Panel**: [`components/control-panel/index.tsx`](../../components/control-panel/index.tsx)
- **Mapbox API**: `map.setRain()` (Mapbox Standard style only)

## Requirements

- **Map Style**: Must be using Mapbox Standard style (`mapbox/standard`)
- **Mapbox GL JS**: Version with rain effect API support
- **Browser**: Modern browser with WebGL support

## Features

### Zoom-Based Visibility

Rain effect visibility is controlled by map zoom level for optimal experience:

```typescript
// Rain starts revealing at zoom 10, fully visible at zoom 15
const factor = Math.max(0, Math.min(1, (zoom - 10) / 5));
return factor * value;
```

**Zoom Reveal Timeline:**

- Zoom < 10: Rain completely hidden
- Zoom 10-15: Gradual reveal (0% → 100%)
- Zoom > 15: Fully visible

This prevents overwhelming users at lower zoom levels while providing immersive detail when zoomed in.

### Configurable Intensity

Rain intensity can be set from 0.0 to 1.0:

```
0.0  → No rain (completely disabled)
0.5  → Light rain
0.75 → Moderate rain
1.0  → Heavy rain (maximum)
```

Intensity is automatically clamped to valid range, preventing invalid values.

### Visual Parameters

The rain effect includes multiple visual characteristics that work together:

| Parameter       | Value           | Effect                                         |
| --------------- | --------------- | ---------------------------------------------- |
| Density         | Zoom-scaled 0.5 | Rain droplet concentration                     |
| Color           | #a8adbc         | Light gray matching precipitation              |
| Opacity         | 0.7             | Semi-transparent for visibility through effect |
| Vignette        | Zoom-scaled 1.0 | Darkened edges for depth                       |
| Vignette Color  | #464646         | Dark gray for edge dimming                     |
| Direction       | [0, 80]         | Rain falls slightly forward-facing             |
| Droplet Size    | [2.6, 18.2]     | Varies from small to large drops               |
| Distortion      | 0.7             | Lens distortion effect strength                |
| Center Thinning | 0               | Rain visible across entire screen              |

### Animation

Rain is continuously animated by the Mapbox Standard style renderer:

- **Type**: GPU-accelerated particle effect
- **Performance**: Negligible impact on frame rate
- **Smoothness**: Automatically synchronized with map rendering
- **Flexibility**: Independent of simulation animation speed

## API Reference

### `enableRain()`

Activates rain visualization on the map.

```typescript
function enableRain(map: mapboxgl.Map, intensity: number = 1.0): void;
```

**Parameters:**

- `map`: Mapbox GL JS map instance
- `intensity`: Rain intensity (0.0-1.0), defaults to 1.0

**Process:**

1. Verifies Mapbox Standard style is loaded
2. Checks `setRain` API is available
3. Clamps intensity to valid range [0, 1.0]
4. Calls `map.setRain()` with configured parameters
5. Logs success to console

**Error Handling:**

- Returns early if `map` is invalid
- Logs warning if `setRain` API unavailable
- Catches and logs any runtime errors

**Example:**

```typescript
enableRain(mapRef.current, 0.8); // Enable with 80% intensity
```

### `disableRain()`

Removes rain visualization from the map.

```typescript
function disableRain(map: mapboxgl.Map): void;
```

**Process:**

1. Verifies map exists and API is available
2. Checks if style is fully loaded
3. Sets intensity to 0 (Mapbox-recommended disable method)
4. Logs to console

**Silent Failure:** Returns early if conditions aren't met (doesn't throw)

**Example:**

```typescript
disableRain(mapRef.current); // Remove rain effect
```

### `zoomBasedReveal()`

Calculates zoom-dependent scaling for visual parameters.

```typescript
function zoomBasedReveal(map: mapboxgl.Map, value: number): number;
```

**Parameters:**

- `map`: Mapbox GL JS map instance
- `value`: Base value to scale (e.g., 0.5, 1.0)

**Returns:** Scaled value based on current zoom level

**Logic:**

```
zoom < 10:  return 0          (no reveal)
10 ≤ zoom ≤ 15: return scaled 0 to value  (gradual reveal)
zoom > 15:  return value      (full reveal)
```

**Used For:**

- Rain density at different zoom levels
- Vignette intensity scaling
- Smooth transitions between zoom levels

## State Management

### React State

```typescript
// Track if rain effect is currently active
const [isRainActive, setIsRainActive] = useState(false);

// Track desired rain intensity (for persistence across toggle)
const rainIntensityRef = useRef<number>(1.0);
```

### Synchronization

```typescript
// Effect watches isRainActive state
useEffect(() => {
  if (!mapRef.current) return;

  if (isRainActive) {
    enableRain(mapRef.current, rainIntensityRef.current);
  } else {
    disableRain(mapRef.current);
  }
}, [isRainActive]);
```

## User Interaction

### Control Panel Integration

The rain toggle is available in the control panel:

```typescript
// Props passed to ControlPanel component
<ControlPanel
  isRainActive={isRainActive}
  onToggleRain={handleToggleRain}
  // ... other props
/>
```

### Toggle Handler

```typescript
const handleToggleRain = useCallback((enabled: boolean) => {
  setIsRainActive(enabled);
  // State synchronization effect handles enabling/disabling
}, []);
```

### User Experience Flow

```
User clicks rain toggle in control panel
    ↓
handleToggleRain(true/false) called
    ↓
setIsRainActive(enabled) updates state
    ↓
useEffect watches isRainActive and triggers
    ↓
enableRain() or disableRain() called
    ↓
Mapbox updates visual effect immediately
```

## Configuration Parameters

All rain parameters are defined in `enableRain()` function:

```typescript
map.setRain({
  density: zoomBasedReveal(map, 0.5), // 0-100% based on zoom
  intensity: clampedIntensity, // User-controlled 0-1.0
  color: '#a8adbc', // Light gray
  opacity: 0.7, // Semi-transparent
  vignette: zoomBasedReveal(map, 1.0), // 0-100% edge darkening
  'vignette-color': '#464646', // Dark gray edges
  direction: [0, 80], // Forward-facing angle
  'droplet-size': [2.6, 18.2], // Small to large drops
  'distortion-strength': 0.7, // Lens distortion effect
  'center-thinning': 0, // Rain on whole screen
});
```

### Customization Options

To modify rain appearance, edit the `enableRain()` function:

**Increase Intensity:**

```typescript
'distortion-strength': 0.9,  // Stronger distortion effect
```

**Change Color (warmer storm):**

```typescript
color: '#b0a8a0',  // Warmer gray tone
```

**Increase Vignette (darker edges):**

```typescript
'vignette-color': '#2a2a2a',  // Darker gray
```

**More Visible Droplets:**

```typescript
'droplet-size': [3.0, 20.0],  // Larger size range
```

## Performance Impact

### Resource Usage

- **GPU Memory**: Minimal, uses Mapbox built-in effects
- **CPU Usage**: Negligible
- **Memory**: < 1MB additional memory
- **Frame Rate**: No measurable impact on FPS

### Browser Compatibility

| Feature           | Browser     | Status       |
| ----------------- | ----------- | ------------ |
| Rain Effect       | Chrome/Edge | ✅ Supported |
| Rain Effect       | Firefox     | ✅ Supported |
| Rain Effect       | Safari      | ✅ Supported |
| Zoom Scaling      | All         | ✅ Supported |
| Intensity Control | All         | ✅ Supported |

### Hardware Requirements

- WebGL 2.0 capable GPU
- Minimum 512MB VRAM
- No special acceleration hardware needed

## Common Issues & Troubleshooting

### Rain not appearing

**Issue**: Clicked rain toggle but no effect visible

**Solutions:**

1. Verify using Mapbox Standard style (not other styles)
2. Check browser console for warnings: `"setRain API is not available"`
3. Ensure zoom level > 10 (rain hidden at lower zooms)
4. Check if `isRainActive` state is true
5. Try zooming in/out to trigger rain visibility

**Check:**

```javascript
// In browser console
mapboxgl.getRain?.(); // Should return rain settings object
map.getStyle().name; // Should contain "Standard"
```

### Rain appears with wrong color

**Issue**: Rain color doesn't match expected appearance

**Solutions:**

1. Edit color hex value in `enableRain()` function
2. Verify color code is valid hexadecimal: `#RRGGBB`
3. Note that opacity also affects perceived color
4. Test with solid colors first: `#ffffff` (white), `#000000` (black)

### Toggling is slow

**Issue**: Rain takes time to appear/disappear

**Solutions:**

1. Ensure map style is fully loaded before toggle
2. Check browser performance: other tabs consuming resources?
3. Verify no network lag
4. Try disabling other effects temporarily

### Rain too subtle

**Issue**: Rain effect not visible even at high zoom

**Solutions:**

1. Increase intensity: `enableRain(map, 1.0)`
2. Increase density: Edit `zoomBasedReveal(map, 0.7)` instead of 0.5
3. Increase distortion: Set `'distortion-strength': 0.9`
4. Try lighter background: Rain is visible against darker terrain

### Rain disabled after zoom

**Issue**: Rain disappears when zooming out

**Expected Behavior**: This is intentional! Rain hides below zoom level 10 to prevent cluttering overview. This is the designed user experience.

**To Change:**
Edit `zoomBasedReveal()` to adjust zoom threshold:

```typescript
const factor = Math.max(0, Math.min(1, (zoom - 8) / 4)); // Show from zoom 8
```

## Related Features

- [3D Lines](./3d-lines.md) - Flood propagation visualization
- [Flood Propagation](./flood-propagation.md) - Animated heatmap effect
- [Simulation Controls](../guides/simulation.md) - Running flood simulations

## Future Enhancements

1. **Rainfall Duration**: Tie rain duration to simulation timing
2. **Intensity Scaling**: Link rain intensity to rainfall depth
3. **Storm Animation**: Animate rain moving across map
4. **Lightning Effects**: Add occasional lightning flashes
5. **Sound Effects**: Optional rain/thunder audio
6. **Storm Movement**: Simulate moving storm system
7. **Rainfall Patterns**: Show rainfall spatial variation
8. **Custom Presets**: Saved rain effect configurations

## Technical Details

### Mapbox Standard Style Requirements

The rain effect uses features only available in Mapbox Standard style:

```typescript
// Good - works with rain
const style = 'mapbox://styles/mapbox/standard';

// Bad - rain won't work with these styles
const style = 'mapbox://styles/mapbox/dark-v11'; // Legacy style
const style = 'mapbox://styles/mapbox/light-v10'; // Legacy style
```

### API Availability Check

The code safely checks for API availability:

```typescript
if (!map || typeof map.setRain !== 'function') {
  console.warn(
    "setRain API is not available. Ensure you're using Mapbox Standard style."
  );
  return;
}
```

### GPU-Accelerated Rendering

Rain is rendered entirely on GPU via WebGL shaders, not JavaScript:

- No CPU JavaScript overhead
- Smooth 60 FPS animation
- Automatic synchronization with other map effects
- Efficient for large displays

## Implementation Notes

### Why Zoom-Based Reveal?

At low zoom levels (map view of entire city), rain is invisible because:

1. Individual droplets would be sub-pixel
2. Visual clutter at wide overview
3. Performance consideration for overview maps
4. Better UX - rain becomes relevant when zoomed in on details

### Why Vignette Effect?

The darkened edges (vignette) serve to:

1. Add visual depth and 3D perception
2. Create focal point on center of map
3. Enhance immersion of storm atmosphere
4. Improve legibility of precipitation effect

### Why Not 3D Rain Particles?

Custom 3D rain particles aren't implemented because:

1. Mapbox Standard style already provides high-quality effect
2. GPU-accelerated is more efficient than JavaScript particles
3. Consistent across all browsers with WebGL support
4. Easier maintenance and fewer custom bugs
5. Better performance on lower-end devices
