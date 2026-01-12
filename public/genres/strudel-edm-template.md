# Strudel EDM Template for AI Generation

## Core Structure

EDM tracks in Strudel use `stack()` to layer elements. Each element should be clearly separated by function.

```strudel
stack(
  // DRUMS
  // BASS
  // SYNTHS/LEADS
  // PADS/ATMOSPHERE
  // FX/PERC
).gain(0.8)
```

---

## Section 1: Drums

### Kick
EDM kicks are foundational. Common patterns:

```strudel
// Four-on-the-floor (house, techno)
s("bd:5").gain(0.95)

// Syncopated (breaks, DnB-lite)
s("bd:5 ~ ~ bd:5 ~ bd:5 ~ ~").gain(0.95)

// Offbeat accent (tech house)
s("bd:5 ~ bd:5 ~ bd:5 ~ bd:5 [~ bd:5]").gain(0.95)
```

### Snare/Clap
Backbeat on 2 and 4, with optional ghost notes:

```strudel
// Basic backbeat
s("~ cp ~ cp").gain(0.8).room(0.1)

// Layered snare + clap
s("~ [sd:3,cp] ~ [sd:3,cp]").gain(0.8).room(0.15)

// With ghost notes
s("~ ~ cp ~ [sd:1,~] ~ ~ cp").gain("[0.3 0.3 0.85 0.3 0.4 0.3 0.3 0.85]").room(0.1)
```

### Hi-Hats
Velocity variation is crucial for groove:

```strudel
// Basic 8th notes with velocity
s("hh*8").gain("[0.6 0.4 0.5 0.4 0.6 0.4 0.5 0.4]").lpf(5000)

// 16th notes (higher energy)
s("hh*16").gain("[0.5 0.25 0.35 0.25]*4").lpf(6000).hpf(800)

// With open hat accent
s("[hh hh hh oh hh hh hh hh]").gain("[0.5 0.3 0.4 0.6 0.5 0.3 0.4 0.3]").lpf(5000)
```

### Percussion
Add groove and texture:

```strudel
// Shaker
s("shaker*8").gain(0.3).hpf(2000)

// Rim shots
s("~ ~ ~ ~ rim ~ ~ ~").gain(0.4)

// Toms for fills
s("~ ~ ~ ~ ~ ~ [tom:1 tom:2] ~").gain(0.5)

// Ride (house)
s("~ ride ~ ride").gain(0.3).lpf(4000)
```

### Full Drum Rack Example

```strudel
stack(
  s("bd:5").gain(0.95),
  s("~ [sd:3,cp] ~ [sd:3,cp]").gain(0.8).room(0.1),
  s("hh*16").gain("[0.5 0.25 0.35 0.25]*4").lpf(5500).hpf(800),
  s("~ ~ ~ oh ~ ~ ~ ~").gain(0.45),
  s("shaker*8").gain(0.25).hpf(2500)
)
```

---

## Section 2: Bass

### Sub Bass
Keep it simple, lock to kick:

```strudel
// Root note sub
note("<c1 c1 f1 g1>").s("bass").gain(0.8).lpf(200)

// Octave movement
note("<[c1 ~ ~ c2] [c1 ~ ~ c2] [f1 ~ ~ f2] [g1 ~ ~ g2]>").s("bass").gain(0.8).lpf(300)

// Syncopated
note("<[c1 ~ c1 ~ ~ c1 ~ ~]>").s("bass").gain(0.8).lpf(250).shape(0.2)
```

### Mid Bass / Synth Bass
More movement and texture:

```strudel
// Plucky bass
note("<[c2 ~ c2 c2 ~ c2 ~ eb2] [f2 ~ f2 f2 ~ f2 ~ ab2]>")
  .s("sawtooth").gain(0.6).lpf(1200).decay(0.15).sustain(0)

// Filtered bass
note("<[c2 c2 ~ c2 ~ ~ c2 ~]>")
  .s("square").gain(0.7).lpf(sine.range(400, 1500).slow(4)).resonance(8)

// Acid-style
note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
  .s("sawtooth").gain(0.6).lpf(saw.range(300, 2000).slow(0.5)).resonance(15).decay(0.1).sustain(0)
```

---

## Section 3: Synths/Leads

### Chords
Use `<>` for chord progressions (one per cycle):

```strudel
// Sustained pads
note("<[c3,eb3,g3] [f3,ab3,c4] [g3,bb3,d4] [c3,eb3,g3]>")
  .s("sawtooth").gain(0.4).lpf(2000).attack(0.1).release(0.5)

// Stabs (rhythmic)
note("<[c3,eb3,g3,bb3] [f3,ab3,c4,eb4] [g3,bb3,d4,f4] [c3,eb3,g3,bb3]>")
  .s("square").struct("x ~ x ~ ~ x ~ x").gain(0.5).lpf(3000).decay(0.2).sustain(0)

// Plucks
note("<[c4,eb4,g4] [f4,ab4,c5] [g4,bb4,d5] [c4,eb4,g4]>")
  .s("triangle").struct("x ~ ~ x ~ x ~ ~").gain(0.5).lpf(4000).decay(0.15).sustain(0).delay(0.3).delayfb(0.3)
```

### Lead Melodies

```strudel
// Simple arp
note("<[c4 eb4 g4 bb4 g4 eb4 c4 eb4]>")
  .s("sawtooth").gain(0.5).lpf(3500).decay(0.2).sustain(0.1)

// Call and response
note("<[c5 ~ eb5 ~ g5 ~ ~ ~] [~ ~ f5 ~ ~ eb5 c5 ~]>")
  .s("square").gain(0.45).lpf(4000).decay(0.25).sustain(0)

// Legato lead
note("<[c5 ~ ~ eb5 ~ g5 ~ f5] [eb5 ~ ~ c5 ~ ~ ~ ~]>")
  .s("sawtooth").gain(0.4).lpf(3000).attack(0.05).release(0.3)
```

### Arpeggios

```strudel
// Classic up arp
note("<c3 eb3 g3 bb3>*4").s("sawtooth").gain(0.4).lpf(2500).decay(0.15).sustain(0)

// With octave jump
note("<[c3 eb3 g3 c4] [f3 ab3 c4 f4] [g3 bb3 d4 g4] [c3 eb3 g3 c4]>")
  .s("triangle").gain(0.45).lpf(3000).decay(0.1).sustain(0).delay(0.25).delayfb(0.4)

// Gated style
note("[c3,eb3,g3,bb3]*8").s("sawtooth").gain("[0.5 0 0.3 0 0.5 0 0.3 0]").lpf(2000)
```

---

## Section 4: Pads/Atmosphere

```strudel
// Warm pad
note("<[c3,eb3,g3] [f3,ab3,c4]>").s("sawtooth")
  .gain(0.25).lpf(1500).attack(0.5).release(1).room(0.5).size(0.8)

// Airy texture
note("<[c4,g4] [f4,c5]>").s("sine")
  .gain(0.2).delay(0.5).delayfb(0.6).room(0.7).size(0.9)

// Supersaw pad
note("<[c3,eb3,g3,bb3,d4]>").s("supersquare")
  .gain(0.3).lpf(2500).attack(0.3).release(0.8).room(0.4)
```

---

## Section 5: FX and Transitions

```strudel
// White noise sweep (use sparingly)
s("~ ~ ~ ~ ~ ~ ~ noise").gain(0.2).lpf(sine.range(500, 8000)).hpf(1000)

// Reverse cymbal
s("~ ~ ~ ~ ~ ~ ~ [crow]").gain(0.4).speed(-1).room(0.3)

// Impact
s("~ ~ ~ ~ ~ ~ ~ ~!7 [bd:8,cp]").gain(0.9).room(0.3)
```

---

## Common Scales/Keys for EDM

| Key | Notes | Mood |
|-----|-------|------|
| C minor | c, d, eb, f, g, ab, bb | Dark, driving |
| A minor | a, b, c, d, e, f, g | Melancholic |
| F minor | f, g, ab, bb, c, db, eb | Deep, emotional |
| G minor | g, a, bb, c, d, eb, f | Energetic |
| E minor | e, fs, g, a, b, c, d | Euphoric |

---

## Common Chord Progressions

```
// i - VI - VII - i (dark EDM)
Cm - Ab - Bb - Cm
note("<[c3,eb3,g3] [ab2,c3,eb3] [bb2,d3,f3] [c3,eb3,g3]>")

// i - iv - VI - VII (progressive)
Cm - Fm - Ab - Bb
note("<[c3,eb3,g3] [f3,ab3,c4] [ab2,c3,eb3] [bb2,d3,f3]>")

// i - VII - VI - VII (trance)
Am - G - F - G
note("<[a2,c3,e3] [g2,b2,d3] [f2,a2,c3] [g2,b2,d3]>")

// vi - IV - I - V (pop EDM)
Am - F - C - G
note("<[a2,c3,e3] [f2,a2,c3] [c3,e3,g3] [g2,b2,d3]>")
```

---

## Effect Parameters Guide

| Effect | Parameter | Typical Range | Use |
|--------|-----------|---------------|-----|
| `lpf` | cutoff | 200-8000 | Darken/brighten |
| `hpf` | cutoff | 100-2000 | Remove mud |
| `resonance` | Q | 0-1 | Acid, squelch (values >1 cause errors) |
| `gain` | volume | 0.0-1.0 | Mix level |
| `room` | reverb amt | 0.0-0.5 | Space (use sparingly) |
| `size` | reverb size | 0.0-1.0 | Room size |
| `delay` | delay amt | 0.0-0.5 | Echo |
| `delayfb` | feedback | 0.0-0.7 | Echo repeats |
| `shape` | distortion | 0.0-0.5 | Grit, warmth |
| `attack` | env attack | 0.0-1.0 | Fade in |
| `decay` | env decay | 0.0-1.0 | Pluck length |
| `sustain` | env sustain | 0.0-1.0 | Held level |
| `release` | env release | 0.0-2.0 | Fade out |

---

## LFO Modulation

```strudel
// Filter sweep
.lpf(sine.range(500, 3000).slow(4))

// Gain tremolo
.gain(sine.range(0.3, 0.6).slow(2))

// Pan movement
.pan(sine.range(0.3, 0.7).slow(8))

// Saw LFO (ramp)
.lpf(saw.range(400, 2000).slow(1))
```

---

## Full Track Template

```strudel
stack(
  // KICK
  s("bd:5").gain(0.95),
  
  // SNARE/CLAP
  s("~ [sd:3,cp] ~ [sd:3,cp]").gain(0.8).room(0.1),
  
  // HI-HATS
  s("hh*16").gain("[0.5 0.25 0.35 0.25]*4").lpf(5500).hpf(800),
  s("~ ~ ~ oh ~ ~ ~ ~").gain(0.4),
  
  // PERC
  s("shaker*8").gain(0.2).hpf(2500),
  
  // SUB BASS
  note("<[c1 ~ ~ ~] [c1 ~ ~ ~] [f1 ~ ~ ~] [g1 ~ ~ ~]>").s("bass").gain(0.8).lpf(200),
  
  // SYNTH BASS
  note("<[c2 ~ c2 ~ ~ c2 ~ eb2] [c2 ~ c2 ~ ~ c2 ~ eb2] [f2 ~ f2 ~ ~ f2 ~ ab2] [g2 ~ g2 ~ ~ g2 ~ bb2]>")
    .s("sawtooth").gain(0.55).lpf(1000).decay(0.15).sustain(0),
  
  // CHORDS
  note("<[c3,eb3,g3,bb3] [c3,eb3,g3,bb3] [f3,ab3,c4,eb4] [g3,bb3,d4,f4]>")
    .s("supersquare").struct("x ~ x ~ ~ x ~ x").gain(0.4).lpf(2500).decay(0.2).sustain(0),
  
  // PAD
  note("<[c4,g4] [c4,g4] [f4,c5] [g4,d5]>")
    .s("sawtooth").gain(0.2).lpf(1800).attack(0.3).release(0.5).room(0.4).size(0.6),
  
  // LEAD/ARP
  note("<[c4 eb4 g4 bb4 g4 eb4 c4 eb4] [c4 eb4 g4 bb4 g4 eb4 c4 eb4] [f4 ab4 c5 eb5 c5 ab4 f4 ab4] [g4 bb4 d5 f5 d5 bb4 g4 bb4]>")
    .s("triangle").gain(0.35).lpf(3500).decay(0.12).sustain(0).delay(0.2).delayfb(0.3)
    
).gain(0.75)
```

---

## Genre Variations

### House
- Four-on-the-floor kick
- Offbeat hats
- Chord stabs
- Warm, rolling bass

### Techno
- Driving kick
- Minimal hats
- Heavy filtering
- Dark, repetitive

### Trance
- Uplifting chords
- Supersaw pads
- 16th note arps
- Long builds

### Future Bass
- Syncopated drums
- Heavy sidechain feel (use `gain` patterns)
- Pitch-bent chords
- Supersaws with movement

### DnB
- Breakbeat pattern (not four-on-the-floor)
- Fast tempo feel (double-time hats)
- Reese bass
- Choppy drums

---

## Tips for AI Generation

1. **Always use 8-step patterns** unless intentionally polyrhythmic
2. **Match bass notes to chord roots** for harmonic coherence
3. **Vary velocity** on hats and percussion for human feel
4. **Use reverb sparingly** — room 0.1-0.3 max on most elements
5. **Keep sub bass mono and dry** — no effects below 200hz
6. **Layer sounds** with complementary frequencies (sub + mid bass, snare + clap)
7. **Use `.struct()` for rhythmic variation** on sustained sounds
8. **Keep master gain around 0.75-0.85** to avoid clipping
