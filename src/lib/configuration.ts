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
    speed: 1.5,                  // Base movement speed
    speedVariation: 10,          // Max random speed variation (0 = all same speed)
    directionChangeBeats: 2,     // Change direction every N beats
    fadeFactor: 0.97,            // Trail persistence (0.90 = short, 0.99 = long)
    alphaMin: 0.5,               // Minimum alpha
    alphaMax: 0.65,              // Maximum alpha
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
