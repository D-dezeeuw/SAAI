# SAAI: Strudel Augmented Artificial Intelligence

A generative AI-powered music creation tool built on top of [Strudel](https://strudel.cc/), the live coding environment for music. Describe the music you want in natural language, and let AI generate the code for you.

## Features

- **AI-Powered Music Generation** - Describe music in plain English, get playable Strudel code
- **Multi-Stage AI Pipeline** - Prompt enhancement, code generation, and code alteration stages
- **Live Code Evolution** - Let AI subtly evolve your music over time
- **Token Usage Tracking** - Monitor API usage with real-time cost estimates
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

## Token Usage Tracking

The info panel displays real-time API usage statistics:

- **Input Tokens** - Tokens sent to the AI (prompts, context, code)
- **Output Tokens** - Tokens received from the AI (generated code)
- **Estimated Cost** - Calculated based on OpenRouter pricing:
  - Input: $0.50 per million tokens
  - Output: $3.00 per million tokens

Token counts accumulate across all AI operations (generate, alter, evolve) during your session. Click the reset button (↺) to clear the counters.

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
| `I` | Toggle Info Panel (token usage, shortcuts) |
| `V` | Toggle Audio Visualizers |
| `B` | Toggle Background Effects |
| `A` | Toggle Visuals-Only Mode |
| `<` | Previous Background Effect |
| `>` | Next Background Effect |

## Mobile Support

SAAI is fully responsive and works on mobile devices:

- **Responsive layout** - UI adapts to smaller screens
- **Optimized performance** - Background effects and scope/spectrum visualizers are disabled on mobile to save battery and CPU
- **Touch-friendly** - Larger buttons and stacked layouts for easier interaction
- **Piano roll only** - On mobile, only the lightweight piano roll visualizer runs

## Browser Requirements

SAAI requires a modern browser with:

- **WebGL2 support** - Required for background particle effects
- **Web Audio API** - Required for audio playback and visualization
- **ES2020+ JavaScript** - Modern JavaScript features

**Recommended browsers:** Chrome, Firefox, Safari, Edge (latest versions)

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

### Models

Currently SAAI uses **Google Gemini 2.5 Flash Preview** for all AI tasks (prompt enhancement, code generation, and alteration). This model provides a good balance of speed, quality, and cost.

You can override the default models via environment variables:
- `MODEL_CONTEXT` - Model for prompt enhancement
- `MODEL_CODEGEN` - Model for code generation and alteration

Models are accessed through [OpenRouter](https://openrouter.ai/), which supports many providers.

## Installation

```bash
# Clone the repository
git clone https://github.com/D-dezeeuw/SAAI.git
cd SAAI

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

## Production Deployment

### Using Docker (Recommended)

The project includes Docker support for easy production deployment.

**Files:**
- `Dockerfile` - Multi-stage build for optimized production image
- `.dockerignore` - Excludes unnecessary files from the build
- `build.sh` - Helper script to build and run the container

**Quick Start:**

```bash
# Make sure .env file exists with your API key
echo "OPENROUTER_API_KEY=your_key_here" > .env

# Build and run
./build.sh
```

**Manual Docker Commands:**

```bash
# Build the image
docker build -t strudel-ai .

# Run the container
docker run -p 4321:4321 --env-file .env strudel-ai
```

### Using Portainer

1. Build and push the image to your registry, or build directly on the server
2. Create a new container in Portainer
3. Set the image to `strudel-ai`
4. Map port `4321:4321`
5. Add environment variables:
   - `OPENROUTER_API_KEY` (required)
   - `MODEL_CONTEXT` (optional)
   - `MODEL_CODEGEN` (optional)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key |
| `MODEL_CONTEXT` | No | Model for prompt enhancement |
| `MODEL_CODEGEN` | No | Model for code generation |

### Without Docker

```bash
# Build the project
npm run build

# Run the production server
node dist/server/entry.mjs

# Or with a process manager
pm2 start dist/server/entry.mjs --name strudel-ai
```

## Tech Stack

- **[Astro](https://astro.build/)** - Web framework (SSR with Node adapter)
- **[Strudel](https://strudel.cc/)** - Live coding music environment
- **[CodeMirror](https://codemirror.net/)** - Code editor
- **[OpenRouter](https://openrouter.ai/)** - AI model routing
- **WebGL2** - GPU-accelerated visualizations
- **Docker** - Container deployment

## Project Structure

```
src/
├── pages/
│   ├── index.astro       # Main UI
│   └── api/              # AI endpoints (generate, alter, evolve)
├── lib/
│   ├── openrouter.ts     # OpenRouter API client
│   ├── prompts.ts        # AI system prompts
│   ├── editor.ts         # CodeMirror editor setup
│   ├── shader.ts         # WebGL particle system
│   ├── configuration.ts  # Visual effect settings
│   ├── appConfig.ts      # Application defaults
│   ├── customScope.ts    # Waveform visualizer
│   └── customSpectrum.ts # Spectrum visualizer
└── layouts/
    └── Layout.astro      # Base layout
```

## Upcoming Features

- **Full-Length Song Generation** - AI-assisted composition of complete songs with intro, verse, chorus, and outro sections
- **Improved Code Generation** - Better structured Strudel code output with proper formatting and organization
- **Interactive Elements** - AI-generated sliders and controls for real-time parameter tweaking
- **Enhanced Genre Knowledge** - Deeper contextual understanding of genres, subgenres, and their characteristic patterns
- **Extended Visualizations** - More visualization options and [Hydra](https://hydra.ojack.xyz/) integration for live visuals
- **Expanded Sample Library** - Additional support for samples, drum kits, and sound banks
- **Pattern Templates** - Reusable snippets for specific drum patterns, synth presets, and common arrangements
- **Shareable Creations** - Share your Strudel patterns via URL with code compressed into a hash
- **Browser-Based API Keys** - Add your own OpenRouter API key directly in the browser
- **Codebase Restructure** - Cleanup and reorganization for better maintainability and modularity
- **Improved Auto mode** - Working towards a live music production set, with build up, bass drops etc
- **Improve robustness** - More strudel validations across the app, to maintain stability.

## License

AGPL - Following Strudel's license. See [Strudel](https://strudel.cc/) for details.

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

## Acknowledgments

- [Strudel](https://strudel.cc/) by Alex McLean and contributors
- [Tidal Cycles](https://tidalcycles.org/) for the live coding paradigm
