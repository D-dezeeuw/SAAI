/**
 * Shader utility functions for the particle system
 * Eliminates duplication in shader.ts
 */

import { CONFIG } from '../config/configuration';

// Shorthand color references from config
const CYAN = CONFIG.colors.cyan;
const PINK = CONFIG.colors.pink;

/**
 * RGB color type
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Interpolate between cyan and pink colors
 * @param t - Interpolation factor (0 = cyan, 1 = pink)
 */
export function interpolateColor(t: number): RGB {
  return {
    r: CYAN.r + (PINK.r - CYAN.r) * t,
    g: CYAN.g + (PINK.g - CYAN.g) * t,
    b: CYAN.b + (PINK.b - CYAN.b) * t,
  };
}

/**
 * Get a random value in a range
 */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Get size for a particle based on style
 */
export function getSizeForStyle(style: string, sizeScale: number): number {
  const styleConfig = CONFIG[style as keyof typeof CONFIG] as { sizeMin: number; sizeMax: number };
  if (!styleConfig?.sizeMin) return 10 * sizeScale;
  return randomInRange(styleConfig.sizeMin, styleConfig.sizeMax) * sizeScale;
}

/**
 * Get alpha for a particle based on style
 */
export function getAlphaForStyle(style: string): number {
  const styleConfig = CONFIG[style as keyof typeof CONFIG] as { alphaMin: number; alphaMax: number };
  if (!styleConfig?.alphaMin) return 0.5;
  return randomInRange(styleConfig.alphaMin, styleConfig.alphaMax);
}

/**
 * Compile a WebGL shader
 */
export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile error: ' + info);
  }

  return shader;
}

/**
 * Create a WebGL program from vertex and fragment shaders
 * @param gl - WebGL context
 * @param vertexSource - Vertex shader source
 * @param fragmentSource - Fragment shader source
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    throw new Error('Program link error: ' + info);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Smoothstep interpolation for smooth transitions
 */
export function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

/**
 * Seeded pseudo-random for consistent direction changes
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Get direction vector for trail particles at a given phase
 */
export function getTrailDirection(phase: number): { x: number; y: number } {
  const seedX = Math.sin(phase * 12.9898) * 43758.5453;
  const seedY = Math.sin(phase * 78.233) * 43758.5453;
  return {
    x: ((seedX - Math.floor(seedX)) * 2 - 1) * 10,
    y: ((seedY - Math.floor(seedY)) * 2 - 1) * 10,
  };
}

/**
 * Wrap a particle position around screen edges
 */
export function wrapPosition(
  x: number,
  y: number,
  size: number,
  width: number,
  height: number,
  randomizeOther: boolean = false
): { x: number; y: number; wrapped: boolean } {
  let wrapped = false;
  let newX = x;
  let newY = y;

  if (x > width + size) {
    newX = -size;
    if (randomizeOther) newY = Math.random() * height;
    wrapped = true;
  } else if (x < -size) {
    newX = width + size;
    if (randomizeOther) newY = Math.random() * height;
    wrapped = true;
  }

  if (y > height + size) {
    newY = -size;
    if (randomizeOther) newX = Math.random() * width;
    wrapped = true;
  } else if (y < -size) {
    newY = height + size;
    if (randomizeOther) newX = Math.random() * width;
    wrapped = true;
  }

  return { x: newX, y: newY, wrapped };
}
