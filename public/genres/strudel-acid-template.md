# Strudel Acid / Industrial Template for AI Generation

## Core Characteristics

Acid music is defined by:
- **TB-303 style basslines** — squelchy, resonant filter sweeps
- **High resonance** — self-oscillating filters
- **Repetitive, hypnotic patterns** — evolving through modulation
- **Industrial textures** — noise, distortion, grit
- **Foghorns** — low, droning, filtered sounds
- **FM synthesis** — metallic, bell-like, harsh tones
- **Spatial effects** — orbits, panning, delays

```strudel
stack(
  // DRUMS (noisy, industrial)
  // ACID BASS (303-style)
  // FOGHORNS
  // FM TEXTURES
  // NOISE/ATMOSPHERE
).gain(0.8)
```

---

## Section 1: Acid Bass (TB-303 Style)

The heart of acid — sawtooth/square through resonant filter with envelope.

### Basic Acid Patterns

```strudel
// Classic acid line
note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
  .s("sawtooth").gain(0.6)
  .lpf(sine.range(300, 2500).slow(4)).resonance(18)
  .decay(0.1).sustain(0)

// Square wave acid
note("<[c2 ~ c2 c3 ~ c2 eb2 ~]>")
  .s("square").gain(0.55)
  .lpf(saw.range(400, 3000).slow(2)).resonance(20)
  .decay(0.12).sustain(0)

// Slow filter sweep
note("<[c2 c2 ~ c2 ~ c2 c2 ~]>")
  .s("sawtooth").gain(0.6)
  .lpf(sine.range(200, 4000).slow(8)).resonance(22)
  .decay(0.15).sustain(0.1)

// Fast wobble
note("<[c2 c2 c2 c2 c2 c2 c2 c2]>")
  .s("sawtooth").gain(0.55)
  .lpf(sine.range(300, 2000).slow(0.25)).resonance(16)
  .decay(0.08).sustain(0)
```

### Accent Patterns (crucial for 303 feel)

The 303 has accent — simulate with gain patterns:

```strudel
// Accented acid
note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
  .s("sawtooth").gain("[0.7 0.4 0.8 0.4 0.7 0.4 0.5 0.4]")
  .lpf(sine.range(400, 3000).slow(4)).resonance(18)
  .decay(0.1).sustain(0)

// Heavy accent
note("<[c2 c2 c2 c3 c2 c2 eb2 c2]>")
  .s("square").gain("[0.8 0.3 0.4 0.9 0.5 0.3 0.85 0.4]")
  .lpf(saw.range(300, 2800).slow(2)).resonance(20)
  .decay(0.12).sustain(0)
```

### Slide/Glide (approximated)

```strudel
// Overlapping notes create glide feel
note("<[c2 ~ [c2,eb2] ~ eb2 ~ [eb2,g2] ~]>")
  .s("sawtooth").gain(0.6)
  .lpf(sine.range(400, 2500).slow(4)).resonance(18)
  .decay(0.2).sustain(0.15)

// Legato style
note("<[c2 eb2 g2 eb2 c2 g1 c2 eb2]>")
  .s("sawtooth").gain(0.55)
  .lpf(sine.range(300, 3000).slow(2)).resonance(16)
  .attack(0.02).decay(0.15).sustain(0.2)
```

### Distorted Acid

```strudel
// Light distortion
note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
  .s("sawtooth").gain(0.6)
  .lpf(sine.range(400, 2500).slow(4)).resonance(18)
  .decay(0.1).sustain(0).shape(0.3)

// Heavy distortion
note("<[c2 c2 c2 c3 ~ c2 eb2 ~]>")
  .s("square").gain(0.5)
  .lpf(saw.range(300, 2000).slow(1)).resonance(22)
  .decay(0.12).sustain(0).shape(0.5).distort(0.3)

// Crushed acid
note("<[c2 c2 c2 c2 c2 c2 c2 c2]>")
  .s("sawtooth").gain(0.5)
  .lpf(sine.range(200, 3500).slow(0.5)).resonance(25)
  .decay(0.08).sustain(0).shape(0.6).crush(8)
```

---

## Section 2: Drums (Industrial/Noisy)

### Kicks

```strudel
// Standard four-on-floor
s("bd:5").gain(0.95)

// Distorted kick
s("bd:5").gain(0.9).shape(0.3)

// Pitched kick
s("bd:5").gain(0.95).speed(0.9)

// Layered industrial kick
s("[bd:5,bd:8]").gain(0.9).shape(0.2).lpf(200)

// Noisy kick
s("bd:5").gain(0.9).crush(12).shape(0.2)
```

### Snare/Clap (Industrial)

```strudel
// Basic backbeat
s("~ cp ~ cp").gain(0.8).room(0.1)

// Distorted clap
s("~ cp ~ cp").gain(0.75).shape(0.25).room(0.15)

// Noisy snare
s("~ sd:3 ~ sd:3").gain(0.8).crush(10).room(0.1)

// Industrial snare layer
s("~ [sd:3,noise] ~ [sd:3,noise]").gain("[0.8 0.15]*2").room(0.1).lpf(3000)

// Bitcrushed
s("~ cp ~ cp").gain(0.75).crush(8).room(0.12)
```

### Hi-Hats (Metallic/Noisy)

```strudel
// Basic 16ths
s("hh*16").gain("[0.5 0.25 0.4 0.3]*4").lpf(6000).hpf(800)

// Distorted hats
s("hh*16").gain("[0.45 0.2 0.35 0.25]*4").lpf(5000).shape(0.2)

// Crushed hats
s("hh*16").gain("[0.5 0.25 0.4 0.3]*4").crush(10).lpf(5500)

// Open hat accents
s("[hh hh hh oh]*4").gain("[0.5 0.3 0.4 0.55]*4").lpf(5500)

// Noise hats (industrial)
s("noise*16").gain("[0.3 0.15 0.2 0.15]*4").lpf(8000).hpf(4000).decay(0.02).sustain(0)
```

### Percussion (Industrial/Metallic)

```strudel
// Rim shots
s("~ rim ~ ~ ~ rim ~ rim").gain(0.4).room(0.15)

// Metallic hits
s("~ ~ crow ~ ~ ~ ~ crow").gain(0.35).speed(2).lpf(3000)

// Industrial perc
s("industrial*4").gain(0.4).shape(0.2)

// Cowbell (distorted)
s("~ cowbell ~ ~ ~ cowbell ~ ~").gain(0.4).shape(0.3).lpf(2500)
```

### Full Industrial Kit

```strudel
stack(
  s("bd:5").gain(0.95).shape(0.15),
  s("~ [cp,sd:3] ~ [cp,sd:3]").gain(0.8).shape(0.2).room(0.1),
  s("hh*16").gain("[0.45 0.2 0.35 0.25]*4").lpf(5500).crush(12),
  s("~ ~ ~ oh ~ ~ ~ ~").gain(0.4).shape(0.15)
)
```

---

## Section 3: Foghorns

Low, droning, filtered sounds — essential for dark acid/industrial.

### Basic Foghorns

```strudel
// Simple foghorn
note("<c1>").s("sawtooth").gain(0.5)
  .lpf(sine.range(100, 800).slow(8)).resonance(12)
  .attack(0.5).release(1)

// Pulsing foghorn
note("<c1>").s("sawtooth").gain(sine.range(0.3, 0.6).slow(2))
  .lpf(sine.range(80, 600).slow(4)).resonance(10)

// Detuned foghorn
note("<[c1,c1]>").s("sawtooth").detune("[0 12]").gain(0.45)
  .lpf(sine.range(100, 500).slow(8)).resonance(8)
  .attack(0.3).release(0.8)
```

### FM Foghorns

```strudel
// FM foghorn
note("<c1>").s("sine").gain(0.5)
  .fm(sine.range(0.5, 4).slow(8)).fmh(2)
  .lpf(400)

// Dark FM drone
note("<c1>").s("sine").gain(0.45)
  .fm(3).fmh(sine.range(1, 4).slow(16))
  .lpf(sine.range(150, 600).slow(8))

// Metallic foghorn
note("<c1>").s("sine").gain(0.4)
  .fm(sine.range(1, 8).slow(4)).fmh(3)
  .lpf(800).shape(0.2)
```

### Layered Foghorns

```strudel
stack(
  // Sub drone
  note("<c1>").s("sine").gain(0.5).lpf(150),
  // Mid foghorn
  note("<c2>").s("sawtooth").gain(0.35)
    .lpf(sine.range(200, 1000).slow(8)).resonance(10),
  // High harmonic
  note("<g2>").s("triangle").gain(0.2)
    .lpf(sine.range(400, 1500).slow(4)).resonance(6)
)
```

---

## Section 4: FM Synthesis

Metallic, bell-like, harsh, evolving textures.

### FM Parameters in Strudel

- `fm` — modulation index (amount of FM)
- `fmh` — harmonicity ratio (frequency ratio of modulator to carrier)

### Basic FM Sounds

```strudel
// Bell
note("<c4 e4 g4 c5>").s("sine").gain(0.4)
  .fm(4).fmh(2)
  .decay(0.5).sustain(0)

// Metallic
note("<c3 c3 eb3 c3>").s("sine").gain(0.45)
  .fm(6).fmh(3.5)
  .decay(0.2).sustain(0)

// Harsh
note("<c2 c2 c3 c2>").s("sine").gain(0.4)
  .fm(8).fmh(7)
  .decay(0.15).sustain(0).shape(0.2)
```

### Evolving FM

```strudel
// Sweeping FM
note("<c3 c3 eb3 c3>").s("sine").gain(0.45)
  .fm(sine.range(1, 10).slow(4)).fmh(3)
  .decay(0.2).sustain(0)

// Random-ish FM
note("<c3 eb3 g3 c4>").s("sine").gain(0.4)
  .fm(saw.range(2, 8).slow(2)).fmh(sine.range(1, 5).slow(8))
  .decay(0.3).sustain(0.1)

// FM bass
note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>").s("sine").gain(0.5)
  .fm(sine.range(0.5, 4).slow(2)).fmh(2)
  .lpf(1500).decay(0.15).sustain(0)
```

### FM Textures

```strudel
// Pad
note("<[c3,e3,g3]>").s("sine").gain(0.3)
  .fm(sine.range(1, 3).slow(8)).fmh(2)
  .attack(0.3).release(0.8).room(0.4)

// Noise-like FM
note("<c4>").s("sine").gain(0.25)
  .fm(20).fmh(sine.range(5, 15).slow(1))
  .lpf(3000).hpf(1000)

// Detuned FM
note("<[c3,c3]>").s("sine").detune("[0 5]").gain(0.35)
  .fm(4).fmh(3)
  .decay(0.3).sustain(0.1)
```

---

## Section 5: Ducking (Sidechain Simulation)

Strudel doesn't have true sidechain, but we simulate with gain patterns.

### Basic Ducking

```strudel
// Duck on every beat (4/4)
note("<c2>").s("sawtooth").gain("[0.1 0.5 0.6 0.6]*2")
  .lpf(1000)

// Duck on kick pattern
note("<c2>").s("sawtooth").gain("[0.1 0.4 0.5 0.6 0.1 0.4 0.5 0.6]")
  .lpf(sine.range(300, 1500).slow(4)).resonance(12)

// Pumping effect
note("<[c2,g2]>").s("sawtooth").gain(sine.range(0.1, 0.6).slow(0.25))
  .lpf(1200).resonance(8)
```

### Ducked Pad

```strudel
note("<[c3,eb3,g3]>").s("sawtooth")
  .gain("[0.05 0.2 0.3 0.35]*4")
  .lpf(2000).attack(0.1).release(0.3).room(0.3)
```

### Ducked Acid

```strudel
note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
  .s("sawtooth").gain("[0.1 0.5 0.6 0.55 0.1 0.5 0.55 0.5]")
  .lpf(sine.range(400, 2500).slow(4)).resonance(18)
  .decay(0.1).sustain(0)
```

### Full Ducked Stack

```strudel
stack(
  // Kick (reference for ducking)
  s("bd:5").gain(0.95),
  
  // Ducked bass
  note("<c2>").s("sawtooth")
    .gain("[0.05 0.45 0.55 0.5]*2")
    .lpf(sine.range(300, 1500).slow(4)).resonance(15),
  
  // Ducked pad
  note("<[c3,eb3,g3]>").s("sawtooth")
    .gain("[0.02 0.15 0.2 0.25]*4")
    .lpf(1500).room(0.3)
)
```

---

## Section 6: Orbits (Spatial Effects)

Orbits route sounds to different effect buses. Use for separation and space.

### Basic Orbit Usage

```strudel
stack(
  // Dry drums on orbit 0
  s("bd:5").gain(0.95).orbit(0),
  s("~ cp ~ cp").gain(0.8).orbit(0),
  
  // Wet acid on orbit 1
  note("<[c2 c2 c3 c2]>").s("sawtooth").gain(0.5)
    .lpf(sine.range(400, 2000).slow(4)).resonance(16)
    .orbit(1).room(0.3).delay(0.25).delayfb(0.4),
  
  // Atmosphere on orbit 2
  note("<[c3,g3]>").s("sine").gain(0.25)
    .orbit(2).room(0.6).size(0.8).delay(0.4).delayfb(0.5)
)
```

### Pan Movement

```strudel
// Panning LFO
note("<[c3 eb3 g3 c4]>").s("sawtooth").gain(0.4)
  .lpf(2000).decay(0.15).sustain(0)
  .pan(sine.range(0.2, 0.8).slow(4))

// Hard pan alternation
note("<c3 eb3 g3 c4>").s("triangle").gain(0.4)
  .pan("[0.2 0.8]*2").decay(0.2).sustain(0)

// Stereo spread
note("<[c3,c3]>").s("sawtooth").detune("[0 7]").gain(0.4)
  .pan("[0.3 0.7]").lpf(2500)
```

---

## Section 7: Detune

Essential for thick, wide sounds.

### Basic Detune

```strudel
// Slight detune (fat)
note("<c2>").s("sawtooth").detune("[0 0.1]").gain(0.5)
  .lpf(1000)

// Heavy detune (detuned)
note("<c2>").s("sawtooth").detune("[0 0.3]").gain(0.5)
  .lpf(1200)

// Multiple voices
note("<[c2,c2,c2]>").s("sawtooth").detune("[0 0.1 -0.1]").gain(0.45)
  .lpf(1000)
```

### Detuned Acid

```strudel
note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
  .s("sawtooth").detune("[0 0.15]").gain(0.5)
  .lpf(sine.range(400, 2500).slow(4)).resonance(16)
  .decay(0.1).sustain(0)
```

### Detuned Pad

```strudel
note("<[c3,eb3,g3]>").s("sawtooth").detune("[0 0.08 -0.08]").gain(0.3)
  .lpf(1800).attack(0.3).release(0.6).room(0.4)
```

### Supersaw Style

```strudel
note("<[c3,eb3,g3,bb3]>").s("sawtooth")
  .detune("[0 0.05 0.1 -0.05 -0.1]").gain(0.35)
  .lpf(2500).attack(0.1).release(0.5).room(0.3)
```

---

## Section 8: Envelopes

Control amplitude and filter over time.

### Amplitude Envelope

```strudel
// Parameters: attack, decay, sustain, release

// Pluck (fast attack, short decay, no sustain)
note("<c3 eb3 g3 c4>").s("sawtooth").gain(0.5)
  .attack(0.001).decay(0.15).sustain(0).release(0.1)

// Pad (slow attack, long release)
note("<[c3,eb3,g3]>").s("sawtooth").gain(0.3)
  .attack(0.5).decay(0.3).sustain(0.6).release(1)

// Swell
note("<c3>").s("sawtooth").gain(0.4)
  .attack(1).decay(0.2).sustain(0.4).release(0.5)

// Punchy bass
note("<[c2 c2 c3 c2]>").s("sawtooth").gain(0.6)
  .attack(0.001).decay(0.1).sustain(0).release(0.05)
```

### Filter Envelope (simulated via LFO)

```strudel
// Plucky filter (saw LFO = one-shot ramp)
note("<[c2 c2 c3 c2]>").s("sawtooth").gain(0.5)
  .lpf(saw.range(2500, 400).slow(0.125)).resonance(15)
  .decay(0.15).sustain(0)

// Slow filter open
note("<c2>").s("sawtooth").gain(0.5)
  .lpf(saw.range(200, 3000).slow(4)).resonance(12)
```

---

## Section 9: Distortion & Effects

### Distortion Types

```strudel
// Shape (soft clip)
note("<c2>").s("sawtooth").gain(0.5).shape(0.3)

// Distort (harder)
note("<c2>").s("sawtooth").gain(0.5).distort(0.4)

// Crush (bitcrusher)
note("<c2>").s("sawtooth").gain(0.5).crush(8)

// Combined
note("<[c2 c2 c3 c2]>").s("sawtooth").gain(0.45)
  .lpf(sine.range(400, 2000).slow(4)).resonance(16)
  .shape(0.3).crush(10)
```

### Distorted Acid Stack

```strudel
stack(
  // Clean sub
  note("<[c1 ~ ~ ~ ~ ~ c1 ~]>").s("sine").gain(0.6).lpf(120),
  
  // Distorted mid
  note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
    .s("sawtooth").gain(0.45)
    .lpf(sine.range(400, 2500).slow(4)).resonance(18)
    .decay(0.1).sustain(0).shape(0.4)
)
```

---

## Section 10: Noise Textures

### Noise Types

```strudel
// White noise
s("noise").gain(0.2).lpf(4000)

// Filtered noise sweep
s("noise").gain(0.15).lpf(sine.range(500, 8000).slow(4)).hpf(200)

// Noise burst
s("noise*8").gain("[0.3 0 0 0 0.2 0 0 0]").lpf(6000).decay(0.05).sustain(0)

// Rhythmic noise
s("noise*16").gain("[0.25 0.1 0.15 0.1]*4").lpf(5000).hpf(2000).decay(0.02).sustain(0)
```

### Industrial Noise

```strudel
// Distorted noise
s("noise").gain(0.2).lpf(3000).shape(0.4)

// Crushed noise
s("noise").gain(0.15).crush(6).lpf(4000)

// Modulated noise
s("noise").gain(sine.range(0.05, 0.25).slow(2))
  .lpf(sine.range(1000, 6000).slow(4)).hpf(500)
```

---

## Full Acid Track Template

```strudel
stack(
  // KICK
  s("bd:5").gain(0.95).shape(0.1).orbit(0),
  
  // CLAP
  s("~ cp ~ cp").gain(0.8).shape(0.15).room(0.1).orbit(0),
  
  // HATS
  s("hh*16").gain("[0.45 0.2 0.35 0.25]*4").lpf(5500).crush(12).orbit(0),
  s("~ ~ ~ oh ~ ~ ~ ~").gain(0.4).orbit(0),
  
  // ACID BASS
  note("<[c2 c2 c3 c2 eb2 c2 g1 c2] [c2 c2 c3 c2 eb2 c2 bb1 c2] [f2 f2 f3 f2 ab2 f2 c2 f2] [g2 g2 g3 g2 bb2 g2 d2 g2]>")
    .s("sawtooth").gain("[0.1 0.5 0.6 0.55 0.1 0.5 0.55 0.5]")
    .lpf(sine.range(400, 3000).slow(8)).resonance(18)
    .decay(0.1).sustain(0).shape(0.25)
    .orbit(1).delay(0.15).delayfb(0.2),
  
  // FOGHORN
  note("<c1 c1 f1 g1>").s("sawtooth").detune("[0 0.1]").gain(0.35)
    .lpf(sine.range(100, 600).slow(16)).resonance(8)
    .attack(0.3).release(0.5)
    .orbit(2),
  
  // FM TEXTURE
  note("<[c3 ~ ~ ~ eb3 ~ ~ ~] [c3 ~ ~ ~ ~ ~ ~ ~]>")
    .s("sine").gain(0.3)
    .fm(sine.range(2, 6).slow(4)).fmh(3)
    .decay(0.25).sustain(0)
    .orbit(1).delay(0.3).delayfb(0.4),
  
  // NOISE TEXTURE
  s("noise").gain(sine.range(0.02, 0.1).slow(8))
    .lpf(sine.range(1000, 4000).slow(4)).hpf(800)
    .orbit(2).room(0.3)
    
).gain(0.75)
```

---

## Subgenre Variations

### Classic Acid House

```strudel
stack(
  s("bd:5").gain(0.95),
  s("~ cp ~ cp").gain(0.8).room(0.15),
  s("hh*8").gain("[0.5 0.35]*4").lpf(5000),
  s("~ ~ ~ oh ~ ~ ~ ~").gain(0.45),
  note("<[c2 c2 c3 c2 eb2 c2 g1 c2]>")
    .s("sawtooth").gain(0.55)
    .lpf(sine.range(400, 2500).slow(4)).resonance(18)
    .decay(0.1).sustain(0)
).gain(0.8)
```

### Acid Techno

```strudel
stack(
  s("bd:5").gain(0.95).shape(0.15),
  s("~ cp ~ cp").gain(0.75).shape(0.2).room(0.08),
  s("hh*16").gain("[0.4 0.2 0.3 0.2]*4").lpf(5000).hpf(1000),
  note("<[c2 c2 c2 c3 c2 c2 eb2 c2]>")
    .s("sawtooth").gain("[0.1 0.5 0.55 0.6 0.1 0.5 0.6 0.5]")
    .lpf(saw.range(300, 3500).slow(2)).resonance(22)
    .decay(0.08).sustain(0).shape(0.3)
).gain(0.75)
```

### Industrial Acid

```strudel
stack(
  s("[bd:5,bd:8]").gain(0.9).shape(0.25).crush(14),
  s("~ [cp,noise] ~ [cp,noise]").gain("[0.8 0.2]*2").shape(0.3).room(0.1).lpf(3000),
  s("noise*16").gain("[0.25 0.1 0.15 0.1]*4").lpf(5000).hpf(2000).decay(0.02).sustain(0),
  note("<[c2 c2 c2 c2 c2 c2 c2 c2]>")
    .s("square").gain(0.5)
    .lpf(sine.range(200, 2500).slow(1)).resonance(25)
    .decay(0.1).sustain(0).shape(0.5).crush(10),
  note("<c1>").s("sine").gain(0.4)
    .fm(sine.range(1, 8).slow(4)).fmh(2)
    .lpf(400)
).gain(0.7)
```

### Dark Acid / Warehouse

```strudel
stack(
  s("bd:5 ~ ~ ~ ~ ~ bd:5 ~").gain(0.95).shape(0.1),
  s("~ ~ ~ ~ cp ~ ~ ~").gain(0.8).room(0.2),
  s("hh*16").gain("[0.35 0.15 0.25 0.2]*4").lpf(4000).hpf(1000),
  note("<[c2 ~ c2 c3 ~ c2 eb2 ~]>")
    .s("sawtooth").gain(0.5)
    .lpf(sine.range(300, 2000).slow(8)).resonance(20)
    .decay(0.12).sustain(0).shape(0.2),
  note("<c1>").s("sawtooth").detune("[0 0.1]").gain(0.3)
    .lpf(sine.range(80, 400).slow(16)).resonance(6)
    .attack(0.5).release(1)
).gain(0.75)
```

---

## Parameter Reference

### Filter

| Parameter | Range | Use |
|-----------|-------|-----|
| `lpf` | 100-8000 | Low pass cutoff |
| `hpf` | 100-4000 | High pass cutoff |
| `resonance` | 1-30 | Filter Q (>15 = self-oscillation) |

### Envelope

| Parameter | Range | Use |
|-----------|-------|-----|
| `attack` | 0.001-2 | Fade in time |
| `decay` | 0.01-2 | Decay time |
| `sustain` | 0-1 | Sustain level |
| `release` | 0.01-2 | Fade out time |

### FM

| Parameter | Range | Use |
|-----------|-------|-----|
| `fm` | 0-20 | Modulation index |
| `fmh` | 0.5-10 | Harmonicity ratio |

### Distortion

| Parameter | Range | Use |
|-----------|-------|-----|
| `shape` | 0-0.9 | Soft clip distortion |
| `distort` | 0-1 | Hard distortion |
| `crush` | 4-16 | Bit depth (lower = more crushed) |

### Spatial

| Parameter | Range | Use |
|-----------|-------|-----|
| `pan` | 0-1 | Stereo position (0.5 = center) |
| `room` | 0-1 | Reverb amount |
| `size` | 0-1 | Reverb size |
| `delay` | 0-1 | Delay amount |
| `delayfb` | 0-0.9 | Delay feedback |
| `orbit` | 0-3 | Effect bus routing |

### Detune

| Parameter | Range | Use |
|-----------|-------|-----|
| `detune` | -1 to 1 | Pitch offset (semitones) |
| `speed` | 0.5-2 | Sample playback speed |

---

## LFO Shapes for Modulation

```strudel
// Sine (smooth)
.lpf(sine.range(300, 2500).slow(4))

// Saw (ramp up)
.lpf(saw.range(300, 2500).slow(2))

// Square (abrupt)
.gain(square.range(0.3, 0.6).slow(1))

// Triangle
.lpf(tri.range(400, 2000).slow(4))

// Random/stepped
.lpf(rand.range(300, 2000))
```

---

## Tips for AI Generation

1. **Resonance is key** — 15-25 for that acid squelch
2. **Filter modulation defines acid** — always modulate lpf with LFO
3. **Accent patterns** — use gain arrays for 303-style accents
4. **Short decay, no sustain** for plucky acid bass
5. **Distortion adds character** — `.shape(0.2-0.4)` on most elements
6. **Ducking via gain patterns** — simulate sidechain
7. **FM for metallic textures** — sweep fm and fmh parameters
8. **Detune for width** — `[0 0.1]` on sawtooth for fat sound
9. **Separate orbits** — dry drums, wet synths, ambient textures
10. **Foghorns = low sawtooth + slow filter sweep**
11. **Industrial = crush + noise + distortion**
12. **Keep sub frequencies clean** — distort mids, not sub
