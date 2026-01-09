/**
 * TypeScript type definitions for Strudel and application types
 * Eliminates 'any' types throughout the codebase
 */

import type { ShaderContext } from './visualization/shader';

// =============================================================================
// Strudel Core Types
// =============================================================================

/**
 * Time fraction representation used by Strudel
 */
export interface TimeSpan {
  begin: number;
  end: number;
}

/**
 * Location in source code for highlighting
 */
export interface CodeLocation {
  start: number;
  end: number;
}

/**
 * Hap context containing location information
 */
export interface HapContext {
  locations?: (CodeLocation | [number, number])[];
}

/**
 * Value contained in a Hap (musical event)
 */
export interface HapValue {
  note?: number | string;
  n?: number | string;
  freq?: number;
  s?: string;
  gain?: number;
  pan?: number;
  speed?: number;
  [key: string]: unknown;
}

/**
 * Hap - A musical event in Strudel's pattern system
 * Represents a single event with timing and value information
 */
export interface Hap {
  whole?: TimeSpan;
  part?: TimeSpan;
  value: HapValue;
  context?: HapContext;
}

/**
 * Strudel Pattern - the core musical structure
 */
export interface Pattern {
  queryArc(start: number, end: number): Hap[];
}

/**
 * Strudel Scheduler - manages timing and playback
 */
export interface StrudelScheduler {
  pattern?: Pattern;
  now(): number;
  setPattern(pattern: unknown): void;
}

/**
 * Widget types supported by Strudel
 */
export type WidgetType = 'slider' | 'block' | 'number';

/**
 * Widget - Interactive UI element in the code editor
 */
export interface Widget {
  type: WidgetType;
  from: number;
  to: number;
  min?: number;
  max?: number;
  value?: number;
  id?: string;
}

/**
 * Strudel REPL state
 */
export interface StrudelState {
  widgets?: Widget[];
}

/**
 * Strudel REPL - the main runtime interface
 */
export interface StrudelRepl {
  state?: StrudelState;
  scheduler?: StrudelScheduler;
}

/**
 * Result from Strudel's evaluate function
 */
export interface EvaluateResult {
  pattern?: Pattern;
}

// =============================================================================
// Audio & Visualization Types
// =============================================================================

/**
 * Audio data extracted from haps for shader visualization
 */
export interface AudioData {
  intensity: number;
  bass: number;
  treble: number;
  time: number;
}

/**
 * Note event for pianoroll visualization
 */
export interface NoteEvent {
  start: number;
  end: number;
  midi: number;
  active: boolean;
}

/**
 * Highlight range for code highlighting
 */
export interface HighlightRange {
  from: number;
  to: number;
}

// =============================================================================
// Token Tracking Types
// =============================================================================

/**
 * Token usage from API calls
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

/**
 * Accumulated token totals
 */
export interface TokenTotals {
  totalInputTokens: number;
  totalOutputTokens: number;
}

// =============================================================================
// UI State Types
// =============================================================================

/**
 * Visualization style options
 */
export type VizStyle = 'none' | 'orbs' | 'stars' | 'trails' | 'quasar' | 'oscillo' | 'lava';

/**
 * Saved UI state for mode restoration
 */
export interface SavedUIState {
  codeVisible: boolean;
  generateVisible: boolean;
  alterVisible: boolean;
  audioVizEnabled: boolean;
  vizStyle: VizStyle;
}

// =============================================================================
// Global Window Extensions
// =============================================================================

/**
 * Extended Window interface with app-specific globals
 */
declare global {
  interface Window {
    // Slider functions for evaluated code
    sliderWithID?: (id: string, value: number, min: number, max: number) => number;
    slider?: (value: number, min: number, max: number) => number;

    // Shader context
    __shaderCtx?: ShaderContext;

    // Canvas contexts
    __pianorollCtx?: CanvasRenderingContext2D;
    __spectrumCtx?: CanvasRenderingContext2D;
    __scopeCtx?: CanvasRenderingContext2D;

    // Audio analysis
    __scopeAnalyser?: AnalyserNode;
    __scopeAudioContext?: AudioContext;

    // Debug flag
    __debuggedHap?: boolean;
  }
}

// =============================================================================
// API Types
// =============================================================================

/**
 * Generate API request body
 */
export interface GenerateRequest {
  message: string;
  currentCode?: string;
  genreContext?: string;
  bankName?: string;
}

/**
 * Alter API request body
 */
export interface AlterRequest {
  alterRequest: string;
  currentCode: string;
  enrichedContext?: string;
  genreContext?: string;
  bankName?: string;
}

/**
 * Evolve API request body
 */
export interface EvolveRequest {
  currentCode: string;
  enrichedContext?: string;
  genreContext?: string;
  bankName?: string;
}

/**
 * API response with code and usage
 */
export interface CodeResponse {
  code: string;
  usage?: TokenUsage;
  error?: string;
}

// Export empty object to make this a module
export {};
