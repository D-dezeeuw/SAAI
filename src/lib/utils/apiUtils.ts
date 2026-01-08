/**
 * Shared API utilities for all endpoints
 * Eliminates duplication across generate.ts, alter.ts, and evolve.ts
 */

import { DEFAULT_MODELS } from '../api/openrouter';

/**
 * API configuration resolved from environment variables
 */
export interface ApiConfig {
  apiKey: string;
  modelContext: string;
  modelCodegen: string;
}

/**
 * Get API configuration from environment variables
 * Returns null for apiKey if not configured
 */
export function getApiConfig(): ApiConfig {
  return {
    apiKey: process.env.OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY || '',
    modelContext: process.env.MODEL_CONTEXT || import.meta.env.MODEL_CONTEXT || DEFAULT_MODELS.CONTEXT,
    modelCodegen: process.env.MODEL_CODEGEN || import.meta.env.MODEL_CODEGEN || DEFAULT_MODELS.CODEGEN,
  };
}

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Create an error response
 */
export function errorResponse(message: string, status: number = 500): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Validate that API key is configured
 * Returns an error response if not configured, null otherwise
 */
export function validateApiKey(apiKey: string): Response | null {
  if (!apiKey) {
    return errorResponse('OPENROUTER_API_KEY not configured', 500);
  }
  return null;
}

/**
 * Parse JSON body from request with error handling
 * Returns { body, error } where error is a Response if parsing failed
 */
export async function parseJsonBody<T>(request: Request): Promise<{ body: T | null; error: Response | null }> {
  try {
    const body = await request.json() as T;
    return { body, error: null };
  } catch {
    return { body: null, error: errorResponse('Invalid JSON', 400) };
  }
}

/**
 * Validate that a required field is present
 * Returns an error response if missing, null otherwise
 */
export function validateRequired(value: unknown, fieldName: string): Response | null {
  if (!value) {
    return errorResponse(`${fieldName} is required`, 400);
  }
  return null;
}

/**
 * Clean up AI-generated code by removing markdown code blocks
 */
export function cleanCodeResponse(content: string): string {
  return content
    .replace(/^```(?:javascript|js|strudel)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

/**
 * Format error for response (handles Error objects and unknowns)
 */
export function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
