/**
 * Custom Spectrum Visualizer for Strudel
 * Bypasses Strudel's analyze limitation by using the intercepted audio analyser.
 * Creates a scrolling waterfall spectrum visualization.
 *
 * Uses Web Audio API to capture audio from the page's audio context via window.__scopeAnalyser.
 */

declare global {
  interface Window {
    __scopeAnalyser?: AnalyserNode;
    __scopeAudioContext?: AudioContext;
  }
}

export interface CustomSpectrumOptions {
  color: string;           // Fill color for frequency bars
  speed: number;           // Scroll speed in pixels per frame
  min: number;             // Minimum dB (e.g., -80)
  max: number;             // Maximum dB (e.g., 0)
  thickness: number;       // Bar thickness in pixels
  glow: boolean;           // Enable glow effect
  glowIntensity: number;   // Shadow blur radius
}

const DEFAULT_OPTIONS: CustomSpectrumOptions = {
  color: '#00FFFF',        // Cyan color for spectrum
  speed: 1,
  min: -80,
  max: 0,
  thickness: 1,
  glow: true,
  glowIntensity: 5,
};

// Helper function to clamp a value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class CustomSpectrum {
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private options: CustomSpectrumOptions;
  private isRunning: boolean = false;
  private _debugLogged: boolean = false;
  private _lastDataLog: number = 0;
  private dataArray: Float32Array | null = null;
  private lastFrame: ImageData | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    options: Partial<CustomSpectrumOptions> = {}
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set the fill color
   */
  public setColor(color: string): void {
    this.options.color = color;
  }

  /**
   * Update multiple options at once
   */
  public setOptions(options: Partial<CustomSpectrumOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  public getOptions(): CustomSpectrumOptions {
    return { ...this.options };
  }

  /**
   * Core drawing method - renders the scrolling spectrum waterfall
   */
  private draw(): void {
    const { ctx, options } = this;
    const canvas = ctx.canvas;
    const { width, height } = canvas;
    const analyser = window.__scopeAnalyser;

    // Debug: log analyzer status (throttled)
    const now = Date.now();
    if (!this._lastDataLog || now - this._lastDataLog > 1000) {
      this._lastDataLog = now;
      if (analyser && !this._debugLogged) {
        this._debugLogged = true;
      }
    }

    // Handle no audio case - just preserve the existing frame
    if (!analyser) {
      return;
    }

    // Initialize data buffer if needed
    const bufferLength = analyser.frequencyBinCount;
    if (!this.dataArray || this.dataArray.length !== bufferLength) {
      this.dataArray = new Float32Array(bufferLength);
    }

    // Get frequency data from analyzer
    analyser.getFloatFrequencyData(this.dataArray);

    // Debug: log data info once per second
    if (this._debugLogged && (!this._lastDataLog || now - this._lastDataLog > 1000)) {
      const min = Math.min(...Array.from(this.dataArray));
      const max = Math.max(...Array.from(this.dataArray));
      const hasSignal = max > -70;
      this._lastDataLog = now;
    }

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
    if (options.glow) {
      ctx.shadowColor = options.color;
      ctx.shadowBlur = options.glowIntensity;
    } else {
      ctx.shadowBlur = 0;
    }

    // Draw new frequency data column on the right edge
    const xPos = width - options.speed;

    for (let i = 0; i < bufferLength; i++) {
      // Normalize frequency value from dB to 0-1 range
      const normalized = clamp((this.dataArray[i] - options.min) / (options.max - options.min), 0, 1);

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
   * Start the animation loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this._debugLogged = false; // Reset debug flag for fresh logs

    const animate = () => {
      if (!this.isRunning) return;
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop the animation loop and clear canvas
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    // Clear canvas and reset last frame
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.lastFrame = null;
  }

  /**
   * Resize canvas to match window dimensions
   */
  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.canvas.width = window.innerWidth * dpr;
    this.ctx.canvas.height = window.innerHeight * dpr;
    // Reset last frame on resize to avoid stretching artifacts
    this.lastFrame = null;
  }

  /**
   * Check if the spectrum is currently running
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}
