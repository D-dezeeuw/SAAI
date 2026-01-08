import type { APIRoute } from 'astro';
import { chat } from '../../lib/openrouter';
import { EVOLUTION_PROMPT, buildEvolutionPrompt } from '../../lib/prompts';
import {
  getApiConfig,
  validateApiKey,
  parseJsonBody,
  validateRequired,
  cleanCodeResponse,
  jsonResponse,
  errorResponse,
  formatError
} from '../../lib/apiUtils';

interface EvolveRequestBody {
  currentCode: string;
  enrichedContext?: string;
  genreContext?: string;
  bankName?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const { apiKey, modelCodegen } = getApiConfig();

  const apiKeyError = validateApiKey(apiKey);
  if (apiKeyError) return apiKeyError;

  const { body, error: parseError } = await parseJsonBody<EvolveRequestBody>(request);
  if (parseError) return parseError;

  const { currentCode, enrichedContext, genreContext, bankName } = body!;

  const currentCodeError = validateRequired(currentCode, 'Current code');
  if (currentCodeError) return currentCodeError;

  try {
    const prompt = buildEvolutionPrompt(currentCode, enrichedContext, genreContext, bankName);
    const response = await chat(
      modelCodegen,
      EVOLUTION_PROMPT,
      prompt,
      apiKey
    );

    const cleanCode = cleanCodeResponse(response.content);

    return jsonResponse({
      code: cleanCode,
      usage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens
      }
    });

  } catch (error) {
    console.error('Evolution error:', error);
    return errorResponse(formatError(error), 500);
  }
};
