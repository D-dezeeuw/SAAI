import type { APIRoute } from 'astro';
import { chat, DEFAULT_MODELS } from '../../lib/openrouter';
import {
  STAGE1_SYSTEM_PROMPT,
  STAGE2_SYSTEM_PROMPT,
  buildStage1Prompt,
  buildStage2Prompt
} from '../../lib/prompts';

export const POST: APIRoute = async ({ request }) => {
  const apiKey = process.env.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY;
  const modelContext = process.env.MODEL_CONTEXT || import.meta.env.MODEL_CONTEXT || DEFAULT_MODELS.CONTEXT;
  const modelCodegen = process.env.MODEL_CODEGEN || import.meta.env.MODEL_CODEGEN || DEFAULT_MODELS.CODEGEN;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: { message: string; currentCode: string; genreContext?: string; bankName?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { message, currentCode, genreContext, bankName } = body;

  if (!message) {
    return new Response(
      JSON.stringify({ error: 'Message is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a streaming response using SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Track token usage across both stages
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;

        // Stage 1: Transform user request into detailed Strudel prompt
        const stage1Prompt = buildStage1Prompt(message, currentCode);
        const stage1Response = await chat(
          modelContext,
          STAGE1_SYSTEM_PROMPT,
          stage1Prompt,
          apiKey
        );

        totalPromptTokens += stage1Response.usage.promptTokens;
        totalCompletionTokens += stage1Response.usage.completionTokens;

        send('stage1', { enrichedPrompt: stage1Response.content });

        // Stage 2: Generate Strudel code from enriched prompt
        const stage2Prompt = buildStage2Prompt(stage1Response.content, currentCode, genreContext, bankName);
        const stage2Response = await chat(
          modelCodegen,
          STAGE2_SYSTEM_PROMPT,
          stage2Prompt,
          apiKey
        );

        totalPromptTokens += stage2Response.usage.promptTokens;
        totalCompletionTokens += stage2Response.usage.completionTokens;

        // Clean up the code (remove markdown code blocks if present)
        const cleanCode = stage2Response.content
          .replace(/^```(?:javascript|js|strudel)?\n?/gm, '')
          .replace(/```$/gm, '')
          .trim();

        send('stage2', { code: cleanCode });
        send('done', {
          usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens
          }
        });

      } catch (error) {
        console.error('Generation error:', error);
        send('error', { error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
};
