import { b as buildStage3Prompt, c as chat, S as STAGE3_ALTER_PROMPT } from '../../chunks/prompts_jByBznAA.mjs';
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
  const { alterRequest, currentCode, enrichedContext, genreContext, bankName } = body;
  if (!alterRequest) {
    return new Response(
      JSON.stringify({ error: "Alter request is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!currentCode) {
    return new Response(
      JSON.stringify({ error: "Current code is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const prompt = buildStage3Prompt(alterRequest, currentCode, enrichedContext, genreContext, bankName);
    const alteredCode = await chat(
      modelCodegen,
      STAGE3_ALTER_PROMPT,
      prompt,
      apiKey
    );
    const cleanCode = alteredCode.replace(/^```(?:javascript|js|strudel)?\n?/gm, "").replace(/```$/gm, "").trim();
    return new Response(
      JSON.stringify({ code: cleanCode }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Alter error:", error);
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
