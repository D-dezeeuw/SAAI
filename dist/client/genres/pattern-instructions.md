# Famous Drum Patterns Reference

A collection of 10 iconic drum patterns visualized in ASCII and Strudel notation.

```
Legend: x = hit | o = open hi-hat | - = rest
Steps:  1 . . . 2 . . . 3 . . . 4 . . . | 1 . . . 2 . . . 3 . . . 4 . . .
        ←─────────── Bar 1 ───────────→   ←─────────── Bar 2 ───────────→
```

---

## 1. Basic Rock Backbeat

**Genre:** Rock  
**Tempo:** 120 BPM  
**Time Signature:** 4/4  
**Drum Kit:** Alesis HR-16 / Acoustic Kit  
**Description:** The foundation of western popular music since the 50s. Simple, driving, effective. Kick on 1 and 3, snare on 2 and 4.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
SN: - - - - x - - - - - - - x - - - | - - - - x - - - - - - - x - - - -
BD: x - - - - - - - x - - - - - - - | x - - - - - - - x - - - - - - - -
```

```javascript
// Strudel - Basic Rock Backbeat (120 BPM, 4/4)
setcps(120/60/8)

stack(
  sound("hh*16"),
  sound("~ sd ~ sd ~ sd ~ sd"),
  sound("bd ~ bd ~ bd ~ bd ~")
).bank("AkaiLinn")
```

---

## 2. Four on the Floor

**Genre:** Disco / House  
**Tempo:** 124 BPM  
**Time Signature:** 4/4  
**Drum Kit:** TR-909  
**Description:** Kick on every quarter note, open hats on the off-beats. The heartbeat of dance music since the 70s.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
HO: - - - o - - - o - - - o - - - o | - - - o - - - o - - - o - - - o -
SN: - - - - x - - - - - - - x - - - | - - - - x - - - - - - - x - - - -
BD: x - - - x - - - x - - - x - - - | x - - - x - - - x - - - x - - - -
```

```javascript
// Strudel - Four on the Floor (124 BPM, 4/4)
setcps(124/60/8)

stack(
  sound("[hh ~ hh oh]*4"),
  sound("~ cp ~ cp ~ cp ~ cp"),
  sound("bd bd bd bd bd bd bd bd")
).bank("RolandTR909")
```

---

## 3. Amen Break

**Genre:** Breakbeat / Jungle / DnB  
**Tempo:** 136 BPM (original) / 160-180 BPM (jungle/dnb)  
**Time Signature:** 4/4  
**Drum Kit:** Acoustic Kit / Alesis HR-16  
**Description:** The most sampled drum break in history. From "Amen, Brother" by The Winstons (1969). Spawned entire genres.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
SN: - - - - x - - - - - x - - - x - | - - - - x - - x - - x - - - - - -
BD: x - - - - - - - x - - - - - - - | x - - - - - x - - - - - x - - - -
```

```javascript
// Strudel - Amen Break (136 BPM, 4/4)
setcps(136/60/8)

stack(
  sound("hh*16"),
  sound("~ sd [~ ~ sd ~] [~ ~ sd ~] ~ [sd ~ ~ sd] [~ ~ sd ~] ~"),
  sound("bd ~ bd ~ bd [~ ~ bd ~] ~ bd")
).bank("AkaiLinn")
```

---

## 4. Boom Bap

**Genre:** Hip-Hop  
**Tempo:** 90 BPM  
**Time Signature:** 4/4  
**Drum Kit:** Akai Linn / E-mu SP-1200  
**Description:** The sound of 90s East Coast hip-hop. Punchy, swinging, head-nodding. DJ Premier, Pete Rock territory.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
SN: - - - - x - - - - - - - x - - - | - - - - x - - - - - - x - - x - -
BD: x - - - - - - x - - x - - - - - | x - - - - - - x - - x - - - - - -
```

```javascript
// Strudel - Boom Bap (90 BPM, 4/4)
setcps(90/60/8)

stack(
  sound("hh*16"),
  sound("~ sd ~ sd ~ sd [~ ~ sd ~] [~ ~ sd ~]"),
  sound("bd [~ ~ ~ bd] [~ ~ bd ~] ~ bd [~ ~ ~ bd] [~ ~ bd ~] ~")
).bank("AkaiLinn")
```

---

## 5. Bossa Nova

**Genre:** Latin / Jazz  
**Tempo:** 140 BPM  
**Time Signature:** 4/4  
**Drum Kit:** Korg M1 / Acoustic Kit  
**Description:** Syncopated Brazilian rhythm. Soft cross-stick snare, gentle kick. João Gilberto's gift to the world.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
RS: - - - x - - x - - - - x - - x - | - - - x - - x - - - - x - - x - -
BD: x - - - - - x - - - x - - - - - | x - - - - - x - - - x - - - - - -
```

```javascript
// Strudel - Bossa Nova (140 BPM, 4/4)
setcps(140/60/8)

stack(
  sound("hh*16"),
  sound("[~ ~ ~ rim] [~ ~ rim ~] [~ ~ ~ rim] [~ ~ rim ~] [~ ~ ~ rim] [~ ~ rim ~] [~ ~ ~ rim] [~ ~ rim ~]"),
  sound("bd [~ ~ bd ~] [~ ~ bd ~] ~ bd [~ ~ bd ~] [~ ~ bd ~] ~")
).bank("KorgM1")
```

---

## 6. Reggae One Drop

**Genre:** Reggae  
**Tempo:** 75 BPM  
**Time Signature:** 4/4  
**Drum Kit:** Korg M1 / Acoustic Kit  
**Description:** Sparse, heavy, meditative. Beat 1 is empty, kick and snare drop together on beat 3. The space is the sound.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
SN: - - - - - - - - x - - - - - - - | - - - - - - - - x - - - - - - - -
BD: - - - - - - - - x - - - - - - - | - - - - - - - - x - - - - - - - -
```

```javascript
// Strudel - Reggae One Drop (75 BPM, 4/4)
setcps(75/60/8)

stack(
  sound("hh*16"),
  sound("~ ~ sd ~ ~ ~ sd ~"),
  sound("~ ~ bd ~ ~ ~ bd ~")
).bank("KorgM1")
```

---

## 7. Funky Drummer

**Genre:** Funk  
**Tempo:** 100 BPM  
**Time Signature:** 4/4  
**Drum Kit:** Acoustic Kit / Alesis HR-16  
**Description:** Clyde Stubblefield's legendary groove for James Brown (1970). Second most sampled beat after Amen. Ghost notes are key.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
SN: - - - - x - - x - - - x x - - - | - - - - x - - x - - - x x - - - -
BD: x - - x - - x - - - x - - - x - | x - - x - - x - - - x - - - x - -
```

```javascript
// Strudel - Funky Drummer (100 BPM, 4/4)
setcps(100/60/8)

stack(
  sound("hh*16"),
  sound("~ sd [~ ~ ~ sd] [~ ~ sd ~ sd ~] ~ sd [~ ~ ~ sd] [~ ~ sd ~ sd ~]"),
  sound("[bd ~ ~ bd] [~ ~ bd ~] [~ ~ bd ~] [~ ~ bd ~] [bd ~ ~ bd] [~ ~ bd ~] [~ ~ bd ~] [~ ~ bd ~]")
).bank("AkaiLinn")
```

---

## 8. Purdie Shuffle

**Genre:** Blues / Soul / R&B  
**Tempo:** 95 BPM  
**Time Signature:** 4/4 (triplet feel / 12/8 implied)  
**Drum Kit:** Korg M1 / Acoustic Kit  
**Description:** Bernard Purdie's ghost-note masterpiece. Used on Steely Dan's "Home at Last" and "Babylon Sisters". True triplet feel.

```
HH: x - x x - x x - x - x x - x x - | x - x x - x x - x - x x - x x - x
SN: - - - - x - - - - - - - x - - - | - - - - x - - - - - - - x - - - -
GH: - - x - - - x - - - x - - - x - | - - x - - - x - - - x - - - x - -
BD: x - - - - - x - x - - - - - x - | x - - - - - x - x - - - - - x - -
```

```javascript
// Strudel - Purdie Shuffle (95 BPM, 4/4 triplet feel)
// Using 12/8 subdivision (triplets)
setcps(95/60/8)

stack(
  sound("[hh ~ hh] [hh ~ hh] [hh ~ hh] [hh ~ hh] [hh ~ hh] [hh ~ hh] [hh ~ hh] [hh ~ hh]"),
  sound("~ sd ~ sd ~ sd ~ sd").gain(1),
  sound("[~ ~ sd:1] [~ ~ sd:1] [~ ~ sd:1] [~ ~ sd:1] [~ ~ sd:1] [~ ~ sd:1] [~ ~ sd:1] [~ ~ sd:1]").gain(0.3),
  sound("bd [~ ~ bd] bd [~ ~ bd] bd [~ ~ bd] bd [~ ~ bd]")
).bank("KorgM1")
```

---

## 9. Drum & Bass

**Genre:** DnB / Jungle  
**Tempo:** 174 BPM  
**Time Signature:** 4/4 (half-time feel)  
**Drum Kit:** Alesis HR-16 / Processed Acoustic Breaks  
**Description:** Fast breakbeat (170+ BPM) with syncopated snare placement. Half-time feel despite the tempo. Amen on steroids.

```
HH: x - x - x - x - x - x - x - x - | x - x - x - x - x - x - x - x - x -
SN: - - - - x - - - - - x - - x - - | - - - - x - - - - - x - - - x - -
BD: x - - x - - - - x x - - - - - - | x - - x - - - - x x - - - - - - -
```

```javascript
// Strudel - Drum & Bass (174 BPM, 4/4)
setcps(174/60/8)

stack(
  sound("hh*16"),
  sound("~ sd [~ ~ sd ~] [~ sd ~] ~ sd [~ ~ sd ~] [~ ~ sd ~]"),
  sound("[bd ~ ~ bd] ~ [bd bd] ~ [bd ~ ~ bd] ~ [bd bd] ~")
).bank("RolandTR909")
```

---

## 10. Trap

**Genre:** Trap / Hip-Hop  
**Tempo:** 140 BPM  
**Time Signature:** 4/4 (half-time feel)  
**Drum Kit:** TR-808  
**Description:** Sparse 808 kicks, snappy snares, and signature rolling hi-hats. Atlanta's sonic export to the world. Hi-hats often 32nd-note rolls.

```
HH: x x x x x x x x x x x x x x x x | x x x x x x x x x x x x x x x x x
SN: - - - - - - - - x - - - - - - - | - - - - - - - - x - - - - - x - -
BD: x - - - - - - - - - - - x - - - | x - - - - - - - - - - x - - - - -
```

```javascript
// Strudel - Trap (140 BPM, 4/4 half-time)
setcps(140/60/8)

stack(
  sound("hh*32"),
  sound("~ ~ sd ~ ~ ~ sd [~ ~ sd ~]"),
  sound("bd ~ ~ [~ ~ ~ bd] bd ~ [~ ~ bd ~] ~")
).bank("RolandTR808")
```

---

## Quick Reference

### setcps Formula

```javascript
setcps(BPM / 60 / beatsPerCycle)
```

| Pattern Length | Beats | Formula Example (120 BPM) |
|----------------|-------|---------------------------|
| 1 bar (4/4)    | 4     | `setcps(120/60/4)`        |
| 2 bars (4/4)   | 8     | `setcps(120/60/8)`        |
| 4 bars (4/4)   | 16    | `setcps(120/60/16)`       |

### Available Strudel Banks

| Bank Name | Drum Machine |
|-----------|--------------|
| `RolandTR808` | Roland TR-808 |
| `RolandTR909` | Roland TR-909 |
| `RolandTR707` | Roland TR-707 |
| `LinnDrum` | LinnDrum |
| `AkaiLinn` | Akai Linn |
| `KorgM1` | Korg M1 |
| `RolandCompuRhythm1000` | Roland CR-1000 |

### Drum Kits by Genre

| Kit | Best For |
|-----|----------|
| TR-808 | Trap, Hip-Hop, Electro |
| TR-909 | House, Techno, DnB |
| TR-707 | Disco, Synthpop, Italo |
| LinnDrum | 80s Pop, New Wave |
| Akai Linn | Boom Bap, 90s Hip-Hop, Rock |
| Korg M1 | Ballads, R&B, Pop, Reggae |

### Strudel Sounds

| Sound | Description |
|-------|-------------|
| `bd` | Bass drum / Kick |
| `sd` | Snare drum |
| `hh` | Closed hi-hat |
| `oh` | Open hi-hat |
| `cp` | Clap |
| `rim` | Rimshot / Cross-stick |
| `~` | Rest/silence |

### Strudel Subdivision Syntax

```javascript
// Each bracket divides time equally
"bd sd"           // 2 hits per cycle
"[bd bd] sd"      // 3 hits: 2 kicks in first half, 1 snare in second half
"[~ ~ bd ~]"      // 4 subdivisions, hit on 3rd position (16th note placement)
"bd*4"            // 4 equally spaced kicks

// Apply bank to entire stack
stack(
  sound("hh*8"),
  sound("bd sd")
).bank("RolandTR808")
```

---

**Try it live:** [strudel.cc](https://strudel.cc)
