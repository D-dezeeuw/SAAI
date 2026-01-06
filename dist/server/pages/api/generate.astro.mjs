import { d as buildStage1Prompt, c as chat, e as STAGE1_SYSTEM_PROMPT, f as buildStage2Prompt, g as STAGE2_SYSTEM_PROMPT } from '../../chunks/prompts_jByBznAA.mjs';
export { renderers } from '../../renderers.mjs';

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
  const { message, currentCode, genreContext, bankName } = body;
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
        const stage2Prompt = buildStage2Prompt(enrichedPrompt, currentCode, genreContext, bankName);
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
