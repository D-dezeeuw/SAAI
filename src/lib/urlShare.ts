import pako from 'pako';

// URL parameter name - using 'c' for brevity (every char counts in URLs)
export const URL_PARAM = 'c';

// Maximum safe URL length (conservative limit for broad compatibility)
export const MAX_URL_LENGTH = 2000;

/**
 * Compress code string to URL-safe base64 format
 * Uses deflate compression + base64url encoding
 */
export function compressCode(code: string): string {
  if (!code || code.trim() === '') {
    return '';
  }

  try {
    // Convert string to Uint8Array for pako
    const textEncoder = new TextEncoder();
    const data = textEncoder.encode(code);

    // Compress with maximum compression level
    const compressed = pako.deflate(data, { level: 9 });

    // Convert Uint8Array to base64
    let binary = '';
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    const base64 = btoa(binary);

    // Make URL-safe: replace + with -, / with _, remove padding =
    const urlSafe = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return urlSafe;
  } catch (error) {
    console.error('Failed to compress code:', error);
    return '';
  }
}

/**
 * Decompress URL-safe base64 string back to code
 */
export function decompressCode(compressed: string): string | null {
  if (!compressed || compressed.trim() === '') {
    return null;
  }

  try {
    // Restore standard base64: - back to +, _ back to /
    let base64 = compressed
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Add padding if needed
    const paddingNeeded = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(paddingNeeded);

    // Decode base64 to binary string
    const binary = atob(base64);

    // Convert to Uint8Array
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decompress
    const decompressed = pako.inflate(bytes);

    // Convert back to string
    const textDecoder = new TextDecoder();
    return textDecoder.decode(decompressed);
  } catch (error) {
    console.error('Failed to decompress code:', error);
    return null;
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
 */
export function getCodeFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get(URL_PARAM);

  if (!compressed) {
    return null;
  }

  return decompressCode(compressed);
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
