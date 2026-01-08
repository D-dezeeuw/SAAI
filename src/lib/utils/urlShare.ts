import pako from 'pako';

// URL parameter name - using 'c' for brevity (every char counts in URLs)
export const URL_PARAM = 'c';

// Maximum safe URL length (conservative limit for broad compatibility)
export const MAX_URL_LENGTH = 2000;

/**
 * Convert Uint8Array to binary string
 */
function uint8ToBinaryString(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

/**
 * Convert binary string to Uint8Array
 */
function binaryStringToUint8(binary: string): Uint8Array {
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

/**
 * Convert base64 to URL-safe base64
 */
function toUrlSafeBase64(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convert URL-safe base64 back to standard base64
 */
function fromUrlSafeBase64(urlSafe: string): string {
  let base64 = urlSafe
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding if needed
  const paddingNeeded = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(paddingNeeded);
}

/**
 * Compress code string to URL-safe base64 format
 * Uses deflate compression + base64url encoding
 */
export function compressCode(code: string): string {
  if (!code?.trim()) {
    return '';
  }

  try {
    const data = new TextEncoder().encode(code);
    const compressed = pako.deflate(data, { level: 9 });
    const base64 = btoa(uint8ToBinaryString(compressed));
    return toUrlSafeBase64(base64);
  } catch (error) {
    console.error('Failed to compress code:', error);
    return '';
  }
}

/**
 * Result type for decompression - distinguishes empty input from errors
 */
export interface DecompressResult {
  code: string | null;
  error?: string;
}

/**
 * Decompress URL-safe base64 string back to code
 * Returns { code, error? } to distinguish empty input from actual errors
 */
export function decompressCode(compressed: string): DecompressResult {
  if (!compressed?.trim()) {
    return { code: null }; // Empty input, not an error
  }

  try {
    const base64 = fromUrlSafeBase64(compressed);
    const binary = atob(base64);
    const bytes = binaryStringToUint8(binary);
    const decompressed = pako.inflate(bytes);
    return { code: new TextDecoder().decode(decompressed) };
  } catch (error) {
    console.error('Failed to decompress code:', error);
    return { code: null, error: error instanceof Error ? error.message : 'Decompression failed' };
  }
}

/**
 * Generate a shareable URL with compressed code
 */
export function generateShareUrl(code: string): { url: string; error?: string } {
  const compressed = compressCode(code);

  if (!compressed) {
    return { url: '', error: 'Failed to compress code' };
  }

  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?${URL_PARAM}=${compressed}`;

  if (shareUrl.length > MAX_URL_LENGTH) {
    return {
      url: shareUrl,
      error: `URL is ${shareUrl.length} characters (recommended max: ${MAX_URL_LENGTH})`
    };
  }

  return { url: shareUrl };
}

/**
 * Extract and decompress code from current URL
 * Returns { code, error? } to allow callers to handle errors appropriately
 */
export function getCodeFromUrl(): DecompressResult {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get(URL_PARAM);
  return compressed ? decompressCode(compressed) : { code: null };
}

/**
 * Clear code parameter from URL without reload
 */
export function clearCodeFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(URL_PARAM);
  window.history.replaceState({}, '', url.toString());
}

/**
 * Check if URL has shared code
 */
export function hasSharedCode(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has(URL_PARAM);
}
