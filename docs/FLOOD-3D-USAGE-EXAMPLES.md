# 3D Flood Effect - Usage Examples

## Quick Start

The 3D flood effect is **automatically enabled** when you generate vulnerability tables in the simulation page. No additional code needed!

### Model 2 (Historical Flood Data)
1. Go to simulation page
2. Select "Model 2: Historical Flood Data" tab
3. Choose a year return period (2YR, 5YR, 10YR, etc.)
4. Click "Generate Vulnerability Table"
5. Watch the 3D flood effect animate! 🌊

### Model 3 (Custom Simulation)
1. Go to simulation page
2. Select "Model 3: Custom Simulation" tab
3. Select components and configure parameters
4. Click "Run Simulation"
5. Watch the 3D flood effect animate! 🌊

## What You'll See

When the vulnerability table is generated:

1. **Rain starts falling** from the sky ☔
2. **3D water rises** from the ground at each flooded node
3. **Colors indicate risk**:
   - 🔴 Red = High Risk
   - 🟠 Orange = Medium Risk
   - 🟡 Yellow = Low Risk
   - 🟢 Green = No Risk
4. **Animation duration**: 3 seconds smooth rise
5. **Height**: Proportional to flood volume

## State Management

The effect is automatically managed:

```typescript
// State variable
const [isFlood3DActive, setIsFlood3DActive] = useState(false);

// Enabled when table generates
✅ handleGenerateTable() → enables flood
✅ handleGenerateTable3() → enables flood

// Disabled when table closes
✅ handleCloseTable() → disables flood
✅ handleCloseTable3() → disables flood
✅ handleClosePopUps() → disables flood
```

## Manual Control (Optional)

If you want to add manual controls, here's how:

### Add Toggle Button to Control Panel

Edit `components/control-panel/tabs/simulations-content.tsx`:

```tsx
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Add to your component props
interface SimulationsContentProps {
  // ... existing props
  isFlood3DActive?: boolean;
  onToggleFlood3D?: (enabled: boolean) => void;
}

// Add to your JSX (after the rain toggle)
<div className="flex items-center justify-between">
  <Label htmlFor="flood-3d-toggle">3D Flood Effect</Label>
  <Switch
    id="flood-3d-toggle"
    checked={isFlood3DActive}
    onCheckedChange={onToggleFlood3D}
    disabled={!hasTable && !hasTable3}
  />
</div>
```

### Pass Props from Simulation Page

Update the ControlPanel component call in [page.tsx](../app/simulation/page.tsx:1337-1396):

```tsx
<ControlPanel
  // ... existing props
  isFlood3DActive={isFlood3DActive}
  onToggleFlood3D={handleToggleFlood3D}
/>
```

## Programmatic Control

### Show/Hide Without Removing

```typescript
// Hide the effect (data remains)
toggleFlood3D(mapRef.current, false);
setIsFlood3DActive(false);

// Show it again
toggleFlood3D(mapRef.current, true);
setIsFlood3DActive(true);
```

### Update with New Data

```typescript
// Update flood visualization with new data without re-adding the layer
updateFlood3D(
  mapRef.current,
  newFloodData,
  inletsRef.current,
  drainsRef.current,
  15 // radius
);
```

### Complete Removal

```typescript
// Remove layer and source completely
disableFlood3D(mapRef.current);
setIsFlood3DActive(false);
```

## Customization Examples

### Example 1: Larger Flood Areas

Make flood circles bigger for better visibility:

```typescript
// In handleGenerateTable or handleGenerateTable3
enableFlood3D(mapRef.current, data, inletsRef.current, drainsRef.current, {
  radius: 25, // Increased from 15
  opacity: 0.7,
  animate: true,
  animationDuration: 3000,
});
```

### Example 2: Instant Display (No Animation)

Skip animation for immediate results:

```typescript
enableFlood3D(mapRef.current, data, inletsRef.current, drainsRef.current, {
  radius: 15,
  opacity: 0.7,
  animate: false, // No animation
});
```

### Example 3: Dramatic Slow Rise

Create a more dramatic effect with slower animation:

```typescript
enableFlood3D(mapRef.current, data, inletsRef.current, drainsRef.current, {
  radius: 20,
  opacity: 0.8,
  animate: true,
  animationDuration: 6000, // 6 seconds
});
```

### Example 4: Subtle Transparency

Make flood less opaque for seeing underlying layers:

```typescript
enableFlood3D(mapRef.current, data, inletsRef.current, drainsRef.current, {
  radius: 15,
  opacity: 0.5, // More transparent
  animate: true,
  animationDuration: 3000,
});
```

## Integration with Camera Controls

### Auto-Adjust Pitch for Best 3D View

```typescript
// After enabling flood, adjust camera for optimal viewing
mapRef.current?.easeTo({
  pitch: 60, // Good angle for 3D
  bearing: 0,
  duration: 2000,
});
```

### Fly to Worst Flooding Area

```typescript
// Find node with highest flood volume
const worstNode = floodData.reduce((max, node) =>
  node.Total_Flood_Volume > max.Total_Flood_Volume ? node : max
);

// Find coordinates
const inlet = inletsRef.current.find(i => i.id === worstNode.Node_ID);
if (inlet) {
  mapRef.current?.flyTo({
    center: inlet.coordinates,
    zoom: 17,
    pitch: 60,
    bearing: 45,
    duration: 3000,
  });
}
```

## Combining Effects

### Rain + 3D Flood + Terrain

The simulation already combines these perfectly:

```typescript
// This happens automatically in handleGenerateTable
1. Apply vulnerability colors to nodes
2. Enable rain effect ☔
3. Enable 3D flood effect 🌊
4. Terrain already enabled (line 353)

Result: Immersive 3D flood visualization! 🎬
```

### Add Fog for Atmosphere (Optional)

```typescript
// Add fog for dramatic effect
map.setFog({
  'range': [0.8, 8],
  'color': '#d4e5f5',
  'horizon-blend': 0.1,
  'high-color': '#87CEEB',
  'space-color': '#000000',
  'star-intensity': 0.15
});
```

## Tips & Best Practices

### 1. Camera Angle
- **Pitch**: 45-60° works best for viewing 3D extrusions
- **Bearing**: 0° (north) or 45° for interesting angle
- **Zoom**: 15-17 for detailed view

### 2. Performance
- Keep radius reasonable (10-25 meters)
- Limit animation duration (2-5 seconds)
- Don't enable multiple times without disabling first

### 3. User Experience
- Let animation complete before closing tables
- Show loading state during data fetch
- Provide clear visual feedback when effect is active

### 4. Debugging
```typescript
// Check if layer exists
console.log('Has flood layer:', !!mapRef.current?.getLayer('flood-3d-layer'));

// Check if source has data
const source = mapRef.current?.getSource('flood-3d') as mapboxgl.GeoJSONSource;
console.log('Flood source:', source);

// Log flood state
console.log('Flood active:', isFlood3DActive);
```

## Comparison: Before & After

### Before (Traditional 2D)
- Flat colored circles
- Hard to distinguish severity
- No depth perception
- Static visualization

### After (3D Flood Effect)
- Rising water columns
- Height indicates volume
- True 3D depth
- Animated presentation
- Dramatic visual impact

## Summary

The 3D flood effect is **ready to use** right now! Just:

1. Navigate to `/simulation`
2. Generate a vulnerability table (Model 2 or Model 3)
3. Watch the magic happen ✨

No additional configuration needed. The effect is automatically:
- ✅ Enabled when tables generate
- ✅ Disabled when tables close
- ✅ Cleaned up on unmount
- ✅ Synced with rain effects

For advanced customization, see the [main guide](./3D-FLOOD-EFFECT-GUIDE.md).
