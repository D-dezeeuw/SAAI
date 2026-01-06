# Strudel Hip-Hop & Trap Template for AI Generation

## Overview

Two related but distinct styles:

**Hip-Hop (Boom Bap)**
- Punchy, sampled-sounding drums
- Swing/shuffle feel
- Deep but short bass hits
- Soulful samples, jazz chords
- Laid-back groove

**Trap**
- 808 bass (long, sustained, pitched)
- Fast hi-hat rolls with triplets
- Sparse, hard-hitting kick
- Dark, minimal atmosphere
- Aggressive or melodic

```strudel
stack(
  // DRUMS
  // 808/BASS
  // MELODY/SAMPLES
  // PADS/ATMO
  // FX/PERC
).gain(0.8)
```

---

# PART 1: HIP-HOP / BOOM BAP

## Section 1: Drums

### Kick

```strudel
// Classic boom bap
s("bd:3 ~ ~ bd:3 ~ ~ bd:3 ~").gain(0.95)

// Syncopated
s("bd:3 ~ ~ ~ bd:3 ~ ~ bd:3").gain(0.95)

// Lazy/behind the beat feel
s("bd:3 ~ ~ bd:3 ~ ~ ~ bd:3").gain(0.95)

// Busy pattern
s("bd:3 ~ bd:3 ~ ~ bd:3 ~ bd:3").gain(0.95)

// J Dilla style (off-grid feel via velocity)
s("bd:3 ~ ~ bd:3 ~ ~ bd:3 ~").gain("[0.95 0.3 0.3 0.9 0.3 0.3 0.85 0.3]")
```

### Snare

```strudel
// Backbeat (2 and 4)
s("~ ~ sd:2 ~ ~ ~ sd:2 ~").gain(0.85).room(0.1)

// With ghost notes
s("~ sd:1 sd:2 ~ ~ sd:1 sd:2 sd:1").gain("[0.3 0.35 0.9 0.3 0.3 0.35 0.9 0.4]").room(0.1)

// Rim on ghost notes
s("~ rim sd:2 ~ ~ rim sd:2 ~").gain("[0.3 0.4 0.9 0.3 0.3 0.4 0.9 0.3]").room(0.1)

// Clap layer
s("~ ~ [sd:2,cp] ~ ~ ~ [sd:2,cp] ~").gain(0.85).room(0.12)
```

### Hi-Hats

```strudel
// Basic 8ths with swing feel
s("hh*8").gain("[0.6 0.35 0.5 0.35]*2").lpf(5000)

// 16ths with accent pattern
s("hh*16").gain("[0.5 0.2 0.3 0.25]*4").lpf(5500).hpf(800)

// Open hat accents
s("[hh hh hh oh hh hh hh hh]").gain("[0.5 0.3 0.4 0.55 0.5 0.3 0.4 0.35]").lpf(5000)

// Loose/human feel
s("hh*8").gain("[0.55 0.3 0.45 0.35 0.5 0.3 0.4 0.3]").lpf(4500)
```

### Full Boom Bap Kit

```strudel
stack(
  s("bd:3 ~ ~ bd:3 ~ ~ bd:3 ~").gain(0.95),
  s("~ ~ sd:2 ~ ~ ~ sd:2 ~").gain(0.85).room(0.1),
  s("~ rim ~ ~ ~ rim ~ rim").gain(0.35),
  s("hh*8").gain("[0.55 0.3 0.45 0.35]*2").lpf(5000),
  s("~ ~ ~ oh ~ ~ ~ ~").gain(0.4)
).swing(0.04)
```

---

## Section 2: Bass (Boom Bap)

Short, punchy bass — not sustained 808s:

```strudel
// Root note hits
note("<[c2 ~ ~ ~ ~ ~ c2 ~]>").s("bass").gain(0.8).lpf(400).decay(0.2).sustain(0)

// Following kick
note("<[c2 ~ ~ c2 ~ ~ c2 ~]>").s("bass").gain(0.8).lpf(350).decay(0.15).sustain(0)

// With movement
note("<[c2 ~ ~ eb2 ~ ~ c2 ~] [f2 ~ ~ ab2 ~ ~ f2 ~]>")
  .s("bass").gain(0.75).lpf(400).decay(0.2).sustain(0)

// Moog-style
note("<[c2 ~ c2 ~ ~ c2 ~ eb2]>")
  .s("sawtooth").gain(0.65).lpf(600).decay(0.15).sustain(0).shape(0.2)
```

---

## Section 3: Melodic Elements (Boom Bap)

### Rhodes/Keys (soul samples feel)

```strudel
// Soulful chords
note("<[c3,eb3,g3,bb3] [f3,ab3,c4,eb4] [g3,bb3,d4] [c3,eb3,g3]>")
  .s("rhodes").gain(0.5).lpf(2500).room(0.15)

// Rhythmic stabs
note("<[c3,eb3,g3,bb3] [f3,ab3,c4,eb4]>")
  .s("rhodes").struct("x ~ ~ x ~ x ~ ~").gain(0.55).lpf(2800).decay(0.3).sustain(0.1)

// Jazz voicings
note("<[c3,eb3,bb3,d4] [f3,ab3,eb4,g4] [bb2,d3,ab3,c4] [eb3,g3,db4,f4]>")
  .s("rhodes").gain(0.45).lpf(2200).room(0.2)
```

### Piano

```strudel
// Simple chops
note("<[c4,eb4,g4] ~ ~ [bb3,d4,f4] ~ ~ ~ ~>")
  .s("piano").gain(0.5).lpf(3000).room(0.15)

// Melodic line
note("<[c4 ~ eb4 ~ g4 ~ f4 eb4] [c4 ~ ~ ~ ~ ~ ~ ~]>")
  .s("piano").gain(0.45).lpf(3500).room(0.1)
```

### Strings/Samples

```strudel
// Lush pad (sampled strings feel)
note("<[c3,eb3,g3] [f3,ab3,c4]>")
  .s("sawtooth").gain(0.25).lpf(1500).attack(0.2).release(0.6).room(0.4)

// Chopped vocal feel (use any melodic sound)
note("<[g4 ~ ~ ~ eb4 ~ ~ ~] [f4 ~ ~ ~ ~ ~ ~ ~]>")
  .s("sine").gain(0.35).lpf(2000).attack(0.01).decay(0.3).sustain(0.1).room(0.3)
```

---

## Full Boom Bap Template

```strudel
stack(
  // KICK
  s("bd:3 ~ ~ bd:3 ~ ~ bd:3 ~").gain(0.95),
  
  // SNARE + GHOST
  s("~ ~ sd:2 ~ ~ ~ sd:2 ~").gain(0.85).room(0.1),
  s("~ rim ~ ~ ~ rim ~ rim").gain(0.35),
  
  // HATS
  s("hh*8").gain("[0.55 0.3 0.45 0.35]*2").lpf(5000),
  s("~ ~ ~ oh ~ ~ ~ ~").gain(0.4),
  
  // BASS
  note("<[c2 ~ ~ c2 ~ ~ c2 ~] [c2 ~ ~ c2 ~ ~ c2 ~] [f2 ~ ~ f2 ~ ~ f2 ~] [g2 ~ ~ g2 ~ ~ g2 ~]>")
    .s("bass").gain(0.75).lpf(400).decay(0.2).sustain(0),
  
  // RHODES
  note("<[c3,eb3,g3,bb3] [c3,eb3,g3,bb3] [f3,ab3,c4,eb4] [g3,bb3,d4,f4]>")
    .s("rhodes").struct("x ~ ~ x ~ x ~ ~").gain(0.5).lpf(2500).room(0.15),
  
  // PAD
  note("<[c4,g4] [c4,g4] [f4,c5] [g4,d5]>")
    .s("sawtooth").gain(0.15).lpf(1200).attack(0.3).release(0.5).room(0.4)
    
).gain(0.75).swing(0.03)
```

---

# PART 2: TRAP

## Section 1: Drums

### Kick

Trap kicks are sparse but hard:

```strudel
// Basic trap
s("bd:5 ~ ~ ~ ~ ~ ~ ~ bd:5 ~ ~ ~ ~ ~ ~ ~").gain(0.95)

// Sparse
s("bd:5 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ bd:5 ~").gain(0.95)

// Double kick
s("bd:5 bd:5 ~ ~ ~ ~ ~ ~ bd:5 ~ ~ ~ ~ ~ ~ ~").gain(0.95)

// Syncopated
s("bd:5 ~ ~ ~ ~ ~ bd:5 ~ ~ ~ bd:5 ~ ~ ~ ~ ~").gain(0.95)

// Busy (drill-influenced)
s("bd:5 ~ bd:5 ~ ~ ~ bd:5 ~ bd:5 ~ ~ bd:5 ~ ~ bd:5 ~").gain(0.9)
```

### Snare/Clap

Snare typically on beat 3 (step 9 of 16):

```strudel
// Standard trap snare
s("~ ~ ~ ~ ~ ~ ~ ~ cp ~ ~ ~ ~ ~ ~ ~").gain(0.9).room(0.15)

// Layered
s("~ ~ ~ ~ ~ ~ ~ ~ [sd:3,cp] ~ ~ ~ ~ ~ ~ ~").gain(0.9).room(0.12)

// With rim
s("~ ~ ~ ~ ~ ~ ~ ~ [sd:3,cp] ~ ~ ~ ~ ~ ~ [rim,~]").gain(0.85).room(0.12)

// Double snare
s("~ ~ ~ ~ ~ ~ ~ ~ cp ~ ~ ~ ~ ~ cp ~").gain(0.85).room(0.12)
```

### Hi-Hats (THE defining trap element)

Rolls, triplets, and velocity patterns:

```strudel
// Basic 16ths
s("hh*16").gain("[0.5 0.25 0.35 0.3]*4").lpf(6000).hpf(800)

// With rolls (32nds)
s("[hh*4] [hh*4] [hh*8] [hh*4]").gain(0.45).lpf(5500).hpf(900)

// Triplet feel
s("hh*12").gain("[0.5 0.3 0.35]*4").lpf(5500).hpf(800)

// Classic trap pattern with rolls
s("hh hh hh hh [hh*4] hh hh hh hh hh [hh*8] hh hh hh [hh*4] hh")
  .gain(0.5).lpf(6000).hpf(900)

// Open hat accents
s("oh ~ ~ ~ ~ ~ ~ ~ oh ~ ~ ~ ~ ~ ~ ~").gain(0.45).lpf(5000)

// Complex roll pattern
s("[hh hh] [hh hh] [hh hh hh hh] [hh hh] [hh hh] [hh hh] [hh*8] [hh hh]")
  .gain("[0.5 0.3]*8").lpf(5500).hpf(900)
```

### Percussion

```strudel
// Snap
s("~ ~ ~ ~ snap ~ ~ ~ ~ ~ ~ ~ snap ~ ~ ~").gain(0.5)

// Rim
s("~ ~ rim ~ ~ ~ ~ ~ ~ ~ rim ~ ~ ~ ~ ~").gain(0.4)

// Perc hits
s("~ ~ ~ ~ ~ ~ ~ perc ~ ~ ~ ~ ~ ~ ~ ~").gain(0.45)
```

### Full Trap Kit

```strudel
stack(
  s("bd:5 ~ ~ ~ ~ ~ ~ ~ bd:5 ~ ~ ~ ~ ~ ~ ~").gain(0.95),
  s("~ ~ ~ ~ ~ ~ ~ ~ [sd:3,cp] ~ ~ ~ ~ ~ ~ ~").gain(0.9).room(0.12),
  s("hh hh hh hh [hh*4] hh hh hh hh hh [hh*8] hh hh hh [hh*4] hh").gain(0.45).lpf(5500).hpf(900),
  s("oh ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~").gain(0.4)
)
```

---

## Section 2: 808 Bass

THE defining trap sound — long, sustained, often pitched:

```strudel
// Basic 808
note("<[c1 ~ ~ ~ ~ ~ ~ ~]>").s("bass").gain(0.85).lpf(200).decay(1.5).sustain(0.3)

// Following kick
note("<[c1 ~ ~ ~ ~ ~ ~ ~ c1 ~ ~ ~ ~ ~ ~ ~]>").s("sine").gain(0.85).lpf(150).decay(1.2).sustain(0.2)

// Melodic 808
note("<[c1 ~ ~ ~ ~ ~ ~ ~ eb1 ~ ~ ~ ~ ~ ~ ~] [f1 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~]>")
  .s("sine").gain(0.85).lpf(180).decay(1.5).sustain(0.3)

// Glide/portamento (approximated)
note("<[c1 ~ ~ ~ ~ ~ eb1 ~] [f1 ~ ~ ~ ~ ~ ~ ~]>")
  .s("sine").gain(0.85).lpf(200).decay(1).sustain(0.3)

// Distorted 808
note("<[c1 ~ ~ ~ ~ ~ ~ ~]>").s("sine").gain(0.9).lpf(250).decay(1.5).sustain(0.3).shape(0.4)

// Short 808 hits
note("<[c1 c1 ~ ~ ~ ~ c1 ~]>").s("sine").gain(0.85).lpf(180).decay(0.3).sustain(0)

// Long sustain 808
note("<c1 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~>").s("sine").gain(0.8).lpf(150).attack(0.01).decay(2).sustain(0.4).release(0.5)
```

### 808 with Sub Layer

```strudel
stack(
  // Sub layer
  note("<[c1 ~ ~ ~ ~ ~ ~ ~]>").s("sine").gain(0.7).lpf(80),
  // Mid 808
  note("<[c1 ~ ~ ~ ~ ~ ~ ~]>").s("triangle").gain(0.5).lpf(300).decay(1.2).sustain(0.2).shape(0.3)
)
```

---

## Section 3: Melodic Elements (Trap)

### Dark Melodies

```strudel
// Minor key plucks
note("<[c4 ~ eb4 ~ g4 ~ ~ ~] [~ ~ f4 ~ ~ ~ eb4 ~]>")
  .s("triangle").gain(0.45).lpf(3000).decay(0.2).sustain(0).delay(0.25).delayfb(0.3)

// Bell/pluck melody
note("<[c5 ~ ~ ~ g4 ~ ~ ~] [eb5 ~ ~ ~ ~ ~ c5 ~]>")
  .s("sine").gain(0.4).lpf(4000).decay(0.3).sustain(0).delay(0.3).delayfb(0.4)

// Arp
note("<[c4 eb4 g4 c5 g4 eb4 c4 eb4]>")
  .s("triangle").gain(0.35).lpf(3500).decay(0.15).sustain(0).delay(0.2).delayfb(0.35)
```

### Pads

```strudel
// Dark pad
note("<[c3,eb3,g3] [f3,ab3,c4]>")
  .s("sawtooth").gain(0.2).lpf(1200).attack(0.4).release(0.8).room(0.5).size(0.7)

// Atmospheric
note("<[c4,g4] [eb4,bb4]>")
  .s("sine").gain(0.15).delay(0.5).delayfb(0.5).room(0.6).size(0.8)

// Strings
note("<[c3,eb3,g3,bb3]>")
  .s("sawtooth").gain(0.2).lpf(1500).attack(0.3).release(1).room(0.4)
```

### Flute/Lead (melodic trap)

```strudel
// Flute-style
note("<[c5 ~ ~ eb5 ~ ~ g5 ~] [f5 ~ ~ ~ eb5 ~ c5 ~]>")
  .s("sine").gain(0.35).lpf(5000).attack(0.05).decay(0.3).sustain(0.2).room(0.3)

// Lead
note("<[c5 ~ eb5 ~ ~ g5 ~ f5] [eb5 ~ ~ ~ c5 ~ ~ ~]>")
  .s("triangle").gain(0.4).lpf(4000).decay(0.25).sustain(0.1).delay(0.2).delayfb(0.3)
```

---

## Full Trap Template

```strudel
stack(
  // KICK
  s("bd:5 ~ ~ ~ ~ ~ ~ ~ bd:5 ~ ~ ~ ~ ~ ~ ~").gain(0.95),
  
  // SNARE
  s("~ ~ ~ ~ ~ ~ ~ ~ [sd:3,cp] ~ ~ ~ ~ ~ ~ ~").gain(0.9).room(0.12),
  
  // HI-HATS
  s("hh hh hh hh [hh*4] hh hh hh hh hh [hh*8] hh hh hh [hh*4] hh")
    .gain(0.45).lpf(5500).hpf(900),
  s("oh ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~").gain(0.4),
  
  // 808
  note("<[c1 ~ ~ ~ ~ ~ ~ ~ c1 ~ ~ ~ ~ ~ ~ ~] [c1 ~ ~ ~ ~ ~ ~ ~ eb1 ~ ~ ~ ~ ~ ~ ~] [f1 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~] [g1 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~]>")
    .s("sine").gain(0.85).lpf(180).decay(1.2).sustain(0.3).shape(0.2),
  
  // MELODY
  note("<[c4 ~ eb4 ~ g4 ~ ~ ~] [c4 ~ eb4 ~ g4 ~ ~ ~] [f4 ~ ab4 ~ c5 ~ ~ ~] [g4 ~ bb4 ~ d5 ~ ~ ~]>")
    .s("triangle").gain(0.4).lpf(3500).decay(0.2).sustain(0).delay(0.25).delayfb(0.3),
  
  // PAD
  note("<[c3,eb3,g3] [c3,eb3,g3] [f3,ab3,c4] [g3,bb3,d4]>")
    .s("sawtooth").gain(0.15).lpf(1200).attack(0.4).release(0.8).room(0.5)
    
).gain(0.75)
```

---

# PART 3: SUBGENRES

## Lo-Fi Hip Hop

Warm, dusty, relaxed:

```strudel
stack(
  s("bd:3 ~ ~ bd:3 ~ ~ bd:3 ~").gain(0.85).lpf(400),
  s("~ ~ sd:2 ~ ~ ~ sd:2 ~").gain(0.7).room(0.2).lpf(3000),
  s("hh*8").gain("[0.4 0.25 0.35 0.25]*2").lpf(3000).hpf(800),
  note("<[c2 ~ ~ c2 ~ ~ c2 ~]>").s("bass").gain(0.65).lpf(300).decay(0.25).sustain(0),
  note("<[c3,eb3,g3,bb3] [f3,ab3,c4]>").s("rhodes").gain(0.45).lpf(2000).room(0.25)
).gain(0.7).lpf(4000).swing(0.05)
```

## Drill

Dark, sliding 808s, busy kick:

```strudel
stack(
  s("bd:5 ~ bd:5 ~ ~ ~ bd:5 ~ bd:5 ~ ~ bd:5 ~ ~ bd:5 ~").gain(0.95),
  s("~ ~ ~ ~ ~ ~ ~ ~ [sd:3,cp] ~ ~ ~ ~ ~ ~ [sd:3,~]").gain(0.9).room(0.1),
  s("hh*16").gain("[0.45 0.2 0.35 0.25]*4").lpf(5000).hpf(1000),
  note("<[c1 ~ ~ ~ ~ eb1 ~ ~] [f1 ~ ~ ~ ~ ~ ~ ~]>")
    .s("sine").gain(0.9).lpf(200).decay(1).sustain(0.3).shape(0.35)
).gain(0.8)
```

## Phonk

Memphis-influenced, dark, cowbell:

```strudel
stack(
  s("bd:5 ~ ~ bd:5 ~ ~ bd:5 ~").gain(0.95),
  s("~ ~ cp ~ ~ ~ cp ~").gain(0.85).room(0.15),
  s("hh*8").gain("[0.5 0.3 0.4 0.3]*2").lpf(4500),
  s("cowbell*8").gain("[0.4 0.2 0.3 0.25]*2").lpf(3000),
  note("<[c1 ~ c1 ~ ~ c1 ~ ~]>").s("sine").gain(0.85).lpf(200).decay(0.8).sustain(0.2).shape(0.4)
).gain(0.75)
```

## Cloud Rap / Ambient Trap

Spacey, reverb-heavy:

```strudel
stack(
  s("bd:5 ~ ~ ~ ~ ~ ~ ~ bd:5 ~ ~ ~ ~ ~ ~ ~").gain(0.85).room(0.3),
  s("~ ~ ~ ~ ~ ~ ~ ~ cp ~ ~ ~ ~ ~ ~ ~").gain(0.7).room(0.4).size(0.7),
  s("hh*8").gain(0.3).lpf(4000).room(0.3),
  note("<c1 ~ ~ ~ ~ ~ ~ ~>").s("sine").gain(0.7).lpf(150).decay(2).sustain(0.4),
  note("<[c4,g4] [eb4,bb4]>").s("sine").gain(0.2).delay(0.5).delayfb(0.6).room(0.7).size(0.9)
).gain(0.7)
```

---

## Common Scales/Keys

| Key | Notes | Mood |
|-----|-------|------|
| C minor | c, d, eb, f, g, ab, bb | Dark, hard |
| A minor | a, b, c, d, e, f, g | Melancholic |
| F minor | f, g, ab, bb, c, db, eb | Deep, emotional |
| D minor | d, e, f, g, a, bb, c | Aggressive |
| G minor | g, a, bb, c, d, eb, f | Energetic |

---

## Common Chord Progressions

```
// i - VI - VII (trap standard)
Cm - Ab - Bb
note("<[c3,eb3,g3] [ab2,c3,eb3] [bb2,d3,f3]>")

// i - iv - VII - III (emotional)
Cm - Fm - Bb - Eb
note("<[c3,eb3,g3] [f3,ab3,c4] [bb2,d3,f3] [eb3,g3,bb3]>")

// i - VII - VI - VII (boom bap)
Cm - Bb - Ab - Bb
note("<[c3,eb3,g3] [bb2,d3,f3] [ab2,c3,eb3] [bb2,d3,f3]>")

// i - i - iv - V (hip hop)
Am - Am - Dm - E
note("<[a2,c3,e3] [a2,c3,e3] [d3,f3,a3] [e3,gs3,b3]>")
```

---

## Effect Parameters Guide

| Effect | Hip-Hop | Trap | Use |
|--------|---------|------|-----|
| `lpf` | 300-500 (bass), 2000-3000 (keys) | 150-250 (808), 3000-5000 (melody) | Warmth vs clarity |
| `hpf` | 800-1000 (hats) | 800-1000 (hats) | Clean hats |
| `room` | 0.1-0.2 | 0.1-0.15 (drums), 0.3-0.5 (melody) | Space |
| `decay` | 0.15-0.3 (bass) | 1.0-2.0 (808) | Short vs long |
| `sustain` | 0 (punchy) | 0.2-0.4 (808) | Sustain tail |
| `shape` | 0.1-0.2 | 0.2-0.4 (808) | Distortion |
| `swing` | 0.02-0.05 | 0 (usually straight) | Groove |
| `delay` | 0.15-0.25 | 0.2-0.35 | Melody space |
| `delayfb` | 0.2-0.3 | 0.3-0.5 | Echo trails |

---

## Hi-Hat Roll Patterns (Trap)

```strudel
// Standard with rolls
"hh hh hh hh [hh*4] hh hh hh hh hh [hh*8] hh hh hh [hh*4] hh"

// Triplet rolls
"hh hh hh [hh*3] hh hh hh hh hh [hh*6] hh hh hh hh [hh*3] hh"

// Sparse with long roll
"hh ~ hh ~ hh ~ hh ~ hh ~ hh ~ [hh*16] ~"

// Alternating
"[hh hh] [hh*4] [hh hh] [hh hh] [hh hh] [hh*8] [hh hh] [hh*4]"
```

---

## Tips for AI Generation

### Hip-Hop
1. **Swing is essential** — use `.swing(0.02-0.05)`
2. **Ghost notes on snare** add groove
3. **Bass is short and punchy** — low decay, no sustain
4. **Rhodes/keys define the vibe** — jazz voicings
5. **Keep it warm** — lower LPF values overall
6. **Sample-like feel** — rhythmic chops on melodic elements

### Trap
1. **808 is king** — long decay, sustain, slight distortion
2. **Hi-hat rolls define energy** — vary between 16ths, 32nds, triplets
3. **Kick is sparse** — less is more
4. **Snare on beat 3** (step 9 of 16)
5. **Dark minor keys** — C minor, F minor
6. **Melody is simple** — plucks, bells, delayed
7. **No swing** — trap is usually straight timing
8. **Layer 808** — sub sine + mid triangle for fullness

### Both
1. **16-step patterns** work best for trap drums
2. **8-step patterns** work for boom bap
3. **Match 808/bass to chord roots**
4. **Velocity variation on hats** is crucial
5. **Keep master gain 0.75-0.8** to avoid clipping
