/**
 * Piano roll visualization for Strudel patterns
 * Renders note events on a scrolling canvas
 */

import type { Hap, NoteEvent } from '../types';
import { APP_CONFIG } from '../config/appConfig';
import { CONFIG } from '../config/configuration';

// =============================================================================
// Configuration
// =============================================================================

/** Pianoroll playhead position (0-1, where 0.09 = 9% from left) */
export const PIANOROLL_PLAYHEAD = 0.09;

/** Enable smear effect (trail on notes) */
export const PIANOROLL_SMEAR = false;

/** Color for active (currently playing) notes */
export const PIANOROLL_ACTIVE_COLOR = APP_CONFIG.colors.primary.base;

/** Color for inactive (upcoming/past) notes */
export const PIANOROLL_INACTIVE_COLOR = APP_CONFIG.colors.tertiary.dark;

/** Glow intensity for notes */
export const PIANOROLL_GLOW = 20;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert a note value to MIDI number
 * @param note - Note value (number or string like "c3", "f#4")
 * @returns MIDI number (0-127) or null if invalid
 */
export function noteToMidi(note: number | string): number | null {
  if (typeof note === 'number') return note;
  if (typeof note === 'string') {
    // Parse note strings like "c3", "e4", "f#2"
    const match = note.match(/^([a-g])([#b]?)(-?\d+)$/i);
    if (match) {
      const noteNames: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
      const base = noteNames[match[1].toLowerCase()];
      const modifier = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
      const octave = parseInt(match[3]);
      return (octave + 1) * 12 + base + modifier;
    }
  }
  return null;
}

/**
 * Extract note events from haps for pianoroll rendering
 * @param haps - Array of haps from pattern query
 * @param now - Current time in cycles
 * @returns Array of note events with MIDI numbers and timing
 */
export function extractNoteEvents(haps: Hap[], now: number): NoteEvent[] {
  const noteEvents: NoteEvent[] = [];

  for (const hap of haps) {
    const noteVal = hap.value?.note ?? hap.value?.n ?? hap.value?.freq;
    if (noteVal === undefined) continue;

    let midi: number | null = null;
    if (hap.value?.freq) {
      // Convert frequency to MIDI
      midi = Math.round(12 * Math.log2(hap.value.freq / 440) + 69);
    } else if (typeof noteVal === 'number' || typeof noteVal === 'string') {
      midi = noteToMidi(noteVal);
    }

    if (midi === null || midi < CONFIG.pianoroll.minMidi || midi > 127) continue;

    const start = hap.whole?.begin ?? hap.part?.begin ?? 0;
    const end = hap.whole?.end ?? hap.part?.end ?? start + 0.25;
    const active = now >= start && now < end;

    noteEvents.push({ start, end, midi, active });
  }

  return noteEvents;
}

/**
 * Calculate MIDI range from note events with padding
 * @param noteEvents - Array of note events
 * @returns Object with minMidi, maxMidi, and range
 */
export function calculateMidiRange(noteEvents: NoteEvent[]): { minMidi: number; maxMidi: number; range: number } {
  if (noteEvents.length === 0) {
    return { minMidi: 48, maxMidi: 72, range: 24 };
  }

  let minMidi = 127;
  let maxMidi = 0;

  for (const event of noteEvents) {
    minMidi = Math.min(minMidi, event.midi);
    maxMidi = Math.max(maxMidi, event.midi);
  }

  // Add padding
  minMidi = Math.max(0, minMidi - 2);
  maxMidi = Math.min(127, maxMidi + 2);

  return {
    minMidi,
    maxMidi,
    range: Math.max(maxMidi - minMidi, 12),
  };
}

// =============================================================================
// Main Drawing Function
// =============================================================================

/**
 * Draw pianoroll visualization
 * @param ctx - Canvas 2D rendering context
 * @param haps - Array of haps from pattern query
 * @param now - Current time in cycles
 * @param cycles - Number of cycles to display
 */
export function drawPianoroll(
  ctx: CanvasRenderingContext2D,
  haps: Hap[],
  now: number,
  cycles: number
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const dpr = window.devicePixelRatio || 1;

  // Clear or smear background
  if (PIANOROLL_SMEAR) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  // Extract and process note events
  const noteEvents = extractNoteEvents(haps, now);
  if (noteEvents.length === 0) return;

  // Calculate MIDI range
  const { minMidi, range: midiRange } = calculateMidiRange(noteEvents);

  // Calculate time range based on playhead position
  const timeStart = now - cycles * PIANOROLL_PLAYHEAD;
  const timeEnd = now + cycles * (1 - PIANOROLL_PLAYHEAD);
  const timeRange = timeEnd - timeStart;

  // Draw each note
  for (const event of noteEvents) {
    const x = ((event.start - timeStart) / timeRange) * width;
    const noteWidth = ((event.end - event.start) / timeRange) * width;
    const y = height - ((event.midi - minMidi) / midiRange) * height;
    const noteHeight = Math.max(height / midiRange, 3 * dpr);

    if (event.active) {
      ctx.shadowColor = PIANOROLL_ACTIVE_COLOR;
      ctx.shadowBlur = PIANOROLL_GLOW;
      ctx.fillStyle = PIANOROLL_ACTIVE_COLOR;
    } else {
      ctx.shadowColor = PIANOROLL_INACTIVE_COLOR;
      ctx.shadowBlur = PIANOROLL_GLOW / 3;
      ctx.fillStyle = PIANOROLL_INACTIVE_COLOR;
    }

    ctx.fillRect(x, y - noteHeight / 2, Math.max(noteWidth, 2 * dpr), noteHeight);
  }

  // Reset shadow and draw playhead
  ctx.shadowBlur = 0;
  const playheadX = PIANOROLL_PLAYHEAD * width;
  ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(playheadX, 0);
  ctx.lineTo(playheadX, height);
  ctx.stroke();
}
