# Strudel Full Song Composition Guide for LLMs

## Overview

This document instructs LLMs on how to compose **complete, structured songs** in Strudel rather than short loops. A typical EDM track is 56-64 bars (3-4 minutes at 128 BPM). Do NOT default to 1-4 bar loops.

---

## Song Structure Template

Standard EDM structure (56 bars total at 128 BPM ≈ 3.5 minutes):

| Section    | Bars | Purpose                                    |
|------------|------|--------------------------------------------|
| Intro      | 16   | Build atmosphere, introduce elements slowly |
| Breakdown  | 8    | Strip back, melodic focus, tension release |
| Buildup    | 8    | Rising energy, filter sweeps, snare rolls  |
| Drop       | 16   | Full energy, all elements, main groove     |
| Outro      | 8    | Wind down, elements fade out               |

---

## Core Strudel Functions for Song Structure

### 1. `slowcat()` - The Primary Song Structure Tool

Sequences patterns one after another across time. This is how you build songs.

```javascript
slowcat(intro, breakdown, buildup, drop, outro)
```

### 2. `.slow(n)` - Section Duration

Stretches a pattern over `n` cycles (bars). **Every section MUST use this.**

```javascript
const intro = stack(hats, chords).slow(16)  // 16 bars
const breakdown = stack(lead, pad).slow(8)   // 8 bars
```

### 3. `stack()` - Layer Elements

Plays multiple patterns simultaneously within a section.

```javascript
stack(
  kick,
  snare,
  hats,
  bass,
  chords
)
```

### 4. `.whenmod(total, threshold, fn)` - Conditional Variations

Apply changes at specific points in a cycle.

```javascript
// Mute kick for first 8 bars of every 32
kick.whenmod(32, 8, x => x.hush())
```

---

## Tempo and Timing

Always set tempo explicitly at the top:

```javascript
setcpm(128)  // 128 BPM - standard EDM tempo
// or
setcps(128/60/4)  // Alternative: cycles per second
```

---

## Sound Design Elements

### Drums (use .bank() for quality samples)

```javascript
const kick = s("bd*4").bank("RolandTR909")
const snare = s("~ sd ~ sd").bank("RolandTR909")
const hats = s("hh*8").bank("RolandTR909").gain(.6)
const oh = s("~ ~ ~ oh").bank("RolandTR909").cut(1)
const clap = s("~ cp ~ cp").bank("RolandTR909")
```

### Bass (sawtooth with low-pass filter)

```javascript
const bass = note("<a1 a1 f1 g1>")
  .s("sawtooth")
  .lpf(600)
  .resonance(.2)
  .decay(.15)
  .sustain(.4)
  .gain(.8)
```

### Chords (use voicings for proper harmony)

```javascript
const chords = note("<Am7 Am7 Fmaj7 G7>".voicings("lefthand"))
  .s("sawtooth")
  .lpf(2500)
  .attack(.02)
  .release(.4)
  .gain(.5)
```

### Lead/Melody

```javascript
const lead = note("a4 c5 e5 d5 c5 a4 g4 e4".slow(2))
  .s("triangle")
  .lpf(3000)
  .attack(.01)
  .decay(.2)
  .sustain(.3)
  .release(.3)
  .delay(.25)
  .delaytime(.375)
  .room(.3)
```

### Pad (atmospheric layer)

```javascript
const pad = note("<Am7 Fmaj7>".voicings("lefthand"))
  .s("sawtooth")
  .lpf(1200)
  .attack(.5)
  .release(1)
  .room(.5)
  .gain(.3)
  .slow(4)
```

---

## Sidechain Compression Techniques

Strudel has no compressor, so simulate sidechain via gain patterns or ducking.

### Method 1: Gain Pattern (Simple)

Duck on every beat to simulate kick sidechain:

```javascript
// Full -> ducked -> recover pattern
chords.gain("1 .3 .7 .4")

// Or per-eighth-note ducking
bass.gain("1 .2 .5 .3 .8 .2 .5 .3")
```

### Method 2: Cosine Ducking (Smoother)

```javascript
// Smooth pump effect synced to cycle
chords.gain(cosine.range(.3, 1).fast(4))
```

### Method 3: Rhythmic Ducking for Bass

```javascript
bass.gain("1 .1 .6 .1".fast(2))
```

---

## Automation and Movement

### Filter Sweeps

```javascript
// Rising filter over 16 bars
.lpf(sine.range(200, 8000).slow(16))

// Wobble filter
.lpf(sine.range(400, 2000).fast(2))
```

### Fade In/Out with degradeBy

```javascript
// Fade in: high degradation -> none
hats.degradeBy(sine.range(1, 0).slow(8))

// Fade out: none -> high degradation
kick.degradeBy(sine.range(0, 1).slow(8))
```

### Accelerating Patterns (Buildup)

```javascript
// Hats speed up during buildup
hats.fast(sine.range(1, 4).slow(8))

// Snare roll intensifies
s("sd*4").degradeBy(sine.range(.9, 0).slow(8)).bank("RolandTR909")
```

### Pitch Risers

```javascript
// Rising synth for buildup tension
note("a2")
  .s("sawtooth")
  .lpf(sine.range(200, 10000).slow(8))
  .gain(sine.range(.3, .8).slow(8))
  .slow(8)
```

---

## Section Composition

### Intro (16 bars)
- NO kick drum or minimal filtered kick
- Introduce hats with fade-in
- Chords/pads with low-pass filter, slowly opening
- Build atmosphere

```javascript
const intro = stack(
  hats.gain(sine.range(0, .6).slow(16)),
  chords.lpf(sine.range(300, 2000).slow(16)),
  pad
).slow(16)
```

### Breakdown (8 bars)
- Remove kick and most drums
- Focus on melody and atmosphere
- Emotional/melodic content
- Create tension release

```javascript
const breakdown = stack(
  lead.gain(.6),
  pad,
  chords.lpf(1500).gain(.4)
).slow(8)
```

### Buildup (8 bars)
- Snare roll (accelerating)
- Rising filter sweep
- Increasing hi-hat density
- Riser synth
- Build maximum tension

```javascript
const buildup = stack(
  hats.fast(sine.range(1, 4).slow(8)),
  s("sd*4").degradeBy(sine.range(.95, 0).slow(8)).bank("RolandTR909"),
  note("a2").s("sawtooth").lpf(sine.range(200, 10000).slow(8)).gain(.5),
  chords.lpf(sine.range(500, 6000).slow(8))
).slow(8)
```

### Drop (16 bars)
- Full drums: kick, snare, hats, open hats
- Bass at full power
- Chords with sidechain ducking
- Maximum energy

```javascript
const drop = stack(
  kick,
  snare,
  hats,
  oh,
  bass.gain("1 .2 .6 .2"),
  chords.gain("1 .3 .7 .4")
).slow(16)
```

### Outro (8 bars)
- Remove elements gradually
- Kick becomes sparse
- Filters close
- Fade to silence

```javascript
const outro = stack(
  kick.degradeBy(sine.range(0, .9).slow(8)),
  hats.degradeBy(sine.range(0, .8).slow(8)),
  chords.lpf(sine.range(2500, 300).slow(8)).gain(sine.range(.5, 0).slow(8))
).slow(8)
```

---

## Complete Song Template

```javascript
setcpm(128)

// === DRUMS ===
const kick = s("bd*4").bank("RolandTR909")
const snare = s("~ sd ~ sd").bank("RolandTR909")
const hats = s("hh*8").bank("RolandTR909").gain(.6)
const oh = s("~ ~ ~ oh").bank("RolandTR909").cut(1)

// === BASS ===
const bass = note("<a1 a1 f1 g1>")
  .s("sawtooth")
  .lpf(600)
  .decay(.15).sustain(.4)
  .gain(.8)

// === CHORDS ===
const chords = note("<Am7 Am7 Fmaj7 G7>".voicings("lefthand"))
  .s("sawtooth")
  .lpf(2500)
  .attack(.02).release(.4)

// === LEAD ===
const lead = note("a4 c5 e5 d5 c5 a4 g4 e4".slow(2))
  .s("triangle")
  .lpf(3000)
  .delay(.2).room(.3)

// === PAD ===
const pad = note("<Am7 Fmaj7>".voicings("lefthand"))
  .s("sawtooth")
  .lpf(1000)
  .attack(.5).release(1)
  .room(.5).gain(.25)
  .slow(4)

// === SECTIONS ===
const intro = stack(
  hats.gain(sine.range(0, .6).slow(16)),
  chords.lpf(sine.range(300, 2000).slow(16)).gain(.4),
  pad
).slow(16)

const breakdown = stack(
  lead.gain(.6),
  pad,
  chords.lpf(1500).gain(.3)
).slow(8)

const buildup = stack(
  hats.fast(sine.range(1, 4).slow(8)),
  s("sd*4").degradeBy(sine.range(.95, 0).slow(8)).bank("RolandTR909"),
  note("a2").s("sawtooth").lpf(sine.range(200, 10000).slow(8)).gain(.5)
).slow(8)

const drop = stack(
  kick,
  snare,
  hats,
  oh,
  bass.gain("1 .2 .6 .2"),
  chords.gain("1 .3 .7 .4"),
  lead.gain(.4)
).slow(16)

const outro = stack(
  kick.degradeBy(sine.range(0, .9).slow(8)),
  hats.degradeBy(sine.range(0, .8).slow(8)),
  chords.lpf(sine.range(2500, 300).slow(8)).gain(sine.range(.5, 0).slow(8))
).slow(8)

// === FULL SONG ===
slowcat(intro, breakdown, buildup, drop, outro)
```

---

## Common Mistakes to AVOID

1. **Writing short loops** - Always use `.slow(n)` for section duration
2. **Forgetting slowcat()** - This is how sections are sequenced
3. **No tempo set** - Always include `setcpm(128)` or similar
4. **Same intensity throughout** - Vary energy between sections
5. **No sidechain** - Use `.gain()` patterns on melodic elements
6. **No automation** - Use `sine.range()` for filter/gain movement
7. **No variation in buildups** - Use accelerating patterns and filter sweeps
8. **Forgetting .bank()** - Use quality samples from TR808/TR909/etc
9. **Overcomplex patterns** - Keep individual parts simple, complexity comes from layers
10. **No space in arrangement** - Intro/breakdown should have fewer elements

---

## Quick Reference

| Task                    | Function                                        |
|-------------------------|-------------------------------------------------|
| Sequence sections       | `slowcat(a, b, c)`                              |
| Section duration        | `.slow(16)` for 16 bars                         |
| Layer sounds            | `stack(a, b, c)`                                |
| Sidechain bass/chords   | `.gain("1 .2 .6 .2")`                           |
| Filter sweep up         | `.lpf(sine.range(200, 8000).slow(n))`           |
| Filter sweep down       | `.lpf(sine.range(8000, 200).slow(n))`           |
| Fade in                 | `.degradeBy(sine.range(1, 0).slow(n))`          |
| Fade out                | `.degradeBy(sine.range(0, 1).slow(n))`          |
| Accelerate pattern      | `.fast(sine.range(1, 4).slow(n))`               |
| Drum bank               | `.bank("RolandTR909")`                          |
| Chords                  | `note("<Am7 Fmaj7>".voicings("lefthand"))`      |
| Open/closed hat choke   | `.cut(1)`                                       |

---

## Genre Variations

### House (124 BPM)
- 4-on-floor kick: `s("bd*4")`
- Offbeat hats: `s("~ hh ~ hh")`
- Deep rolling bass
- Warm pads

### Techno (130-140 BPM)
- Driving kick with tail
- Minimal melodic content
- Heavy use of filters
- Dark atmospheres

### Trance (138 BPM)
- Longer buildups (16 bars)
- Arpeggiated leads
- Supersaw pads
- Emotional chord progressions

### Drum & Bass (170-174 BPM)
- Breakbeat patterns: `s("bd ~ ~ ~ bd ~ ~ sd ~ ~ bd ~ sd ~ ~ ~")`
- Rolling basslines
- Chopped breaks
- Sparse intros

---

## Final Notes

When generating Strudel code:
1. **Always start with tempo**: `setcpm(128)`
2. **Define all elements as variables first**
3. **Build sections using stack() and .slow()**
4. **Assemble song with slowcat()**
5. **Ensure total duration matches song length goal**
6. **Include sidechain on melodic elements**
7. **Add automation for movement and interest**

The goal is a **complete, playable song** - not a loop.
