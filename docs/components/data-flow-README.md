# DataFlowPipeline Component

An animated SVG component that displays a flowing data pipeline with an optional interactive map background overlay.

## Features

- **Animated Pipeline**: Smooth path animation using Framer Motion
- **Interactive Map**: Hover over map sections to highlight them (optional)
- **Map Background**: Optional drainage infrastructure map overlay from `public/icons/map.svg`
- **Flexible Layout**: Can be used as absolute background or inline element
- **Customizable Opacity**: Control map visibility with `mapOpacity` prop
- **Theme Support**: Map colors adapt to light/dark mode via Tailwind
- **Callbacks**: React to hover and click events on map paths
- **Debug Mode**: Visual confirmation during development

## Installation

The component is already included in the project at:
```
components/data-flow.tsx
```

## Usage

### Basic Usage (No Map)

```tsx
import DataFlowPipeline from "@/components/data-flow";

export default function MyPage() {
  return (
    <div className="relative h-screen">
      <DataFlowPipeline background cover />
      {/* Your content here */}
    </div>
  );
}
```

### With Map Background

```tsx
<DataFlowPipeline
  background
  showMap
  mapOpacity={0.15}
/>
```

### Inline Element (Not Background)

```tsx
<div className="w-full h-96">
  <DataFlowPipeline
    cover={false}
    showMap
    mapOpacity={0.3}
  />
</div>
```

### Interactive Map with Hover (Full Shape Area)

**NEW: The entire shape area is now hoverable, not just the thin border!**

```tsx
<DataFlowPipeline
  background
  showMap
  mapOpacity={0.2}
  enableHover
  hoverColor="#3b82f6"  // Blue color on hover
  fillOnHover={true}    // Default: Makes entire shape area hoverable
  fillOpacity={0.2}     // Default: 20% opacity fill on hover
/>
```

### Border-Only Hover (Legacy)

If you prefer only the border to be hoverable (harder to target):

```tsx
<DataFlowPipeline
  background
  showMap
  enableHover
  fillOnHover={false}  // Only thin border stroke is hoverable
/>
```

### With Hover Callbacks

```tsx
<DataFlowPipeline
  background
  showMap
  enableHover
  onPathHover={(pathId) => {
    console.log('Currently hovering:', pathId);
    // Update external state, show tooltip, etc.
  }}
  onPathClick={(pathId) => {
    console.log('Clicked path:', pathId);
    // Navigate, show details, etc.
  }}
/>
```

### Debug Mode

```tsx
<DataFlowPipeline
  background
  showMap
  mapOpacity={0.5}
  debug={true}  // Shows red background to confirm positioning
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `background` | `boolean` | `false` | Render as absolutely-positioned background filling parent |
| `cover` | `boolean` | `true` | When `true`, uses "cover" aspect ratio (fills container). When `false`, uses "fit" |
| `showMap` | `boolean` | `false` | Display the drainage map SVG as a background layer |
| `mapOpacity` | `number` | `0.15` | Opacity of the map overlay (0-1 range) |
| `enableHover` | `boolean` | `false` | Enable hover interactions on map paths |
| `hoverColor` | `string` | `"#3b82f6"` | Color to use when hovering over a path (CSS color value) |
| `fillOnHover` | `boolean` | `true` | **NEW:** Fill shapes on hover, making entire area hoverable (not just border) |
| `fillOpacity` | `number` | `0.2` | **NEW:** Opacity of fill when hovering (0-1 range) |
| `onPathHover` | `(pathId: string \| null) => void` | `undefined` | Callback fired when hovering/leaving a path. `null` when not hovering |
| `onPathClick` | `(pathId: string) => void` | `undefined` | Callback fired when clicking a path |
| `debug` | `boolean` | `false` | Show red background for visual debugging |
| `className` | `string` | `""` | Additional CSS classes |

## Styling

The map adapts to your theme automatically:
- **Light Mode**: Gray map (`text-gray-400`)
- **Dark Mode**: Darker gray map (`text-gray-600`)

### Custom Map Colors

Modify the `className` on the map group in `data-flow.tsx`:

```tsx
<g
  opacity={mapOpacity}
  className="fill-current text-blue-300 dark:text-blue-700"  // Custom colors
>
```

### Adjusting Map Size/Position

Modify the `transform` attribute:

```tsx
<g
  transform="translate(50, 0) scale(0.95)"  // Move right 50px, scale to 95%
>
```

## Animation

The component features:
- **Pipeline Animation**: 8-second linear animation of the blue flow
- **Base Pipe**: 1.6-second ease-in-out reveal
- **Delay**: 400ms before animations start

## Examples in Project

See the home page for a live example:
```
app/page.tsx (line 97-103)
```

## Map Source

The map SVG paths are extracted from:
```
public/icons/map.svg
```

The original map is a complex drainage infrastructure diagram with 60+ path elements representing pipe networks.

## Interactive Features

### Path IDs

Each map path has a unique ID (`path-1` through `path-191`) that you can use to:
- Track which section is being hovered
- Store selected paths in state
- Display contextual information
- Trigger navigation or modals

### Hover Behavior

When `enableHover` is enabled:
- **Entire shape area is hoverable** (when `fillOnHover=true`, default)
  - No need to precisely target the thin border stroke
  - Hover anywhere inside the shape boundaries
- **Only one path triggers at a time** - event propagation is prevented
  - Even if paths overlap visually, only the topmost path responds
  - Click/hover events don't bubble to underlying paths
- Paths change color on hover (controlled by `hoverColor`)
- Shape fills with semi-transparent color (controlled by `fillOpacity`)
- Stroke width increases from 2 to 3 for better visibility
- Smooth 200ms transition animation
- Cursor changes to pointer
- Callbacks fire with the path ID

**Legacy mode:** Set `fillOnHover={false}` to only make the border stroke hoverable (harder to use)

### Use Cases

- **Info Panels**: Show details about specific drainage sections
- **Navigation**: Click to navigate to detailed views
- **Selection**: Build a multi-select interface
- **Visualization**: Highlight problem areas or maintenance schedules
- **Analytics**: Track user interaction with different map sections

## Performance

- Uses Framer Motion for GPU-accelerated animations
- SVG is inline (no extra HTTP request)
- Map layer is conditionally rendered (`showMap` prop)
- Pointer events conditionally enabled only when needed
- Hover state managed efficiently with React state

## Troubleshooting

### Map Not Visible
- Check `showMap={true}` is set
- Increase `mapOpacity` (try `0.5` for testing)
- Enable `debug={true}` to confirm positioning

### Hover Not Working
- Ensure `enableHover={true}` is set
- Check that `showMap={true}` is also enabled (hover requires map to be visible)
- Verify pointer events aren't being blocked by other elements with higher z-index
- Check browser console for errors

### Hover Area Too Small / Hard to Target
- **Solution:** Ensure `fillOnHover={true}` (default) - makes entire shape area hoverable
- If still difficult, increase `fillOpacity` to see the hoverable area more clearly
- Legacy `fillOnHover={false}` mode only makes the 2px border hoverable (not recommended)

### Multiple Paths Triggering on Single Click
- **Fixed:** Event propagation is automatically stopped (`event.stopPropagation()`)
- Only the topmost/clicked path will trigger, even if paths overlap visually
- You should see only ONE console log per click in the browser console
- If you still see multiple triggers, check for:
  - Other event listeners attached elsewhere in your code
  - Z-index issues causing wrong path to be on top

### Map Too Dark/Light
- Adjust `mapOpacity` value
- Customize theme colors in the className

### Hover Color Not Changing
- Verify `hoverColor` prop is a valid CSS color
- Check that paths aren't inheriting conflicting styles
- Increase `mapOpacity` to see the hover effect more clearly

### Map Doesn't Fit
- Try `cover={false}` for "fit" mode
- Adjust the `scale()` in the transform
- Modify the SVG viewBox dimensions

## Future Enhancements

Potential improvements:
- [ ] Animated map fade-in
- [x] Interactive map highlighting (implemented with `enableHover`)
- [ ] Multiple color schemes / themes
- [ ] Tooltip component showing area names
- [ ] Path name mapping (path-1 → "North Drainage Zone")
- [ ] Selected state persistence
- [ ] Multi-select functionality
- [ ] Export as separate Map component
- [ ] Add map legends/labels
