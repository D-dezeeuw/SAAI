// ============================================================================
// BACKGROUND EFFECTS CONFIGURATION
// ============================================================================
// Easy manual tweaking for all background visualizer effects.
// Modify these values to customize the visual appearance.
// ============================================================================

import { APP_CONFIG, hexToRgb01 } from './appConfig';

export const CONFIG = {
  // --- COLORS ---
  // RGB values from 0-1 (derived from appConfig theme colors)
  colors: {
    cyan: hexToRgb01(APP_CONFIG.colors.primary.base),
    pink: hexToRgb01(APP_CONFIG.colors.secondary.base),
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
    // Easing and beat detection
    bassEaseSpeed: 8.0,          // How fast bass easing responds (higher = faster)
    beatBoost: 1,              // Extra size boost on beat detection (0-1)
    beatDecay: 0.92,             // How fast beat boost decays per frame (0.9 = fast, 0.99 = slow)
    beatThreshold: 2.2,          // Energy spike threshold for beat detection
    beatMinInterval: 200,        // Minimum ms between beat triggers
    energyCutoff: 500,           // Minimum energy to trigger beat detection
  },

  // --- OSCILLO STYLE ---
  // Audio-reactive oscilloscope with zooming trails and beat rotation
  oscillo: {
    lineWidth: 3.0,              // Oscilloscope line thickness (px)
    waveAmplitude: 0.3,          // Vertical amplitude (0-1 of screen height)
    trailDecay: 0.985,           // Trail persistence (0.95=short, 0.99=long)
    zoomSpeed: 1.01,             // Zoom per frame (1.01 = 1% zoom toward center)
    rotationImpulse: 0.5,           // Rotation per beat (divided by 100, so 8 = 0.08 radians ~4.5°)
    maxRotation: 5,               // Maximum rotation limit (divided by 100, so 1 = 0.01 radians)
    rotationDecay: 0.995,       // Trail rotation decay per frame (0.99=fast, 0.999=slow)
    glowIntensity: 1.5,          // Neon glow brightness
    beatThreshold: 1.2,          // Energy spike threshold (1.2 = 20% above average)
    beatMinInterval: 200,        // Minimum ms between beat triggers
    energyCutoff: 500,           // Minimum energy to trigger beat detection (lower = more sensitive)
    colorCycleSpeed: 0.15,       // Color cycle speed (full magenta-cyan-magenta per second)
  },

  // --- LAVA STYLE ---
  // Metaball lava lamp with flowing blobs
  // Two-color system: same colors merge, overlaps create vibrant difference blend
  lava: {
    metaballCount: 15,           // Number of metaballs (8-12 recommended)
    renderScale: 1,              // Render scale (0.75 = 3/4 resolution)
    threshold: 3,                // Metaball threshold (higher = harder cutoff)
    edgeSharpness: 0.10,         // Edge transition width (smaller = sharper)
    globalSpeed: 0.5,            // Global speed multiplier (0.5 = half speed, 2.0 = double speed)
    horizontalDrift: 0.25,       // Horizontal movement range
    radiusMin: 0.08,             // Minimum metaball radius
    radiusMax: 0.22,             // Maximum metaball radius
    pulseAmount: 0.02,           // Size pulsing amplitude
    pulseSpeed: 1.5,             // Size pulsing speed
    glowIntensity: 0.08,         // Subtle inner glow (reduced for high contrast)
    bassRadiusBoost: 0.15,       // How much bass increases radius
    bassSpeedBoost: 0.3,         // How much bass increases speed
    bassEaseSpeed: 8.0,          // How fast bass easing responds (higher = faster)
    coolIntensity: 3.0,          // Cooling zone divisor (higher = gentler cooling)
    heatIntensity: 1.5,          // Heating zone multiplier (higher = stronger upward push)
    // Glow effect (rendered underneath metaballs)
    glowEnabled: true,           // Enable/disable glow pass
    glowScale: 1.75,             // Glow render scale (lower = more blur, 0.25 = 1/4 res)
    glowOpacity: 0.8,            // Glow opacity (0-1)
    glowSpread: 1.0,             // How much larger the glow is vs metaballs
    glowBrightness: 1.0,         // Color intensity multiplier (1.0 = normal, 2.0 = 2x bright)
    glowBlurRadius: 12.0,         // Gaussian blur spread in texels (higher = softer glow)
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

  // --- PIANOROLL ---
  // Piano roll visualization settings
  pianoroll: {
    minMidi: 48,                   // Minimum MIDI note to display (C3=48, C2=36, 0=show all)
  },
};
