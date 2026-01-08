import type { APIRoute } from 'astro';
import { chat } from '../../lib/openrouter';
import { STAGE3_ALTER_PROMPT, buildStage3Prompt } from '../../lib/prompts';
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

interface AlterRequestBody {
  alterRequest: string;
  currentCode: string;
  enrichedContext?: string;
  genreContext?: string;
  bankName?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const { apiKey, modelCodegen } = getApiConfig();

  const apiKeyError = validateApiKey(apiKey);
  if (apiKeyError) return apiKeyError;

  const { body, error: parseError } = await parseJsonBody<AlterRequestBody>(request);
  if (parseError) return parseError;

  const { alterRequest, currentCode, enrichedContext, genreContext, bankName } = body!;

  const alterRequestError = validateRequired(alterRequest, 'Alter request');
  if (alterRequestError) return alterRequestError;

  const currentCodeError = validateRequired(currentCode, 'Current code');
  if (currentCodeError) return currentCodeError;

  try {
    const prompt = buildStage3Prompt(alterRequest, currentCode, enrichedContext, genreContext, bankName);
    const response = await chat(
      modelCodegen,
      STAGE3_ALTER_PROMPT,
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
    console.error('Alter error:', error);
    return errorResponse(formatError(error), 500);
  }
};
