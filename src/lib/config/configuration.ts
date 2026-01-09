// ============================================================================
// BACKGROUND EFFECTS CONFIGURATION
// ============================================================================
// Easy manual tweaking for all background visualizer effects.
// Modify these values to customize the visual appearance.
// ============================================================================

export const CONFIG = {
  // --- COLORS ---
  // RGB values from 0-1 (not 0-255)
  colors: {
    cyan: { r: 0.133, g: 0.827, b: 0.933 },
    pink: { r: 0.925, g: 0.282, b: 0.600 },
  },

  // --- ORBS STYLE ---
  // Soft glowing orbs that drift upward
  orbs: {
    baseCount: 150,              // Number of particles (before screen scaling)
    sizeMin: 30,                 // Minimum particle size (px)
    sizeMax: 70,                 // Maximum particle size (px)
    velocityX: 0.5,              // Horizontal drift range (-vel to +vel)
    velocityYMin: -0.3,          // Minimum vertical velocity (negative = up)
    velocityYMax: -0.8,          // Maximum vertical velocity
    alphaMin: 0.5,               // Minimum alpha (opacity)
    alphaMax: 0.85,              // Maximum alpha (opacity)
    // Large background orbs (ambient layer)
    largeOrbCount: 25,           // Number of large background orbs
    largeSizeMin: 150,           // Large orb min size (px)
    largeSizeMax: 350,           // Large orb max size (px)
    largeAlphaMin: 0.03,         // Large orb min alpha (very dim)
    largeAlphaMax: 0.08,         // Large orb max alpha
  },

  // --- STARS STYLE ---
  // Twinkling star-shaped particles
  stars: {
    baseCount: 300,              // Number of particles
    sizeMin: 8,                  // Minimum particle size (px)
    sizeMax: 23,                 // Maximum particle size (px)
    velocityRange: 0.3,          // Velocity range for both X and Y
    alphaMin: 0.6,               // Minimum alpha
    alphaMax: 0.8,               // Maximum alpha
    twinkleSpeedMin: 1,          // Minimum twinkle speed
    twinkleSpeedMax: 4,          // Maximum twinkle speed
  },

  // --- TRAILS STYLE ---
  // Flowing dots that leave fading trails behind them
  trails: {
    baseCount: 300,              // Number of particles
    sizeMin: 10,                 // Minimum particle size (px)
    sizeMax: 40,                 // Maximum particle size (px)
    speed: 3,                    // Base movement speed
    speedVariation: 6,           // Max random speed variation (0 = all same speed)
    directionChangeBeats: 2,     // Change direction every N beats
    fadeFactor: 0.97,            // Trail persistence (0.90 = short, 0.99 = long)
    alphaMin: 0.5,               // Minimum alpha
    alphaMax: 0.65,              // Maximum alpha
  },

  // --- QUASAR STYLE ---
  // Animated neon pattern with white lines and colored seed glow
  quasar: {
    scale: 8.0,                  // Base cells per screen width (varies with density)
    orbitRadius: 0.5,            // Orbit radius relative to cell (0.2-0.4 recommended)
    edgeWidth: 0.005,            // Edge line thickness (smaller = thinner lines)
    glowIntensity: 2.0,          // Seed point glow brightness (1.0-3.0 range)
    dotSize: 0.05,               // Seed point radius
    bassReactivity: 1.0,         // How much dots/glow react to bass (1.0 = double, 2.0 = triple)
    bloomRadius: 8.0,            // Bloom blur radius in pixels
    bloomIntensity: 0.6,         // Bloom strength (0.3-1.0 range)
  },

  // --- OSCILLO STYLE ---
  // Audio-reactive oscilloscope with zooming trails and beat rotation
  oscillo: {
    lineWidth: 3.0,              // Oscilloscope line thickness (px)
    waveAmplitude: 0.3,          // Vertical amplitude (0-1 of screen height)
    trailDecay: 0.985,           // Trail persistence (0.95=short, 0.99=long)
    zoomSpeed: 1.01,             // Zoom per frame (1.01 = 1% zoom toward center)
    rotationImpulse: 0.08,       // Trail rotation per beat (radians, ~4.5 degrees)
    rotationDecay: 0.9975,       // Trail rotation decay per frame (0.99=fast, 0.999=slow)
    glowIntensity: 1.5,          // Neon glow brightness
    beatThreshold: 1.4,          // Energy spike threshold for beat detection
    beatMinInterval: 300,        // Min ms between beat triggers
    colorCycleSpeed: 0.15,       // Color cycle speed (full magenta-cyan-magenta per second)
  },

  // --- LAVA STYLE ---
  // Metaball lava lamp with flowing blobs
  lava: {
    metaballCount: 10,           // Number of metaballs (8-12 recommended)
    renderScale: 0.25,           // Low-res render scale (0.25 = 1/4 resolution)
    threshold: 1.0,              // Metaball threshold (0.8-1.2 range)
    edgeSharpness: 0.15,         // Edge transition width (smaller = sharper, 0.1-0.4)
    baseSpeed: 0.2,              // Base vertical flow speed
    horizontalDrift: 0.08,       // Horizontal movement range
    radiusMin: 0.12,             // Minimum metaball radius
    radiusMax: 0.22,             // Maximum metaball radius
    pulseAmount: 0.02,           // Size pulsing amplitude
    pulseSpeed: 1.5,             // Size pulsing speed
    glowIntensity: 0.15,         // Glow amount at edges
    bassRadiusBoost: 0.15,       // How much bass increases radius
    bassSpeedBoost: 0.3,         // How much bass increases speed
  },

  // --- MUSIC REACTIVITY ---
  // How particles respond to audio
  reactivity: {
    bassSizeMultiplier: 0.5,     // How much bass affects size (0-1)
    bassAlphaMultiplier: 0.1,    // How much bass affects alpha
    trebleColorShift: 0.3,       // How much treble shifts color toward pink
    particleReactivityMin: 0.3,  // Min individual particle reactivity
    particleReactivityMax: 1.0,  // Max individual particle reactivity
    // Vertex shader bass reaction
    vertexBassSizeMin: 0.7,      // Minimum size multiplier
    vertexBassSizeMax: 0.8,      // Bass contribution to size
  },

  // --- IDLE MODE ---
  // Values used when no music is playing
  idle: {
    intensity: 0.3,
    bass: 0.1,
    treble: 0.1,
  },
};
