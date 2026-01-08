import { API_TIMEOUT_MS } from '../config/constants';
import type { TokenUsage } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage: TokenUsage;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chat(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<ChatResponse> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Create AbortController for timeout protection
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://strudel-ai.local',
        'X-Title': 'Strudel AI'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    });
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw new Error(`Request timeout: API call exceeded ${API_TIMEOUT_MS / 1000} seconds`);
    }
    console.error('Fetch failed:', fetchError);
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to OpenRouter'}`);
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as OpenRouterResponse;
  return {
    content: data.choices[0]?.message?.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0
    }
  };
}

// Default models (can be overridden via env vars)
export const DEFAULT_MODELS = {
  CONTEXT: 'google/gemini-2.5-flash-preview',
  CODEGEN: 'deepseek/deepseek-chat-v3-0324'
};
