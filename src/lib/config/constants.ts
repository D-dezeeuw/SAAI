/**
 * Application-wide constants
 * Consolidates magic numbers from across the codebase
 */

// =============================================================================
// UI & LAYOUT
// =============================================================================

/** Mobile breakpoint in pixels */
export const MOBILE_BREAKPOINT = 768;

/** Toast notification default duration in ms */
export const TOAST_DURATION_MS = 2000;

/** Toast fade animation duration in ms */
export const TOAST_FADE_MS = 300;

/** Code change debounce interval in ms */
export const DEBOUNCE_MS = 200;

/** Maximum metaballs for mobile devices (reduced for GPU compatibility) */
export const MOBILE_MAX_METABALLS = 40;

/** Evolution interval in ms (how often auto-evolve triggers) */
export const EVOLUTION_INTERVAL_MS = 10000;

// =============================================================================
// VISUALIZATION STYLES
// =============================================================================

/** Available visualization styles */
export const VIZ_STYLES = ['none', 'orbs', 'stars', 'trails', 'quasar', 'oscillo', 'lava'] as const;

/** Number of cycles to query for pianoroll display */
export const PIANOROLL_QUERY_CYCLES = 4;

// =============================================================================
// SCOPE VISUALIZER
// =============================================================================
// Note: SCOPE_COLOR moved to appConfig.ts colors.vizMagenta

/** Scope glow intensity */
export const SCOPE_GLOW_INTENSITY = 25;

/** Scope line width in pixels */
export const SCOPE_LINE_WIDTH = 2;

// =============================================================================
// LOGO GLOW
// =============================================================================

/** Minimum logo glow size */
export const LOGO_GLOW_MIN = 0;

/** Maximum logo glow size */
export const LOGO_GLOW_MAX = 10;

/** Logo glow base opacity */
export const LOGO_GLOW_BASE_OPACITY = 0.8;

/** Logo glow opacity reduction factor */
export const LOGO_GLOW_OPACITY_FACTOR = 0.3;

// =============================================================================
// AUDIO ANALYSIS
// =============================================================================

/** MIDI note threshold for bass (below C3) */
export const BASS_THRESHOLD_MIDI = 48;

/** MIDI note threshold for treble (above C5) */
export const TREBLE_THRESHOLD_MIDI = 72;

/** Divisor for intensity calculation */
export const INTENSITY_DIVISOR = 8;

/** Divisor for bass calculation */
export const BASS_DIVISOR = 3;

/** Divisor for treble calculation */
export const TREBLE_DIVISOR = 3;

/** Maximum intensity value before normalization */
export const MAX_INTENSITY = 2;

// =============================================================================
// INTENSITY WEIGHTS (for logo glow calculation)
// =============================================================================

export const INTENSITY_WEIGHTS = {
  bassDrum: 1.0,
  snare: 0.6,
  hihat: 0.2,
  lowNote: 0.5,
  highNote: 0.3,
  default: 0.3,
} as const;

// =============================================================================
// PIANOROLL
// =============================================================================

/** Default note duration when end time is not specified */
export const DEFAULT_NOTE_DURATION = 0.25;

/** MIDI range defaults when no notes are present */
export const DEFAULT_MIDI_RANGE = {
  min: 48,
  max: 72,
  span: 24,
};

/** Minimum MIDI range to display */
export const MIN_MIDI_RANGE = 12;

/** Padding added to MIDI range */
export const MIDI_RANGE_PADDING = 2;

/** Minimum note height in device pixels */
export const MIN_NOTE_HEIGHT_MULTIPLIER = 3;

// =============================================================================
// CODE PATTERNS (for code wrapping detection)
// =============================================================================

/** Regex to detect if code already has analyze() */
export const ANALYZE_PATTERN = /\.analyze\s*\(\s*['"]viz['"]\s*\)/;

/** Regex to detect multi-statement code (setbpm, setcps, etc.) */
export const MULTI_STATEMENT_PATTERN = /^(setbpm|setcps|setBpm|setCps)\s*\(/m;

// =============================================================================
// API & TOKENS
// =============================================================================

/** Cost per million input tokens (OpenRouter pricing) */
export const INPUT_COST_PER_M = 0.50;

/** Cost per million output tokens (OpenRouter pricing) */
export const OUTPUT_COST_PER_M = 3.00;

/** Default API request timeout in ms */
export const API_TIMEOUT_MS = 30000;
