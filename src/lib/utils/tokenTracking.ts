/**
 * Token usage tracking and cost calculation
 * Tracks API token usage and estimates costs
 */

import type { TokenUsage, TokenTotals } from '../types';
import { INPUT_COST_PER_M, OUTPUT_COST_PER_M } from '../config/constants';

// =============================================================================
// State
// =============================================================================

/** Token totals state */
let tokenTotals: TokenTotals = {
  totalInputTokens: 0,
  totalOutputTokens: 0
};

// =============================================================================
// Functions
// =============================================================================

/**
 * Get current token totals
 * @returns Copy of current token totals
 */
export function getTokenTotals(): TokenTotals {
  return { ...tokenTotals };
}

/**
 * Add tokens to the running totals
 * @param usage - Token usage from API call
 */
export function addTokens(usage: TokenUsage): void {
  tokenTotals.totalInputTokens += usage.promptTokens;
  tokenTotals.totalOutputTokens += usage.completionTokens;
}

/**
 * Reset token totals to zero
 */
export function resetTokenTotals(): void {
  tokenTotals = { totalInputTokens: 0, totalOutputTokens: 0 };
}

/**
 * Calculate estimated cost from current totals
 * @returns Estimated cost in dollars
 */
export function calculateCost(): number {
  const inputCost = (tokenTotals.totalInputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (tokenTotals.totalOutputTokens / 1_000_000) * OUTPUT_COST_PER_M;
  return inputCost + outputCost;
}

/**
 * Calculate cost from specific token counts
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in dollars
 */
export function calculateCostFromTokens(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;
  return inputCost + outputCost;
}

/**
 * Format token count for display
 * @param count - Token count
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(2) + 'M';
  if (count >= 1_000) return (count / 1_000).toFixed(1) + 'K';
  return count.toString();
}

/**
 * Format cost for display
 * @param cost - Cost in dollars
 * @returns Formatted string (e.g., "$0.0123")
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

// =============================================================================
// DOM Update Helpers
// =============================================================================

/**
 * Update the token display in the UI
 * @param inputDisplayId - ID of input tokens display element
 * @param outputDisplayId - ID of output tokens display element
 * @param costDisplayId - ID of cost display element
 */
export function updateTokenDisplay(
  inputDisplayId: string = 'token-input-display',
  outputDisplayId: string = 'token-output-display',
  costDisplayId: string = 'token-cost-display'
): void {
  const inputDisplay = document.getElementById(inputDisplayId);
  const outputDisplay = document.getElementById(outputDisplayId);
  const costDisplay = document.getElementById(costDisplayId);

  if (inputDisplay) {
    inputDisplay.textContent = formatTokenCount(tokenTotals.totalInputTokens);
  }
  if (outputDisplay) {
    outputDisplay.textContent = formatTokenCount(tokenTotals.totalOutputTokens);
  }
  if (costDisplay) {
    costDisplay.textContent = formatCost(calculateCost());
  }
}

/**
 * Add tokens and update display
 * @param usage - Token usage from API call
 */
export function trackTokens(usage: TokenUsage): void {
  addTokens(usage);
  updateTokenDisplay();
}

/**
 * Reset tokens and update display
 */
export function resetAndUpdateDisplay(): void {
  resetTokenTotals();
  updateTokenDisplay();
}
