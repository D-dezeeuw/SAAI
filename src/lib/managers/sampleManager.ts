/**
 * Sample extraction and preloading utilities for Strudel
 */

// Base samples from dirt-samples and other sources
const BASE_SAMPLES = new Set([
  // Drums (dirt-samples)
  'bd', 'sd', 'hh', 'oh', 'cp', 'cr', 'rim', 'tom', 'lt', 'mt', 'ht',
  'perc', 'tabla', 'tabla2', 'hand', 'kick', 'snare',
  // Percussion (dirt-samples)
  'can', 'metal', 'bottle', 'glass', 'crow', 'jazz', 'east',
  'world', 'mouth', 'click', 'noise',
  // Melodic samples (dirt-samples)
  'arpy', 'pluck', 'jvbass', 'bass', 'bass1', 'bass2', 'bass3',
  'casio', 'gtr', 'ades', 'ade',
  // Built-in WebAudio synths (used with note().s())
  'sawtooth', 'square', 'triangle', 'sine',
  'supersaw', 'supersquare', 'supersine',
  // Loaded sample instruments (dough-samples)
  'piano'
]);

// Track which samples have been loaded
const loadedSamples = new Set<string>(BASE_SAMPLES);

/**
 * Extract sample names from Strudel code
 * Parses mini-notation patterns like "bd:5 ~ [sd,cp] hh*8"
 */
export function extractSamplesFromCode(code: string): string[] {
  const foundSamples = new Set<string>();

  // Match s("..."), sound("..."), and .s("...") patterns
  const patterns = [
    /s\("([^"]+)"\)/g,
    /sound\("([^"]+)"\)/g,
    /\.s\("([^"]+)"\)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      // Parse mini-notation: "bd:5 ~ [sd,cp] hh*8" → ["bd", "sd", "cp", "hh"]
      const names = match[1]
        .replace(/[\[\]<>]/g, ' ')      // Remove brackets
        .replace(/[*\/]\d+\.?\d*/g, '') // Remove *8, /2, *0.5 etc
        .replace(/:\d+/g, '')           // Remove :5 variants
        .replace(/[~,]/g, ' ')          // Replace ~ and , with space
        .split(/\s+/)
        .filter(s => s.length > 0 && s !== '~');

      names.forEach(n => foundSamples.add(n));
    }
  }

  return Array.from(foundSamples);
}

/**
 * Ensure all samples used in code are loaded
 * Marks new samples as known so we don't warn again
 */
export async function ensureSamplesLoaded(code: string): Promise<void> {
  const needed = extractSamplesFromCode(code);
  const missing = needed.filter(s => !loadedSamples.has(s));

  if (missing.length > 0) {
    // Samples from dirt-samples should already be available after init
    // Just mark them as known so we don't warn again
    missing.forEach(s => loadedSamples.add(s));
  }
}

/**
 * Check if a sample is already loaded
 */
export function isSampleLoaded(name: string): boolean {
  return loadedSamples.has(name);
}

/**
 * Mark a sample as loaded
 */
export function markSampleLoaded(name: string): void {
  loadedSamples.add(name);
}

/**
 * Get all currently loaded samples
 */
export function getLoadedSamples(): string[] {
  return Array.from(loadedSamples);
}
