import { a as buildEvolutionPrompt, c as chat, E as EVOLUTION_PROMPT } from '../../chunks/prompts_jByBznAA.mjs';
export { renderers } from '../../renderers.mjs';

const POST = async ({ request }) => {
  const apiKey = "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";
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
  const { currentCode, enrichedContext, genreContext, bankName } = body;
  if (!currentCode) {
    return new Response(
      JSON.stringify({ error: "Current code is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const prompt = buildEvolutionPrompt(currentCode, enrichedContext, genreContext, bankName);
    const evolvedCode = await chat(
      modelCodegen,
      EVOLUTION_PROMPT,
      prompt,
      apiKey
    );
    const cleanCode = evolvedCode.replace(/^```(?:javascript|js|strudel)?\n?/gm, "").replace(/```$/gm, "").trim();
    return new Response(
      JSON.stringify({ code: cleanCode }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Evolution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
