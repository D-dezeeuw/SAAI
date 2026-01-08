/**
 * Audio data extraction from Strudel haps for visualization
 */

import type { Hap, AudioData } from '../types';
import { noteToMidi } from '../visualization/pianoroll';
import {
  BASS_THRESHOLD_MIDI,
  TREBLE_THRESHOLD_MIDI,
  INTENSITY_DIVISOR,
  BASS_DIVISOR,
  TREBLE_DIVISOR,
  MAX_INTENSITY,
  INTENSITY_WEIGHTS,
} from '../config/constants';

/**
 * Filter haps to only those currently active (playing now)
 * @param haps - Array of haps from pattern query
 * @param now - Current time in cycles
 * @returns Filtered array of active haps
 */
export function filterActiveHaps(haps: Hap[], now: number): Hap[] {
  return haps.filter((h: Hap) => {
    const start = h.whole?.begin ?? h.part?.begin ?? 0;
    const end = h.whole?.end ?? h.part?.end ?? 0;
    return now >= start && now < end;
  });
}

/**
 * Extract audio data from haps for shader visualization
 * Analyzes the haps to determine bass/treble intensity and overall activity
 *
 * @param haps - Array of haps from pattern query
 * @param now - Current time in cycles
 * @returns AudioData object with intensity, bass, treble, and time
 */
export function extractAudioData(haps: Hap[], now: number): AudioData {
  // Filter to active haps only
  const activeHaps = filterActiveHaps(haps, now);

  let bassCount = 0;
  let trebleCount = 0;

  // Analyze note frequencies
  for (const hap of activeHaps) {
    const noteVal = hap.value?.note ?? hap.value?.n;
    if (noteVal !== undefined && (typeof noteVal === 'number' || typeof noteVal === 'string')) {
      const midi = noteToMidi(noteVal);
      if (midi !== null) {
        if (midi < BASS_THRESHOLD_MIDI) bassCount++;
        if (midi > TREBLE_THRESHOLD_MIDI) trebleCount++;
      }
    }
    // Drum samples count as bass
    const sample = hap.value?.s;
    if (sample && (sample === 'bd' || sample.startsWith('bd:'))) {
      bassCount++;
    }
  }

  return {
    intensity: Math.min(activeHaps.length / INTENSITY_DIVISOR, 1),
    bass: Math.min(bassCount / BASS_DIVISOR, 1),
    treble: Math.min(trebleCount / TREBLE_DIVISOR, 1),
    time: now
  };
}

/**
 * Calculate sound intensity weight for a hap (used for logo glow)
 * Different sounds get different weights based on their impact
 *
 * @param hap - A single hap
 * @returns Weight value (0-1)
 */
export function calculateHapIntensity(hap: Hap): number {
  const sound = hap.value?.s || '';
  const note = hap.value?.note ?? hap.value?.n;

  // Bass drum and low notes get more weight
  if (sound === 'bd' || sound.includes('kick')) {
    return INTENSITY_WEIGHTS.bassDrum;
  } else if (sound === 'sd' || sound === 'cp' || sound.includes('snare')) {
    return INTENSITY_WEIGHTS.snare;
  } else if (sound === 'hh' || sound === 'oh' || sound.includes('hat')) {
    return INTENSITY_WEIGHTS.hihat;
  } else if (note !== undefined) {
    // Melodic notes - lower notes = more intensity
    const midi = typeof note === 'number' ? note : 60;
    return midi < 50 ? INTENSITY_WEIGHTS.lowNote : INTENSITY_WEIGHTS.highNote;
  }
  return INTENSITY_WEIGHTS.default;
}

/**
 * Calculate total intensity from active haps
 * Used for beat-reactive visualizations like logo glow
 *
 * @param activeHaps - Array of currently active haps
 * @returns Normalized intensity value (0-1)
 */
export function calculateTotalIntensity(activeHaps: Hap[]): number {
  let intensity = 0;
  for (const hap of activeHaps) {
    intensity += calculateHapIntensity(hap);
  }
  // Clamp to max and normalize to 0-1
  return Math.min(intensity, MAX_INTENSITY) / MAX_INTENSITY;
}
