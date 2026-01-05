# Strudel Jazz Template for AI Generation

## Core Characteristics

Jazz is defined by:
- **Swing feel** — triplet-based groove
- **Complex harmony** — 7th, 9th, 11th, 13th chords, alterations
- **Improvisation** — controlled randomness, variation
- **Voice leading** — smooth chord transitions
- **Call and response** — melodic conversation
- **Rhythmic freedom** — syncopation, anticipation

```strudel
stack(
  // DRUMS (swing feel)
  // BASS (walking or comping)
  // CHORDS (voicings)
  // MELODY/SOLO (improvisation)
).cpm(120)
```

---

## Section 1: Randomness & Improvisation

Jazz requires controlled randomness. Strudel has powerful tools for this.

### Random Selectors

#### choose — Pick random element each event
```strudel
// Random note from list
note(choose("c4", "d4", "e4", "g4", "a4")).s("piano")

// Random rhythm
s(choose("bd", "sd", "hh", "rim")).fast(4)
```

#### wchoose — Weighted random selection
```strudel
// Weighted — root note more likely
note(wchoose(["c4", 5], ["e4", 2], ["g4", 2], ["b4", 1])).s("piano")
```

#### chooseCycles — Pick random element per cycle
```strudel
// Different pattern each cycle
chooseCycles("c4 e4 g4", "d4 f4 a4", "e4 g4 b4").note().s("piano")
```

#### wchooseCycles — Weighted per cycle
```strudel
// Main pattern more likely
wchooseCycles(["c4 e4 g4 b4", 5], ["c4 d4 e4 f4", 2], ["g4 a4 b4 c5", 1])
  .note().s("piano")
```

### Continuous Random Signals

#### rand — Continuous random 0-1
```strudel
// Random velocity
note("c4 e4 g4 b4").s("piano").gain(rand.range(0.4, 0.9))

// Random filter
note("c3*8").s("sawtooth").lpf(rand.range(500, 3000))

// Random pan
note("c4 e4 g4 b4").s("piano").pan(rand)
```

#### perlin — Smooth random (Perlin noise)
```strudel
// Smooth pitch drift (humanize)
note("c4 e4 g4 b4").add(perlin.range(-0.2, 0.2)).s("piano")

// Smooth filter movement
note("c3*4").s("sawtooth").lpf(perlin.range(400, 2000).slow(4))
```

#### irand — Random integers
```strudel
// Random scale degree
n(irand(8)).scale("C:dorian").s("piano")

// Random octave jump
note("c3 e3 g3").add(irand(2).mul(12)).s("piano")
```

### Probability Functions

#### degradeBy — Random note removal
```strudel
// 30% of notes removed (sparse feel)
note("c4 d4 e4 f4 g4 a4 b4 c5").degradeBy(0.3).s("piano")

// Mini-notation: ?
note("c4 d4? e4 f4? g4 a4? b4 c5").s("piano")  // 50% removal
note("c4 d4?0.3 e4 f4?0.3").s("piano")  // 30% removal
```

#### degrade — 50% removal
```strudel
note("c4 e4 g4 b4 c5 b4 g4 e4").degrade().s("piano")
```

#### sometimesBy — Random function application
```strudel
// 40% chance of octave jump
note("c4 e4 g4 b4").sometimesBy(0.4, x => x.add(12)).s("piano")

// 30% chance of accent
note("c4 e4 g4 b4").sometimesBy(0.3, x => x.gain(1.2)).s("piano")
```

#### sometimes — 50% chance
```strudel
note("c4 e4 g4 b4").sometimes(x => x.add(7)).s("piano")
```

#### often — 75% chance
```strudel
note("c4 e4 g4 b4").often(x => x.add(12)).s("piano")
```

#### rarely — 25% chance
```strudel
note("c4 e4 g4 b4").rarely(x => x.add(-12)).s("piano")
```

#### almostAlways / almostNever
```strudel
// 90% / 10% probability
note("c4 e4 g4 b4").almostAlways(x => x.gain(0.8)).s("piano")
note("c4 e4 g4 b4").almostNever(x => x.add(12)).s("piano")
```

---

## Section 2: Jazz Voicings

Strudel has a powerful voicing system with automatic voice leading.

### Basic Voicing Usage

```strudel
// Simple chord symbols
"<C^7 A7 Dm7 G7>".voicing().s("piano")

// With dictionary (lefthand = rootless voicings)
"<C^7 A7b13 Dm7 G7>".voicing().dict('lefthand').s("piano")

// iReal dictionary (full voicings)
"<C^7 A7b13 Dm7 G7>".voicing().dict('ireal').s("piano")
```

### Available Chord Symbols

```
Basic: 2 5 6 7 9 11 13 69 add9 sus
Major: ^ ^7 ^9 ^13 ^7#11 ^9#11 ^7#5
Minor: - -7 -9 -11 -6 -69 -^7 -^9 -add9 -7b5 -b6 -#5
Dominant: 7 7b9 7#9 7#11 7b5 7#5 9#11 9b5 9#5 7b13 7alt
Diminished: o o7 h h7 h9
Augmented: aug

Examples:
C^7 = C major 7
Cm7 or C-7 = C minor 7
C7 = C dominant 7
C7b9 = C dominant 7 flat 9
C7alt = C altered dominant
Cm7b5 or C-7b5 = C half-diminished
Co7 = C diminished 7
```

### Voicing Controls

```strudel
// anchor — align voicing to a note
"<C^7 Dm7 G7 C^7>".voicing().anchor("G4").s("piano")

// mode — how to align
// 'below': top note <= anchor
// 'duck': top note <= anchor, anchor excluded
// 'above': bottom note >= anchor
"<C^7 Dm7 G7 C^7>".voicing().anchor("G4").mode("below").s("piano")

// offset — shift voicing up/down
"<C^7 Dm7 G7 C^7>".voicing().offset(1).s("piano")

// n — arpeggiate the voicing
n("0 1 2 3").chord("<C^7 Dm7 G7 C^7>").voicing().s("piano")
```

### Layered Voicings (Comping + Bass)

```strudel
"<C^7 A7b13 Dm7 G7>".layer(
  // Chords with rhythm
  x => x.voicing().dict('lefthand').struct("[~ x]*2").note().s("piano"),
  // Bass root notes
  x => x.rootNotes(2).note().s("bass")
)
```

---

## Section 3: Jazz Scales

### Common Jazz Scales

```strudel
// Major modes
n("0 1 2 3 4 5 6 7").scale("C:major").note()       // Ionian
n("0 1 2 3 4 5 6 7").scale("C:dorian").note()      // Dorian (minor)
n("0 1 2 3 4 5 6 7").scale("C:phrygian").note()    // Phrygian
n("0 1 2 3 4 5 6 7").scale("C:lydian").note()      // Lydian (#4)
n("0 1 2 3 4 5 6 7").scale("C:mixolydian").note()  // Mixolydian (dominant)
n("0 1 2 3 4 5 6 7").scale("C:aeolian").note()     // Aeolian (natural minor)
n("0 1 2 3 4 5 6 7").scale("C:locrian").note()     // Locrian (half-dim)

// Bebop scales (8 notes, chromatic passing tone)
n("0 1 2 3 4 5 6 7").scale("C:bebop").note()
n("0 1 2 3 4 5 6 7").scale("C:bebop major").note()
n("0 1 2 3 4 5 6 7").scale("C:bebop minor").note()
n("0 1 2 3 4 5 6 7").scale("C:bebop dominant").note()

// Other jazz scales
n("0 1 2 3 4 5 6 7").scale("C:melodic minor").note()
n("0 1 2 3 4 5 6 7").scale("C:harmonic minor").note()
n("0 1 2 3 4 5 6 7").scale("C:whole tone").note()
n("0 1 2 3 4 5 6 7").scale("C:diminished").note()     // whole-half
n("0 1 2 3 4 5 6 7").scale("C:half-whole diminished").note()
n("0 1 2 3 4 5 6 7").scale("C:altered").note()        // superlocrian
n("0 1 2 3 4 5 6 7").scale("C:lydian dominant").note()
```

### Scale Transposition

```strudel
// Move within scale
n("0 2 4 6").scale("C:dorian").scaleTranspose("<0 1 2 3>").note().s("piano")

// Random scale degree
n(irand(8)).scale("C:bebop major").note().s("piano")
```

---

## Section 4: Jazz Drums

### Basic Swing Pattern

```strudel
stack(
  // Ride cymbal — swing pattern
  s("[ride ~ ride] [~ ride ride]").gain("[0.7 0.5 0.6] [0.5 0.6 0.65]"),
  
  // Hi-hat on 2 and 4
  s("~ hh:1 ~ hh:1").gain(0.5),
  
  // Kick (sparse, random)
  s("bd ~ ~ ~").degradeBy(0.3).gain(0.8),
  
  // Snare ghost notes + accents
  s("~ ~ sd:1 ~").gain(0.75).sometimes(x => x.gain(0.4))
)
```

### Swing Feel with Triplets

Strudel's `[a b c]` notation naturally creates triplet feel:

```strudel
// Swing ride
s("[ride ~ ride] [~ ride ride] [ride ~ ride] [~ ride ride]")
  .gain("[0.8 0.4 0.6]*4")

// Shuffle — each beat has two notes (2:1 ratio)
note("<[c3 ~ e3] [g3 ~ c4]>*4").s("piano")
```

### Jazz Drums with Variation

```strudel
stack(
  // Ride with random accents
  s("[ride ~ ride] [~ ride ride]").fast(2)
    .gain(rand.range(0.5, 0.8)),
  
  // Hi-hat 2 and 4
  s("~ hh:1 ~ hh:1").gain(0.5),
  
  // Kick — random placement
  s("bd? ~ bd? ~").gain(0.75),
  
  // Snare — occasional accent
  s("~ ~ sd:1 ~").rarely(x => x.s("sd:2").gain(0.9))
    .gain(0.6),
  
  // Random ghost notes
  s("sd:0*8").degradeBy(0.7).gain(0.25).pan(rand.range(0.3, 0.7))
)
```

### Brush Pattern

```strudel
stack(
  s("[brush brush brush] [brush brush brush]").fast(2)
    .gain("[0.5 0.3 0.4]*4").lpf(3000),
  s("~ hh:1 ~ hh:1").gain(0.3),
  s("bd? ~ ~ bd?").gain(0.6)
)
```

---

## Section 5: Walking Bass

### Basic Walking Bass

```strudel
// Simple walking line (one note per beat)
note("<c2 e2 a2 g2>").s("bass").gain(0.8).lpf(800)

// With chromatic approaches
note("<c2 d2 eb2 e2>*2 <g2 a2 bb2 b2>*2").s("bass").lpf(800)
```

### Walking Bass with Chord Changes

```strudel
// Walking bass following ii-V-I
note(`<
  [d2 e2 f2 fs2]
  [g2 a2 b2 c3]
  [c2 e2 g2 e2]
  [c2 e2 g2 e2]
>`).s("bass").gain(0.8).lpf(800)
```

### Randomized Walking Bass

```strudel
// Random scale tones with chromatic approaches
n(irand(5).add("<0 0 0 -1>"))  // occasional chromatic
  .scale("<D:dorian G:mixolydian C:major C:major>/4")
  .note().s("bass").lpf(800)
```

### Walking Bass Generator

```strudel
// Generative walking bass
n("0 <1 2> <2 3 4> <3 4 -1>")
  .scale("<Dm7 G7 C^7 C^7>/4:2")  // :2 = octave 2
  .note().s("bass").lpf(900).gain(0.8)
```

---

## Section 6: Chord Comping

### Basic Comping Rhythms

```strudel
// Simple comp
"<Dm7 G7 C^7 A7>".voicing().struct("~ x ~ x").note().s("piano")

// Syncopated
"<Dm7 G7 C^7 A7>".voicing().struct("[~ x] [x ~] [~ x] x").note().s("piano")

// Charleston rhythm
"<Dm7 G7 C^7 A7>".voicing().struct("x ~ ~ [~ x]").note().s("piano")
```

### Random Comping

```strudel
// Randomized rhythm
"<Dm7 G7 C^7 A7>".voicing()
  .struct("x*4").degradeBy(0.4)
  .note().s("piano").gain(rand.range(0.5, 0.8))

// Random voicing inversions
"<Dm7 G7 C^7 A7>".voicing()
  .offset(irand(3))
  .struct("[~ x]*2").note().s("piano")
```

### Comping with Humanization

```strudel
"<C^7 A7b13 Dm7 G7>".voicing().dict('lefthand')
  .struct("[~ x]*2")
  .add(perlin.range(-0.05, 0.05))  // slight pitch drift
  .note().s("piano")
  .gain(rand.range(0.5, 0.75))
  .room(0.2)
```

---

## Section 7: Jazz Melody & Improvisation

### Bebop Lines

```strudel
// Bebop scale line
n("0 1 2 3 4 5 6 7 6 5 4 3 2 1 0 -1")
  .scale("C4:bebop major")
  .note().s("piano").fast(2)
```

### Improvisation with Controlled Randomness

```strudel
// Random notes from scale
n(irand(8).segment(8))
  .scale("C4:dorian")
  .note().s("piano")
  .degradeBy(0.2)  // some rests
  .gain(rand.range(0.5, 0.9))

// Weighted note choice (chord tones more likely)
n(wchoose([0, 4], [2, 3], [4, 4], [6, 3], [1, 1], [3, 1], [5, 1], [7, 2]).segment(8))
  .scale("C4:major")
  .note().s("piano")
```

### Melodic Patterns with Variation

```strudel
// Pattern with random alterations
n("<0 2 4 7> <4 2 0 -3>")
  .scale("C4:dorian")
  .sometimes(x => x.add(7))      // octave jump
  .rarely(x => x.add(-5))        // drop
  .note().s("piano")
  .gain(rand.range(0.6, 0.9))
```

### Call and Response

```strudel
stack(
  // Call (piano)
  n("<[0 2 4 7] ~> <~ [4 2 0 -3]>")
    .scale("C4:dorian")
    .note().s("piano").gain(0.8),
  
  // Response (sax-like)
  n("<~ [2 4 6 4]> <[7 5 4 2] ~>")
    .scale("C4:dorian")
    .note().s("sawtooth").lpf(2000).gain(0.5)
)
```

### Lick Library (Randomized)

```strudel
// Random lick selection per cycle
chooseCycles(
  n("0 2 4 5 4 2 0 -2"),      // Lick 1
  n("4 5 6 7 6 4 2 0"),        // Lick 2
  n("0 -1 0 2 4 2 0 -3"),      // Lick 3
  n("7 6 4 2 4 6 7 9")         // Lick 4
).scale("C4:bebop major")
 .note().s("piano")
 .degradeBy(0.1)
```

---

## Section 8: Accumulation & Layering

### superimpose — Add transformed copy

```strudel
// Add harmony
note("c4 d4 e4 g4")
  .superimpose(x => x.add(7))  // add fifth above
  .s("piano")

// Add octave with delay
note("c4 e4 g4 b4")
  .superimpose(x => x.add(12).late(0.1))
  .s("piano")
```

### layer — Multiple transformations

```strudel
note("c4 e4 g4 b4").layer(
  x => x.s("piano"),
  x => x.add(12).s("piano").gain(0.5),
  x => x.add(-12).s("bass").gain(0.7)
)
```

### off — Delayed copy with transformation

```strudel
// Canon effect
note("c4 d4 e4 f4 g4 a4 b4 c5")
  .off(1/8, x => x.add(7))
  .s("piano")

// Multiple delays
note("c4 e4 g4 b4")
  .off(1/8, x => x.add(4))
  .off(1/4, x => x.add(7))
  .s("piano")
```

### echo — Rhythmic delay

```strudel
note("c4 e4 g4").echo(3, 1/8, 0.6).s("piano")
```

### echoWith — Transforming echo

```strudel
note("c4 e4 g4")
  .echoWith(4, 1/8, (p, n) => p.add(n * 2))  // rising echo
  .s("piano")
```

---

## Section 9: Jazz Chord Progressions

### ii-V-I (The Foundation)

```strudel
// Key of C
"<Dm7 G7 C^7 C^7>".voicing().dict('lefthand').note().s("piano")

// Key of F
"<Gm7 C7 F^7 F^7>".voicing().dict('lefthand').note().s("piano")

// Minor ii-V-i
"<Dm7b5 G7b9 Cm7 Cm7>".voicing().dict('lefthand').note().s("piano")
```

### Rhythm Changes (A Section)

```strudel
"<Bb^7 G7 Cm7 F7 Dm7 G7 Cm7 F7>".voicing().dict('ireal')
  .struct("[~ x]*2").note().s("piano")
```

### Blues Changes

```strudel
// 12-bar blues in F
"<F7 F7 F7 F7 Bb7 Bb7 F7 F7 C7 Bb7 F7 C7>"
  .slow(3)  // 4 bars per cycle × 3 = 12 bars
  .voicing().dict('lefthand').note().s("piano")
```

### Giant Steps Changes

```strudel
"<B^7 D7 G^7 Bb7 Eb^7 Eb^7 Am7 D7 G^7 Bb7 Eb^7 Fs7 B^7 B^7 Fm7 Bb7>"
  .slow(4)
  .voicing().dict('ireal').note().s("piano")
```

### Autumn Leaves

```strudel
"<Am7 D7 G^7 C^7 Fs7b5 B7b9 Em7 Em7>".slow(2)
  .voicing().dict('lefthand').note().s("piano")
```

### So What / Modal

```strudel
"<Dm7!8 Ebm7!8 Dm7!8>".slow(6)
  .voicing().dict('lefthand')
  .struct("[~ x] x [~ x] [x ~]")
  .note().s("piano")
```

---

## Section 10: Full Jazz Combo Templates

### Basic Trio

```strudel
stack(
  // DRUMS
  stack(
    s("[ride ~ ride] [~ ride ride]").fast(2).gain(rand.range(0.5, 0.7)),
    s("~ hh:1 ~ hh:1").gain(0.4),
    s("bd?0.4 ~ ~ bd?0.3").gain(0.6),
    s("~ ~ sd:1? ~").gain(0.5)
  ),
  
  // BASS
  n("<0 2 4 3> <2 4 6 5> <4 2 0 -1> <0 2 4 3>")
    .scale("<Dm7 G7 C^7 C^7>/4:2")
    .note().s("bass").lpf(800).gain(0.75),
  
  // PIANO
  "<Dm7 G7 C^7 C^7>".voicing().dict('lefthand')
    .struct("[~ x]*2")
    .add(perlin.range(-0.03, 0.03))
    .note().s("piano").gain(rand.range(0.5, 0.7)).room(0.15)
    
).cpm(140)
```

### Quartet with Melody

```strudel
stack(
  // DRUMS
  stack(
    s("[ride ~ ride] [~ ride ride]").fast(2).gain("[0.6 0.4 0.5]*4"),
    s("~ hh:1 ~ hh:1").gain(0.35),
    s("bd?0.3 ~ bd?0.2 ~").gain(0.6)
  ),
  
  // BASS
  n("<0 2 4 2> <4 2 0 4> <0 2 4 6> <4 2 0 -2>")
    .scale("<Dm7 G7 C^7 A7>/4:2")
    .note().s("bass").lpf(850).gain(0.7),
  
  // PIANO (comping)
  "<Dm7 G7 C^7 A7>".voicing().dict('lefthand')
    .struct("~ x [~ x] ~")
    .note().s("piano").gain(0.55).room(0.15),
  
  // MELODY/SOLO
  n(irand(8).segment(8))
    .scale("<D:dorian G:mixolydian C:major A:mixolydian>/4:4")
    .degradeBy(0.25)
    .sometimesBy(0.2, x => x.add(7))
    .note().s("sawtooth").lpf(3000).gain(0.45)
    .attack(0.02).decay(0.3).sustain(0.3)
    .room(0.2).delay(0.15).delayfb(0.3)
    
).cpm(130)
```

### Ballad

```strudel
stack(
  // BRUSHES
  s("[brush brush brush] [brush brush brush]").fast(2)
    .gain(rand.range(0.3, 0.5)).lpf(2500),
  
  // BASS (half notes)
  note("<c2 ~ g2 ~> <a2 ~ e2 ~>").s("bass").lpf(600).gain(0.6),
  
  // PIANO (sparse)
  "<C^7 Am7 Dm7 G7>".voicing().dict('lefthand')
    .struct("x ~ ~ [~ x]")
    .note().s("piano").gain(0.5).room(0.3),
  
  // MELODY (rubato feel via random timing)
  note("<e4 ~ g4 ~> <a4 ~ g4 e4>")
    .add(perlin.range(-0.05, 0.05))
    .s("sine").gain(0.4)
    .attack(0.1).decay(0.5).sustain(0.4).release(0.8)
    .room(0.4).delay(0.2).delayfb(0.4)
    
).cpm(60)
```

### Bebop (Fast)

```strudel
stack(
  // DRUMS (driving)
  stack(
    s("[ride ~ ride] [~ ride ride]").fast(2).gain(0.6),
    s("~ hh:1 ~ hh:1").gain(0.45),
    s("bd ~ ~ bd?0.5").gain(0.7),
    s("~ ~ sd:1 ~").sometimesBy(0.3, x => x.gain(0.9)).gain(0.5)
  ),
  
  // BASS (walking)
  n("<0 1 2 3> <4 3 2 1> <0 2 4 5> <6 4 2 0>")
    .scale("<Dm7 G7 C^7 A7>/4:2")
    .note().s("bass").lpf(900).gain(0.75),
  
  // PIANO (sparse comps)
  "<Dm7 G7 C^7 A7>".voicing().dict('lefthand')
    .struct("[~ x] ~ [~ x] ~")
    .note().s("piano").gain(0.5),
  
  // BEBOP LINE
  n("0 1 2 3 4 5 6 7 6 5 4 3 2 1 0 -1")
    .scale("<D:bebop:dorian G:bebop:dominant C:bebop:major A:mixolydian>/4:4")
    .fast(2)
    .degradeBy(0.15)
    .note().s("sawtooth").lpf(3500).gain(0.4)
    .decay(0.1).sustain(0)
    
).cpm(200)
```

### Modal Jazz

```strudel
stack(
  // DRUMS (sparse, open)
  stack(
    s("ride*4").gain(rand.range(0.4, 0.6)),
    s("~ hh:1 ~ hh:1").gain(0.3),
    s("bd? ~ ~ bd?").gain(0.5)
  ),
  
  // BASS (pedal tone + movement)
  note("<d2!3 [d2 e2]> <d2!3 [d2 c2]>").s("bass").lpf(700).gain(0.7),
  
  // PIANO (modal voicings, sus chords)
  "<Dm7 Dm7 Em7/D Dm7>".voicing()
    .struct("x ~ [~ x] ~")
    .note().s("piano").gain(0.5).room(0.25),
  
  // SOLO (D dorian)
  n(irand(8).segment(8))
    .scale("D4:dorian")
    .degradeBy(0.3)
    .off(1/8, x => x.add(choose(0, 2, 4, 7)))
    .note().s("sine")
    .gain(rand.range(0.4, 0.7))
    .room(0.35).delay(0.25).delayfb(0.4)
    
).cpm(120)
```

---

## Parameter Reference

### Randomness

| Function | Description | Example |
|----------|-------------|---------|
| `choose(a,b,c)` | Random element each event | `choose("c4","e4","g4")` |
| `wchoose([a,w],[b,w])` | Weighted random | `wchoose(["c4",5],["e4",2])` |
| `chooseCycles(a,b,c)` | Random element per cycle | `chooseCycles("c4","e4")` |
| `rand` | Continuous random 0-1 | `.gain(rand.range(0.5,0.9))` |
| `perlin` | Smooth random (Perlin) | `.add(perlin.range(-0.1,0.1))` |
| `irand(n)` | Random integer 0 to n-1 | `n(irand(8))` |
| `degradeBy(p)` | Remove p% of events | `.degradeBy(0.3)` |
| `?` / `?p` | Mini-notation degrade | `"c4 e4? g4?0.3"` |
| `sometimesBy(p,fn)` | Apply fn with p probability | `.sometimesBy(0.4, x=>x.add(7))` |
| `sometimes(fn)` | 50% apply fn | `.sometimes(x=>x.add(12))` |
| `often(fn)` | 75% apply fn | `.often(x=>x.gain(0.8))` |
| `rarely(fn)` | 25% apply fn | `.rarely(x=>x.add(-12))` |

### Voicing

| Function | Description | Example |
|----------|-------------|---------|
| `.voicing()` | Convert chord to notes | `"C^7".voicing()` |
| `.dict(name)` | Voicing dictionary | `.dict('lefthand')` |
| `.anchor(note)` | Align voicing | `.anchor("G4")` |
| `.mode(m)` | Alignment mode | `.mode("below")` |
| `.offset(n)` | Shift voicing | `.offset(1)` |
| `.rootNotes(oct)` | Get root notes | `.rootNotes(2)` |

### Accumulation

| Function | Description | Example |
|----------|-------------|---------|
| `.superimpose(fn)` | Add transformed copy | `.superimpose(x=>x.add(7))` |
| `.layer(fn1,fn2)` | Multiple transforms | `.layer(x=>x.s("a"),x=>x.s("b"))` |
| `.off(t,fn)` | Delayed transform | `.off(1/8, x=>x.add(7))` |
| `.echo(n,t,fb)` | Rhythmic delay | `.echo(3, 1/8, 0.6)` |
| `.echoWith(n,t,fn)` | Transforming echo | `.echoWith(4,1/8,(p,i)=>p.add(i*2))` |

---

## Tips for AI Generation

1. **Use `degradeBy(0.2-0.4)`** for jazz phrasing — not every beat needs a note
2. **`perlin` for humanization** — add slight pitch/timing drift
3. **`rand` for velocity** — jazz has dynamic variation
4. **`chooseCycles` for lick variation** — different phrase each cycle
5. **`sometimes/rarely/often`** for spontaneous variation
6. **Use `voicing().dict('lefthand')`** for rootless jazz voicings
7. **Walking bass = scale degrees 0-7** with occasional chromatic (-1, +1)
8. **Swing = triplet subdivisions** `[a ~ b]` or `[a b c]`
9. **Comping = sparse rhythms** with `struct("[~ x]*2")` or similar
10. **Layer chords + bass** using `.layer()` for full arrangements
11. **Use jazz scales**: dorian, mixolydian, bebop, altered
12. **ii-V-I is fundamental** — Dm7 G7 C^7 in key of C
13. **`off(1/8, x=>x.add(7))`** creates instant harmonization
14. **Keep tempo jazzy**: ballad 60-80, medium 100-140, bebop 180-280
