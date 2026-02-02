export const SIMULATION_MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';
export const SIMULATION_PITCH = 60;
export const SIMULATION_BEARING = -17.6;

// ============================================
// TRANSITION & ANIMATION CONFIGURATION
// ============================================

// Transition settings for smooth animations
export const TRANSITION_CONFIG = {
  duration: 500, // Animation duration in milliseconds
  delay: 0, // Delay before animation starts
};

// Camera animation settings for flyTo transitions
// For silky smooth camera movement:
// - Lower speed (0.6-1.0 for smooth, cinematic feel)
// - Moderate curve (1.0-1.5 for natural arc)
// - Add easing for smooth acceleration/deceleration
export const CAMERA_ANIMATION = {
  speed: 0.8, // Slower speed = smoother, more cinematic
  curve: 1.2, // Gentle arc for natural movement
  targetZoom: 18, // Zoom level when selecting a feature
  essential: true, // Ensures animation is not skipped even if user prefers reduced motion

  // Easing function for smooth acceleration/deceleration
  easing: (t: number) => t * (2 - t), // easeOutQuad for smooth deceleration
};

// ============================================
// LAYER COLOR & STYLE CONFIGURATION
// ============================================

export const LAYER_COLORS = {
  man_pipes: {
    color: '#8558c9', // Dark magenta/purple for pipes
    selectedColor: '#dc2eef', // Bright magenta when selected
    width: 2.5, // Normal line width
    selectedWidth: 6, // Selected line width
  },
  storm_drains: {
    color: '#5687ca', // Blue for storm drains
    selectedColor: '#49a8ff', // Cyan when selected
    strokeColor: '#00346c', // Dark blue border
    selectedStrokeColor: '#355491', // Lighter border when selected
    radius: 4, // Normal circle radius
    selectedRadius: 10, // Selected circle radius
    strokeWidth: 0.5, // Normal border width
    selectedStrokeWidth: 1, // Selected border width
  },
  inlets: {
    color: '#00ca67', // Green for inlets
    selectedColor: '#66ed7b', // Light green when selected
    strokeColor: '#005400', // Dark green border
    selectedStrokeColor: '#307524', // Lighter border when selected
    radius: 6, // Normal circle radius
    selectedRadius: 12, // Selected circle radius
    strokeWidth: 0.5, // Normal border width
    selectedStrokeWidth: 1.2, // Selected border width
  },
  outlets: {
    color: '#dd4337', // Red for outlets
    selectedColor: '#ff4b50', // Bright red when selected
    strokeColor: '#6a0000', // Dark red border
    selectedStrokeColor: '#7e1c14', // Lighter border when selected
    radius: 6, // Normal circle radius
    selectedRadius: 12, // Selected circle radius
    strokeWidth: 0.5, // Normal border width
    selectedStrokeWidth: 1.2, // Selected border width
  },
} as const;

export const SIMULATION_LAYERS = [
  { id: 'man_pipes-layer', name: 'Pipes', color: LAYER_COLORS.man_pipes.color },
  {
    id: 'storm_drains-layer',
    name: 'Storm Drains',
    color: LAYER_COLORS.storm_drains.color,
  },
  { id: 'inlets-layer', name: 'Inlets', color: LAYER_COLORS.inlets.color },
  { id: 'outlets-layer', name: 'Outlets', color: LAYER_COLORS.outlets.color },
];

export const SIMULATION_LAYER_IDS = SIMULATION_LAYERS.map((layer) => layer.id);

// ============================================
// HELPER FUNCTIONS FOR LAYER PAINT CONFIGURATION
// ============================================

/**
 * Get paint configuration for line layers (pipes)
 */
export function getLinePaintConfig(layerType: keyof typeof LAYER_COLORS) {
  const config = LAYER_COLORS[layerType];
  if (!('width' in config)) {
    throw new Error(`Layer type ${layerType} is not a line layer`);
  }

  return {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      config.selectedColor,
      config.color,
    ] as unknown as string,
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      config.selectedWidth,
      config.width,
    ] as unknown as number,
    'line-color-transition': {
      duration: TRANSITION_CONFIG.duration,
      delay: TRANSITION_CONFIG.delay,
    },
    'line-width-transition': {
      duration: TRANSITION_CONFIG.duration,
      delay: TRANSITION_CONFIG.delay,
    },
  };
}

/**
 * Get paint configuration for circle layers (storm drains, inlets, outlets)
 */
export function getCirclePaintConfig(layerType: keyof typeof LAYER_COLORS) {
  const config = LAYER_COLORS[layerType];
  if (!('radius' in config)) {
    throw new Error(`Layer type ${layerType} is not a circle layer`);
  }

  return {
    'circle-radius': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      config.selectedRadius,
      config.radius,
    ] as unknown as number,
    'circle-color': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      config.selectedColor,
      config.color,
    ] as unknown as string,
    'circle-stroke-color': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      config.selectedStrokeColor,
      config.strokeColor,
    ] as unknown as string,
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'selected'], false],
      config.selectedStrokeWidth,
      config.strokeWidth,
    ] as unknown as number,
    'circle-radius-transition': {
      duration: TRANSITION_CONFIG.duration,
      delay: TRANSITION_CONFIG.delay,
    },
    'circle-color-transition': {
      duration: TRANSITION_CONFIG.duration,
      delay: TRANSITION_CONFIG.delay,
    },
    'circle-stroke-color-transition': {
      duration: TRANSITION_CONFIG.duration,
      delay: TRANSITION_CONFIG.delay,
    },
    'circle-stroke-width-transition': {
      duration: TRANSITION_CONFIG.duration,
      delay: TRANSITION_CONFIG.delay,
    },
  };
}
