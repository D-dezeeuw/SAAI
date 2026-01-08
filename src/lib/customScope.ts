/**
 * Custom Scope Visualizer for Strudel
 * Bypasses Strudel's broken color configuration and provides full control over styling.
 *
 * Uses Web Audio API to capture audio from the page's audio context.
 */

import { BaseVisualizer } from './BaseVisualizer';
import type { BaseVisualizerOptions } from './BaseVisualizer';

export interface CustomScopeOptions extends BaseVisualizerOptions {
  thickness: number;       // Line width in pixels
  scale: number;           // Y-axis amplitude scale (0-1)
  pos: number;             // Vertical position (0=top, 1=bottom)
  align: boolean;          // Align to zero-crossing
  trigger: number;         // Trigger threshold for alignment
  smear: number;           // Trail persistence (0=none, 1=full)
}

const DEFAULT_OPTIONS: CustomScopeOptions = {
  color: '#FF00FF',
  thickness: 3,
  scale: 0.25,
  pos: 0.5,
  align: true,
  trigger: 0,
  glow: true,
  glowIntensity: 8,
  smear: 0,
};

export class CustomScope extends BaseVisualizer<CustomScopeOptions> {
  constructor(
    canvas: HTMLCanvasElement,
    options: Partial<CustomScopeOptions> = {}
  ) {
    super(canvas, DEFAULT_OPTIONS, options);
  }

  /**
   * Core drawing method - renders the oscilloscope waveform
   */
  protected draw(): void {
    const { ctx, options } = this;
    const { width, height } = ctx.canvas;
    const analyser = this.getAnalyser();

    // Step 1: Clear or smear canvas
    if (options.smear > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - options.smear})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    // Step 2: Configure stroke style
    ctx.lineWidth = options.thickness;
    ctx.strokeStyle = options.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Step 3: Apply glow effect
    this.applyGlow();

    // Step 4: Handle no audio case - draw flat line
    if (!analyser) {
      ctx.beginPath();
      const y = options.pos * height;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      return;
    }

    // Step 5: Initialize data buffer if needed
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = this.ensureDataArray(bufferLength);

    // Step 6: Get time-domain data from analyzer
    analyser.getFloatTimeDomainData(dataArray);

    // Step 7: Find trigger point for alignment (zero-crossing detection)
    let triggerIndex = 0;
    if (options.align && bufferLength > 1) {
      // Find zero-crossing point (negative to positive transition)
      for (let i = 1; i < bufferLength; i++) {
        if (dataArray[i - 1] <= options.trigger && dataArray[i] > options.trigger) {
          triggerIndex = i;
          break;
        }
      }
    }

    // Step 8: Draw waveform
    ctx.beginPath();
    const samplesRemaining = bufferLength - triggerIndex;
    const sliceWidth = width / samplesRemaining;
    let x = 0;

    for (let i = triggerIndex; i < bufferLength; i++) {
      const sample = dataArray[i]; // Range: -1.0 to 1.0
      const y = (options.pos - sample * options.scale) * height;

      if (i === triggerIndex) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
  }
}
