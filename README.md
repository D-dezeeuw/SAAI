# SAAI: Strudel Augmented Artificial Intelligence

A generative AI-powered music creation tool built on top of [Strudel](https://strudel.cc/), the live coding environment for music. Describe the music you want in natural language, and let AI generate the code for you.

## Features

- **AI-Powered Music Generation** - Describe music in plain English, get playable Strudel code
- **Multi-Stage AI Pipeline** - Prompt enhancement, code generation, and code alteration stages
- **Live Code Evolution** - Let AI subtly evolve your music over time
- **Multiple Visualizers** - Real-time audio-reactive visualizations
- **Genre Templates** - Pre-configured patterns for EDM, Drum & Bass, Hip-Hop, Acid, Jazz
- **Drum Kit Selection** - Classic drum machines (TR-909, TR-808, LinnDrum, etc.)

## AI Generation Pipeline

SAAI uses a multi-stage AI pipeline for better music generation:

### Stage 1: Prompt Enhancement
Your casual request gets transformed into a detailed, production-focused prompt. A creative chat model expands "funky beat" into specific instructions about swing amounts, drum placement, and groove techniques.

### Stage 2: Code Generation
A coding-focused model generates valid Strudel code based on the enriched prompt. It understands:
- Strudel's mini-notation syntax
- Sample vs synth distinction
- Effect chains and modulation
- Proper pattern layering with `stack()`

### Stage 3: Code Alteration
Make incremental changes to existing code without regenerating everything. Say "add more reverb" or "make it faster" and the AI makes minimal, precise edits.

### Evolution Mode
Click "Evolve" to let AI make subtle, DJ-style tweaks to keep your music fresh. It might add filter sweeps, adjust velocities, or introduce probability-based variations.

## Visualizers

### Audio Visualizers
- **Scope** - Waveform display showing audio amplitude
- **Spectrum** - Scrolling waterfall frequency visualization
- **Piano Roll** - Note visualization from Strudel's draw module

### Background Effects
Music-reactive particle systems rendered with WebGL:

| Effect | Description |
|--------|-------------|
| **Glowing Orbs** | Soft particles drifting upward, pulsing with bass |
| **Stars** | Twinkling star-shaped particles |
| **Flowing Trails** | Dots that leave fading trails as they move |

Background effects react to:
- **Bass** - Particle size and brightness
- **Treble** - Color shift from cyan to pink
- **Beat** - Direction changes (trails mode)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `K` | Play / Stop |
| `H` | Hide / Show UI |
| `V` | Toggle Audio Visualizers |
| `B` | Toggle Background Effects |
| `A` | Toggle Visuals-Only Mode |
| `<` | Previous Background Effect |
| `>` | Next Background Effect |

## Configuration

Visual effects can be customized in `src/lib/configuration.ts`:

```typescript
export const CONFIG = {
  colors: { cyan: {...}, pink: {...} },
  orbs: { baseCount, sizeMin, sizeMax, ... },
  stars: { baseCount, twinkleSpeed, ... },
  trails: { speed, speedVariation, fadeFactor, ... },
  reactivity: { bassSizeMultiplier, trebleColorShift, ... },
};
```

## Prerequisites

### API Keys
Create a `.env` file with your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_key_here
```

Only [OpenRouter](https://openrouter.ai/) is supported, which gives you access to many models and pay-per-token pricing.

### Recommended Models
Configure three models for each task in the UI or code:
- **Prompt Enhancement** - Creative chat model (e.g., Claude, GPT-4)
- **Code Generation** - Coding model (e.g., Claude, Gemini)
- **Code Alteration** - Lightweight model works fine (e.g., Gemini Flash)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/strudel_ai.git
cd strudel_ai

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API key

# Start development server
npm run dev
```

## Usage

1. Open `http://localhost:4321` in your browser
2. Click the **✦** button to open the AI generation panel
3. Select a genre template and drum kit (optional)
4. Describe the music you want
5. Click **Generate** and wait for the AI
6. Press **Play** or hit `K` to hear your creation
7. Use the **Alter** input for changes, or click **Evolve** for AI variations

## Tech Stack

- **[Astro](https://astro.build/)** - Web framework
- **[Strudel](https://strudel.cc/)** - Live coding music environment
- **[CodeMirror](https://codemirror.net/)** - Code editor
- **[OpenRouter](https://openrouter.ai/)** - AI model routing
- **WebGL2** - GPU-accelerated visualizations

## Project Structure

```
src/
├── pages/
│   ├── index.astro      # Main UI
│   └── api/             # AI endpoints (generate, alter, evolve)
├── lib/
│   ├── shader.ts        # WebGL particle system
│   ├── configuration.ts # Visual effect settings
│   ├── prompts.ts       # AI system prompts
│   ├── customScope.ts   # Waveform visualizer
│   └── customSpectrum.ts# Spectrum visualizer
└── layouts/
    └── Layout.astro     # Base layout
```

## License

AGPL - Following Strudel's license. See [Strudel](https://strudel.cc/) for details.

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

## Acknowledgments

- [Strudel](https://strudel.cc/) by Alex McLean and contributors
- [Tidal Cycles](https://tidalcycles.org/) for the live coding paradigm
