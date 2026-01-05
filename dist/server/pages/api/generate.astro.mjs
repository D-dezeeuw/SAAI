export { renderers } from '../../renderers.mjs';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
async function chat(model, systemPrompt, userPrompt, apiKey) {
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://strudel-ai.local",
      "X-Title": "Strudel AI"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2e3
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }
  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

const STAGE1_SYSTEM_PROMPT = `You are a music producer assistant that transforms casual user requests into detailed Strudel live-coding prompts.

Your job is to take a user's informal music request and expand it into a detailed, technical prompt with proper music production considerations.

## Strudel Context
- s("pattern") for samples, note("c3").s("instrument") for melodic
- Drums: bd, sd, hh, oh, cp, rim, tom, perc, tamb
- Use stack() to layer patterns
- Effects: .gain(), .room(), .delay(), .lpf(), .swing()

## Genre-Specific Production Knowledge
- R&B/Hip-hop: swing feel (0.1-0.2), syncopated bass, ghost snares, velocity-varied hats
- House/Techno: straight 4/4, driving kick, offbeat hats, sparse snare/clap
- Funk: heavy swing, tight bass-kick lock, 16th note hats, ghost notes
- Jazz: heavy swing (0.3+), brush patterns, walking bass lines
- Rock: straight feel, powerful snare on 2&4, crash accents

## Your Task
Transform the request into a detailed prompt that specifies:
1. Step count (usually 8 steps per pattern for consistency)
2. Exact drum placement (e.g., "kick on steps 1 and 5 of 8")
3. Groove requirements (swing amount, velocity variation)
4. Rhythmic movement for melodic elements (not static pads unless ambient)
5. Bass pattern that locks with kick but adds syncopation
6. Effects with approximate values

CRITICAL: Specify that ALL patterns must use the same step count to stay in sync.

Be specific and production-focused. Output only the enriched prompt.`;
const STAGE2_SYSTEM_PROMPT = `You are an expert Strudel live-coding assistant and music producer.

## CRITICAL: Pattern Structure
ALL patterns MUST be wrapped with s() or sound() for samples:
- CORRECT: s("bd sd hh")
- WRONG: "bd sd hh" (raw strings won't play!)

## Core Functions
- s("bd:0") - play sample with variant number (bd:0, bd:1, bd:2, etc.)
- note("c3 e3").s("piano") - play notes with an instrument

## Sample Variants
Use colon syntax for sample variants: s("bd:4") NOT s("bd").sound("bd:4")
- CORRECT: s("bd:4 ~ sd:2 ~")
- WRONG: s("bd").sound("bd:4") - redundant!

## Available Samples (from dirt-samples)
Drums: bd, sd, hh, oh, cp, clap, rim, tom, lt, mt, ht, perc, tamb

## Mini-Notation (inside the quotes)
- Space: sequence events - s("bd sd bd sd")
- [x y]: subdivide time - s("[bd sd] hh")
- x*n: repeat n times - s("hh*8")
- x/n: slow down - s("bd/2")
- <x y>: alternate each cycle - s("<bd cp> sd")
- ~: rest/silence - s("bd ~ sd ~")

## CRITICAL: Consistent Step Counts
ALL patterns in a stack MUST have the same number of steps to stay in sync:
- WRONG: mixing 6-step ("bd ~ bd ~ bd ~") with 8-step patterns
- CORRECT: all patterns use 8 steps ("bd ~ bd ~ bd ~ ~ ~")

## Effects
.gain(0.8) - volume (0-1)
.room(0.5) - reverb size
.delay(0.25) - delay amount
.delayfb(0.3) - delay feedback
.lpf(800) - low-pass filter (hz)
.hpf(200) - high-pass filter (hz)
.speed(1.5) - playback speed
.swing(0.2) - swing feel (0-0.5)

## Modulation / LFOs (for dynamic parameter changes)
Use oscillator signals with .range() and .slow():
- sine.range(200, 2000).slow(4) - sine wave from 200 to 2000 over 4 cycles
- saw.range(0.2, 0.8).slow(8) - ramp from 0.2 to 0.8 over 8 cycles
- tri.range(500, 5000).slow(2) - triangle wave modulation

Example: .lpf(sine.range(500, 3000).slow(4)) - filter sweep

DO NOT USE: line(), ramp(), env(), or other non-existent functions

## Groove & Feel
For genres needing swing/groove (R&B, hip-hop, funk, jazz):
- Add .swing(0.1) to .swing(0.3) for shuffle feel
- Vary .gain() on hi-hats for velocity: s("hh*8").gain("0.6 0.4 0.7 0.4 0.6 0.4 0.7 0.4")
- Add ghost notes on snare with low gain

## Rhythmic Instruments
- Keys/chords should have rhythmic movement, not just sustained pads
- Bass should lock with kick but add syncopation
- Use subdivisions [x x] for 16th note patterns

## Multiple Layers - Use stack()
stack(
  s("bd:4 ~ ~ ~ bd:4 ~ ~ ~"),
  s("~ ~ sd:2 ~ ~ ~ sd:2 ~").gain(0.8),
  s("hh*8").gain("0.5 0.3 0.6 0.3 0.5 0.3 0.6 0.3"),
  s("~ ~ ~ ~ ~ ~ ~ oh").gain(0.5)
).swing(0.15)

## Important Rules
- ALWAYS wrap sample patterns with s() or sound()
- NEVER output raw strings - always use s("...")
- ALL patterns in stack() must have same step count (usually 8)
- Use sample:variant syntax (bd:4) not .sound() chain
- Use stack() to layer patterns, NOT $: syntax
- Do NOT call .play() - system handles it
- ONLY use functions that exist: sine, saw, tri, rand for modulation
- NEVER use non-existent functions like line(), ramp(), env(), envelope()
- Output ONLY valid Strudel code, no markdown or explanations`;
function buildStage1Prompt(userMessage, currentCode) {
  return `Current code:
\`\`\`
${currentCode || "// No existing code"}
\`\`\`

User request: "${userMessage}"

Transform this into a detailed Strudel prompt.`;
}
function buildStage2Prompt(enrichedPrompt, currentCode) {
  return `${currentCode ? `Current code to modify or build upon:
\`\`\`
${currentCode}
\`\`\`

` : ""}Task: ${enrichedPrompt}

Generate valid Strudel code. Output ONLY the code, no explanations or markdown.`;
}

const POST = async ({ request }) => {
  const apiKey = "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";
  const modelContext = "google/gemini-3-flash-preview";
  const modelCodegen = "google/gemini-3-flash-preview";
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const { message, currentCode } = body;
  if (!message) {
    return new Response(
      JSON.stringify({ error: "Message is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}
data: ${JSON.stringify(data)}

`));
      };
      try {
        const stage1Prompt = buildStage1Prompt(message, currentCode);
        const enrichedPrompt = await chat(
          modelContext,
          STAGE1_SYSTEM_PROMPT,
          stage1Prompt,
          apiKey
        );
        send("stage1", { enrichedPrompt });
        const stage2Prompt = buildStage2Prompt(enrichedPrompt, currentCode);
        const generatedCode = await chat(
          modelCodegen,
          STAGE2_SYSTEM_PROMPT,
          stage2Prompt,
          apiKey
        );
        const cleanCode = generatedCode.replace(/^```(?:javascript|js|strudel)?\n?/gm, "").replace(/```$/gm, "").trim();
        send("stage2", { code: cleanCode });
        send("done", {});
      } catch (error) {
        console.error("Generation error:", error);
        send("error", { error: error instanceof Error ? error.message : "Unknown error" });
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
