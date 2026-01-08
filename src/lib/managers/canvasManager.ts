/**
 * Canvas initialization and management utilities
 */

import {
  SCOPE_COLOR,
  SCOPE_GLOW_INTENSITY,
  SCOPE_LINE_WIDTH,
} from '../config/constants';
import { initShader, cleanupShader, setShaderStyle, setShaderIdle } from '../visualization/shader';
import type { ShaderContext } from '../visualization/shader';
import type { CustomScope } from '../visualization/customScope';
import type { CustomSpectrum } from '../visualization/customSpectrum';

/**
 * Setup canvas for full-viewport visualization
 * Scales canvas to device pixel ratio for crisp rendering
 */
export function setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;

  // Set to full viewport size
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;

  const ctx = canvas.getContext('2d')!;
  return ctx;
}

/**
 * Create a color-forcing Proxy for scope canvas context
 * Forces consistent magenta color and glow effect on all draw operations
 */
export function createScopeCtxProxy(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  return new Proxy(ctx, {
    set(target: CanvasRenderingContext2D, prop: string, value: unknown): boolean {
      if (prop === 'strokeStyle' || prop === 'shadowColor') {
        value = SCOPE_COLOR;
      }
      // Force thinner lines
      if (prop === 'lineWidth') {
        value = SCOPE_LINE_WIDTH;
      }
      // Add glow effect
      if (prop === 'strokeStyle') {
        target.shadowColor = SCOPE_COLOR;
        target.shadowBlur = SCOPE_GLOW_INTENSITY;
      }
      (target as unknown as Record<string, unknown>)[prop] = value;
      return true;
    },
    get(target: CanvasRenderingContext2D, prop: string): unknown {
      const value = (target as unknown as Record<string, unknown>)[prop];
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(target);
      }
      return value;
    }
  });
}

export interface CanvasElements {
  pianoroll: HTMLCanvasElement;
  spectrum: HTMLCanvasElement;
  scope: HTMLCanvasElement;
  shader: HTMLCanvasElement;
}

export interface CanvasContexts {
  pianoroll: CanvasRenderingContext2D | null;
  spectrum: CanvasRenderingContext2D | null;
  scope: CanvasRenderingContext2D | null;
  shader: ShaderContext | undefined;
}

export interface CanvasManagerDeps {
  canvases: CanvasElements;
  getContexts: () => CanvasContexts;
  setContexts: (contexts: Partial<CanvasContexts>) => void;
  customScope?: CustomScope;
  customSpectrum?: CustomSpectrum;
}

/**
 * Create a resize handler for all visualization canvases
 */
export function createResizeHandler(deps: CanvasManagerDeps): () => void {
  return () => {
    const contexts = deps.getContexts();

    if (contexts.pianoroll) {
      deps.setContexts({ pianoroll: setupCanvas(deps.canvases.pianoroll) });
    }
    if (contexts.spectrum) {
      deps.setContexts({ spectrum: setupCanvas(deps.canvases.spectrum) });
    }
    if (contexts.scope) {
      deps.setContexts({ scope: createScopeCtxProxy(setupCanvas(deps.canvases.scope)) });
    }

    // Resize custom visualizers
    deps.customScope?.resize();
    deps.customSpectrum?.resize();
  };
}

/**
 * Update shader visualization style
 * Handles cleanup for 'none', initialization, and style switching
 */
export function updateShaderStyle(
  shaderCanvas: HTMLCanvasElement,
  newStyle: string,
  getShaderCtx: () => ShaderContext | undefined,
  setShaderCtx: (ctx: ShaderContext | undefined) => void
): void {
  if (newStyle === 'none') {
    // Cleanup shader completely
    const ctx = getShaderCtx();
    if (ctx) {
      cleanupShader(ctx);
      setShaderCtx(undefined);
      const gl = shaderCanvas.getContext('webgl2');
      if (gl) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
  } else {
    // Initialize or switch style
    const ctx = getShaderCtx();
    if (ctx) {
      setShaderStyle(ctx, newStyle);
    } else {
      try {
        const newCtx = initShader(shaderCanvas, newStyle);
        setShaderCtx(newCtx);
        setShaderIdle(newCtx);
      } catch (e) {
        console.warn('Shader initialization failed:', e);
      }
    }
  }
}
