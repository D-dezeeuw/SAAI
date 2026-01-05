import type { APIRoute } from 'astro';
import { chat, DEFAULT_MODELS } from '../../lib/openrouter';
import { STAGE3_ALTER_PROMPT, buildStage3Prompt } from '../../lib/prompts';

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  const modelCodegen = import.meta.env.MODEL_CODEGEN || DEFAULT_MODELS.CODEGEN;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: {
    alterRequest: string;
    currentCode: string;
    enrichedContext?: string;
    genreContext?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { alterRequest, currentCode, enrichedContext, genreContext } = body;

  if (!alterRequest) {
    return new Response(
      JSON.stringify({ error: 'Alter request is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!currentCode) {
    return new Response(
      JSON.stringify({ error: 'Current code is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const prompt = buildStage3Prompt(alterRequest, currentCode, enrichedContext, genreContext);
    const alteredCode = await chat(
      modelCodegen,
      STAGE3_ALTER_PROMPT,
      prompt,
      apiKey
    );

    // Clean up the code (remove markdown code blocks if present)
    const cleanCode = alteredCode
      .replace(/^```(?:javascript|js|strudel)?\n?/gm, '')
      .replace(/```$/gm, '')
      .trim();

    return new Response(
      JSON.stringify({ code: cleanCode }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Alter error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
