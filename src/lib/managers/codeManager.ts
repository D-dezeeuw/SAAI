/**
 * Code transformation utilities for Strudel patterns
 */

import { ANALYZE_PATTERN, MULTI_STATEMENT_PATTERN } from '../config/constants';

export interface WrappedCode {
  code: string;
  offset: number;
}

/**
 * Wrap code with .analyze('viz') for visualization
 * Returns { code, offset } where offset is used for code highlighting adjustment
 */
export function wrapCodeWithAnalyze(code: string): WrappedCode {
  // Skip if code already has .analyze('viz')
  if (ANALYZE_PATTERN.test(code)) {
    return { code, offset: 0 };
  }

  // Check if code has multiple statements (setbpm, setcps, etc.)
  if (MULTI_STATEMENT_PATTERN.test(code)) {
    // For multi-statement code, append .analyze() to the last expression
    return { code: code.replace(/(\)\s*)$/, `$1.analyze('viz')`), offset: 0 };
  }

  // Single expression - wrap and add .analyze()
  return { code: `(${code}).analyze('viz')`, offset: 1 };
}
