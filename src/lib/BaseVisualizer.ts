/**
 * Base class for canvas-based visualizers
 * Provides common functionality for scope and spectrum visualizers
 */

// Global audio context interface
declare global {
  interface Window {
    __scopeAnalyser?: AnalyserNode;
    __scopeAudioContext?: AudioContext;
  }
}

/**
 * Base options that all visualizers share
 */
export interface BaseVisualizerOptions {
  color: string;
  glow: boolean;
  glowIntensity: number;
}

/**
 * Abstract base class for canvas visualizers
 */
export abstract class BaseVisualizer<TOptions extends BaseVisualizerOptions> {
  protected ctx: CanvasRenderingContext2D;
  protected animationId: number | null = null;
  protected options: TOptions;
  protected isRunning: boolean = false;
  protected dataArray: Float32Array | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    defaultOptions: TOptions,
    options: Partial<TOptions> = {}
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Set the color
   */
  public setColor(color: string): void {
    this.options.color = color;
  }

  /**
   * Update multiple options at once
   */
  public setOptions(options: Partial<TOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current options
   */
  public getOptions(): TOptions {
    return { ...this.options };
  }

  /**
   * Apply glow effect to context
   */
  protected applyGlow(): void {
    if (this.options.glow) {
      this.ctx.shadowColor = this.options.color;
      this.ctx.shadowBlur = this.options.glowIntensity;
    } else {
      this.ctx.shadowBlur = 0;
    }
  }

  /**
   * Get the audio analyser node
   */
  protected getAnalyser(): AnalyserNode | undefined {
    return window.__scopeAnalyser;
  }

  /**
   * Initialize or resize the data array buffer
   */
  protected ensureDataArray(bufferLength: number): Float32Array {
    if (!this.dataArray || this.dataArray.length !== bufferLength) {
      this.dataArray = new Float32Array(bufferLength);
    }
    return this.dataArray;
  }

  /**
   * Core drawing method - must be implemented by subclasses
   */
  protected abstract draw(): void;

  /**
   * Start the animation loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

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
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.onStop();
  }

  /**
   * Hook for subclasses to perform cleanup on stop
   */
  protected onStop(): void {
    // Override in subclass if needed
  }

  /**
   * Resize canvas to match window dimensions
   */
  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.canvas.width = window.innerWidth * dpr;
    this.ctx.canvas.height = window.innerHeight * dpr;
    this.onResize();
  }

  /**
   * Hook for subclasses to perform actions on resize
   */
  protected onResize(): void {
    // Override in subclass if needed
  }

  /**
   * Check if the visualizer is currently running
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}
