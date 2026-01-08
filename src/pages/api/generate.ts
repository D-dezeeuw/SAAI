import type { APIRoute } from 'astro';
import { chat } from '../../lib/openrouter';
import {
  STAGE1_SYSTEM_PROMPT,
  STAGE2_SYSTEM_PROMPT,
  buildStage1Prompt,
  buildStage2Prompt
} from '../../lib/prompts';
import {
  getApiConfig,
  validateApiKey,
  parseJsonBody,
  validateRequired,
  cleanCodeResponse,
  formatError
} from '../../lib/apiUtils';

interface GenerateRequestBody {
  message: string;
  currentCode: string;
  genreContext?: string;
  bankName?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const { apiKey, modelContext, modelCodegen } = getApiConfig();

  const apiKeyError = validateApiKey(apiKey);
  if (apiKeyError) return apiKeyError;

  const { body, error: parseError } = await parseJsonBody<GenerateRequestBody>(request);
  if (parseError) return parseError;

  const { message, currentCode, genreContext, bankName } = body!;

  const messageError = validateRequired(message, 'Message');
  if (messageError) return messageError;

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

        const cleanCode = cleanCodeResponse(stage2Response.content);

        send('stage2', { code: cleanCode });
        send('done', {
          usage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens
          }
        });

      } catch (error) {
        console.error('Generation error:', error);
        send('error', { error: formatError(error) });
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
