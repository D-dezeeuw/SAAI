/**
 * Custom Scope Visualizer for Strudel
 * Bypasses Strudel's broken color configuration and provides full control over styling.
 *
 * Uses Web Audio API to capture audio from the page's audio context.
 */

declare global {
  interface Window {
    __scopeAnalyser?: AnalyserNode;
    __scopeAudioContext?: AudioContext;
  }
}

export interface CustomScopeOptions {
  color: string;           // Line color (e.g., '#FF00FF')
  thickness: number;       // Line width in pixels
  scale: number;           // Y-axis amplitude scale (0-1)
  pos: number;             // Vertical position (0=top, 1=bottom)
  align: boolean;          // Align to zero-crossing
  trigger: number;         // Trigger threshold for alignment
  glow: boolean;           // Enable glow effect
  glowIntensity: number;   // Shadow blur radius
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

export class CustomScope {
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private options: CustomScopeOptions;
  private isRunning: boolean = false;
  private _debugLogged: boolean = false;
  private _lastDataLog: number = 0;
  private dataArray: Float32Array | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    options: Partial<CustomScopeOptions> = {}
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Set the line color
   */
  public setColor(color: string): void {
    this.options.color = color;
  }

  /**
   * Update multiple options at once
   */
  public setOptions(options: Partial<CustomScopeOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  public getOptions(): CustomScopeOptions {
    return { ...this.options };
  }

  /**
   * Core drawing method - renders the oscilloscope waveform
   */
  private draw(): void {
    const { ctx, options } = this;
    const { width, height } = ctx.canvas;
    const analyser = window.__scopeAnalyser;

    // Debug: log analyzer status (throttled, keep checking until analyzer exists)
    const now = Date.now();
    if (!this._debugLogged && (!this._lastDataLog || now - this._lastDataLog > 500)) {
      console.log('[CustomScope] Analyzer exists:', !!analyser);
      this._lastDataLog = now;
      if (analyser) {
        this._debugLogged = true;
        console.log('[CustomScope] Analyzer found! frequencyBinCount:', analyser.frequencyBinCount);
      }
    }

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
    if (options.glow) {
      ctx.shadowColor = options.color;
      ctx.shadowBlur = options.glowIntensity;
    } else {
      ctx.shadowBlur = 0;
    }

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
    if (!this.dataArray || this.dataArray.length !== bufferLength) {
      this.dataArray = new Float32Array(bufferLength);
    }

    // Step 6: Get time-domain data from analyzer
    analyser.getFloatTimeDomainData(this.dataArray);

    // Debug: log data info once per second
    if (this._debugLogged && (!this._lastDataLog || now - this._lastDataLog > 1000)) {
      const min = Math.min(...Array.from(this.dataArray));
      const max = Math.max(...Array.from(this.dataArray));
      const hasSignal = max - min > 0.01;
      console.log('[CustomScope] Data:', {
        bufferLength,
        min: min.toFixed(4),
        max: max.toFixed(4),
        hasSignal,
        sample: Array.from(this.dataArray.slice(0, 5)).map(v => v.toFixed(3))
      });
      this._lastDataLog = now;
    }

    // Step 7: Find trigger point for alignment (zero-crossing detection)
    let triggerIndex = 0;
    if (options.align && bufferLength > 1) {
      // Find zero-crossing point (negative to positive transition)
      for (let i = 1; i < bufferLength; i++) {
        if (this.dataArray[i - 1] <= options.trigger && this.dataArray[i] > options.trigger) {
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
      const sample = this.dataArray[i]; // Range: -1.0 to 1.0
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

  /**
   * Start the animation loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this._debugLogged = false; // Reset debug flag for fresh logs

    console.log('[CustomScope] Starting...', {
      canvasWidth: this.ctx.canvas.width,
      canvasHeight: this.ctx.canvas.height,
      analyserExists: !!window.__scopeAnalyser
    });

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
    // Clear canvas
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  /**
   * Resize canvas to match window dimensions
   */
  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.canvas.width = window.innerWidth * dpr;
    this.ctx.canvas.height = window.innerHeight * dpr;
  }

  /**
   * Check if the scope is currently running
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}
