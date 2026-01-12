/**
 * Custom Spectrum Visualizer for Strudel
 * Bypasses Strudel's analyze limitation by using the intercepted audio analyser.
 * Creates a scrolling waterfall spectrum visualization.
 *
 * Uses Web Audio API to capture audio from the page's audio context via window.__scopeAnalyser.
 */

import { BaseVisualizer } from './BaseVisualizer';
import type { BaseVisualizerOptions } from './BaseVisualizer';
import { APP_CONFIG } from '../config/appConfig';

export interface CustomSpectrumOptions extends BaseVisualizerOptions {
  speed: number;           // Scroll speed in pixels per frame
  min: number;             // Minimum dB (e.g., -80)
  max: number;             // Maximum dB (e.g., 0)
  thickness: number;       // Bar thickness in pixels
}

const DEFAULT_OPTIONS: CustomSpectrumOptions = {
  color: APP_CONFIG.colors.primary.base,
  speed: 1,
  min: -80,
  max: 0,
  thickness: 1,
  glow: true,
  glowIntensity: 5,
};

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class CustomSpectrum extends BaseVisualizer<CustomSpectrumOptions> {
  private lastFrame: ImageData | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    options: Partial<CustomSpectrumOptions> = {}
  ) {
    super(canvas, DEFAULT_OPTIONS, options);
  }

  /**
   * Core drawing method - renders the scrolling spectrum waterfall
   */
  protected draw(): void {
    const { ctx, options } = this;
    const canvas = ctx.canvas;
    const { width, height } = canvas;
    const analyser = this.getAnalyser();

    // Handle no audio case - just preserve the existing frame
    if (!analyser) {
      return;
    }

    // Initialize data buffer if needed
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = this.ensureDataArray(bufferLength);

    // Get frequency data from analyzer
    analyser.getFloatFrequencyData(dataArray);

    // Get or initialize last frame for scrolling effect
    if (!this.lastFrame || this.lastFrame.width !== width || this.lastFrame.height !== height) {
      this.lastFrame = ctx.getImageData(0, 0, width, height);
    }

    // Clear and scroll: shift existing content left by scroll speed
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(this.lastFrame, -options.speed, 0);

    // Configure fill style
    ctx.fillStyle = options.color;

    // Apply glow effect
    this.applyGlow();

    // Draw new frequency data column on the right edge
    const xPos = width - options.speed;

    for (let i = 0; i < bufferLength; i++) {
      // Normalize frequency value from dB to 0-1 range
      const normalized = clamp((dataArray[i] - options.min) / (options.max - options.min), 0, 1);

      // Set opacity based on frequency intensity
      ctx.globalAlpha = normalized;

      // Logarithmic frequency scale (low frequencies get more space)
      const yPos = (Math.log(i + 1) / Math.log(bufferLength)) * height;

      // Draw bar from bottom up
      ctx.fillRect(xPos, height - yPos, options.speed, options.thickness);
    }

    // Reset global alpha
    ctx.globalAlpha = 1;

    // Store current frame for next scroll iteration
    this.lastFrame = ctx.getImageData(0, 0, width, height);
  }

  /**
   * Clear last frame on stop
   */
  protected onStop(): void {
    this.lastFrame = null;
  }

  /**
   * Reset last frame on resize to avoid stretching artifacts
   */
  protected onResize(): void {
    this.lastFrame = null;
  }
}
