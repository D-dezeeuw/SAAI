// ============================================================================
// APP CONFIGURATION
// ============================================================================
// Default values for UI elements and initial state.
// Modify these values to customize the default behavior.
// ============================================================================

/**
 * Convert hex color to RGB values in 0-1 range (for WebGL shaders)
 */
export function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 0, g: 0, b: 0 };
}

export const APP_CONFIG = {
  // --- THEME COLORS ---
  // Primary theme colors with variants
  colors: {
    // Primary - visualizers, active states, accents (cyan)
    primary: { base: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
    // Secondary - logo gradient, playhead, accents (pink)
    secondary: { base: '#ec4899', light: '#f472b6', dark: '#db2777' },
    // Tertiary - AI-related UI elements (purple)
    tertiary: { base: '#8b5cf6', light: '#a78bfa', lighter: '#c4b5fd', dark: '#7c3aed' },

    // Semantic colors
    green: { base: '#22c55e', dark: '#16a34a' },
    amber: { base: '#f59e0b', dark: '#d97706' },
    red: '#ef4444',
    gray: { base: '#6b7280', dark: '#4b5563', light: '#9ca3af' },
  },

  // --- DEFAULT PROMPT ---
  // The default text shown in the prompt input field
  defaultPrompt: 'Create an upbeat electronic music track with drums and bass and melodic synths.',

  // --- DEFAULT GENRE ---
  // Options: '' (no genre), 'edm', 'dnb', 'hiphop-trap', 'acid', 'jazz'
  defaultGenre: 'edm',

  // --- DEFAULT DRUM KIT ---
  // Options: '' (default), 'RolandTR909', 'RolandTR808', 'RolandTR707',
  //          'LinnDrum', 'AkaiLinn', 'KorgM1', 'AlesisHR16'
  defaultDrumKit: '',

  // --- DEFAULT STRUDEL CODE ---
  // The initial code shown in the editor when the app loads
  defaultCode: `// Welcome to SAAI - Strudel Augmented Artificial Intelligence
// Use the AI panel (✦) to generate music, or write your own code below!

setcps(138/60/4)

const Volume = 30; // 0-100
const Mute = 1 // 0 = mute / 1 = no-mute

stack(
  s("bd:5*4").gain(1.2),
  s("~ ~ 808oh ~ ~ ~ 808oh ~ ~ ~ 808oh ~ ~ ~ 808oh ~"),
  s("~ ~ ~ ~ cp ~ ~ ~ ~ ~ ~ ~ cp ~ ~ ~").gain(0.4),
  s("hh*16").gain("1 0.6 0.8 0.6").room(0.4),
  note("~ e1 e1 e1 ~ e1 e1 e1 ~ e1 e1 e1 ~ e1 e1 e1")
    .s("sawtooth")
    .lpf(800)
    .gain(0.7),
  note("<[e3 ~ ~ g3 ~ ~ b3 ~ e4 ~ ~ d4 ~ b3 ~ ~] [c3 ~ ~ e3 ~ ~ g3 ~ c4 ~ ~ b3 ~ g3 ~ ~] [d3 ~ ~ f3 ~ ~ a3 ~ d4 ~ ~ c4 ~ a3 ~ ~] [b2 ~ ~ d3 ~ ~ f3 ~ b3 ~ ~ a3 ~ f3 ~ ~]>")
    .s("sawtooth")
    .lpf(sine.range(500, 5000).slow(8))
    .chorus(0.5)
    .delay(0.3)
    .delayfb(0.4)
    .room(0.6)
    .gain(0.5)
   
).gain((Volume*Mute)/100)`,

  // --- DEFAULT BACKGROUND EFFECT ---
  // Options: 'none', 'orbs', 'stars', 'trails', 'quasar', 'oscillo', 'lava'
  defaultBackgroundEffect: 'lava',

  // --- DEFAULT VISUALIZER STATE ---
  // Whether audio visualizers (scope, spectrum, pianoroll) are on by default
  audioVisualizersEnabled: false,

  // --- DEFAULT PANEL VISIBILITY ---
  // Control which UI panels are visible by default
  generatePanelVisible: false,    // AI generation panel (✦ button)
  codeSectionVisible: false,      // Code editor section
  alterSectionVisible: true,     // Alter/evolve section
};
