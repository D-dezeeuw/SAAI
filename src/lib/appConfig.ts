// ============================================================================
// APP CONFIGURATION
// ============================================================================
// Default values for UI elements and initial state.
// Modify these values to customize the default behavior.
// ============================================================================

export const APP_CONFIG = {
  // --- DEFAULT PROMPT ---
  // The default text shown in the prompt input field
  defaultPrompt: 'Create a nice melodic implementation, with chord progression and the use of oh, bd,sd and hh samples. make use of effects like reverb, delay, and filter sweeps to enhance the sound. make it sound professional and polished. Make sure it loops.',

  // --- DEFAULT GENRE ---
  // Options: '' (no genre), 'edm', 'dnb', 'hiphop-trap', 'acid', 'jazz'
  defaultGenre: 'edm',

  // --- DEFAULT DRUM KIT ---
  // Options: '' (default), 'RolandTR909', 'RolandTR808', 'RolandTR707',
  //          'LinnDrum', 'AkaiLinn', 'KorgM1', 'AlesisHR16'
  defaultDrumKit: '',

  // --- DEFAULT STRUDEL CODE ---
  // The initial code shown in the editor when the app loads
  defaultCode: `// Welcome to SAAI - Strudel Augmented AI
// Use the AI panel (✦) to generate music, or write your own code below

setcps(138/60/4)

stack(
  s("bd:5*4").gain(1.2),
  s("~ ~ oh ~ ~ ~ oh ~ ~ ~ oh ~ ~ ~ oh ~"),
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
)`,

  // --- DEFAULT BACKGROUND EFFECT ---
  // Options: 'none', 'orbs', 'stars', 'trails'
  defaultBackgroundEffect: 'orbs',

  // --- DEFAULT VISUALIZER STATE ---
  // Whether audio visualizers (scope, spectrum, pianoroll) are on by default
  audioVisualizersEnabled: true,
};
