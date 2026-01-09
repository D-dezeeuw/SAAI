/**
 * Playback Manager - handles audio playback, visualization, and code evaluation
 */
import type { EditorView } from '@codemirror/view';
import type { Hap, Widget, StrudelRepl, VizStyle } from '../types';
import { SCOPE_COLOR, DEBOUNCE_MS, PIANOROLL_QUERY_CYCLES, LOGO_GLOW_MIN, LOGO_GLOW_MAX, LOGO_GLOW_BASE_OPACITY, LOGO_GLOW_OPACITY_FACTOR } from '../config/constants';
import { setupCanvas, createScopeCtxProxy } from './canvasManager';
import { wrapCodeWithAnalyze } from './codeManager';
import { ensureSamplesLoaded } from './sampleManager';
import { drawPianoroll, PIANOROLL_PLAYHEAD } from '../visualization/pianoroll';
import { extractAudioData, filterActiveHaps, calculateTotalIntensity } from '../utils/audioData';
import { initShader, updateShader, setShaderStyle, setShaderIdle, cleanupShader, startShader } from '../visualization/shader';
import { CustomScope } from '../visualization/customScope';
import { CustomSpectrum } from '../visualization/customSpectrum';

// We need to import these from strudel at runtime
// These will be passed in as dependencies
export interface StrudelDeps {
  initStrudel: (config: { prebake: () => Promise<void> }) => Promise<StrudelRepl>;
  evaluate: (code: string) => Promise<unknown>;
  hush: () => void;
  getAudioContext: () => AudioContext | null;
  getAnalyserById: (id: string) => AnalyserNode | null;
  cleanupDraw: (full: boolean) => void;
  Framer: new (callback: () => void, onError?: (err: unknown) => void) => { start: () => void; stop: () => void };
  samples: (source: string) => Promise<void>;
}

export interface PlaybackElements {
  pianorollCanvas: HTMLCanvasElement;
  spectrumCanvas: HTMLCanvasElement;
  scopeCanvas: HTMLCanvasElement;
  shaderCanvas: HTMLCanvasElement;
  editorContainer: HTMLDivElement;
  playBtn: HTMLButtonElement;
  logoElement: HTMLElement | null;
}

export interface PlaybackDeps {
  strudel: StrudelDeps;
  elements: PlaybackElements;
  editor: EditorView;
  getCode: () => string;
  setCode: (code: string) => void;
  updateHighlights: (editor: EditorView, highlights: { from: number; to: number }[]) => void;
  clearHighlights: (editor: EditorView) => void;
  updateSliderWidgets: (editor: EditorView, widgets: Widget[]) => void;
  updateWidgets: (editor: EditorView, widgets: Widget[]) => void;
  showToast: (message?: string, duration?: number) => void;
  syncAlterPlayBtn: () => void;
  getState: () => {
    currentVizStyle: VizStyle;
    audioVizEnabled: boolean;
    isMobile: boolean;
  };
}

export interface PlaybackManager {
  init: () => Promise<void>;
  playCode: () => Promise<void>;
  togglePlay: () => void;
  pauseCode: () => void;
  resumeCode: () => void;
  stopCode: () => void;
  handleCodeChange: () => void;
  updateShaderStyle: (newStyle: string) => void;
  handleResize: () => void;
  getCustomScope: () => CustomScope | null;
  getCustomSpectrum: () => CustomSpectrum | null;
  isPlaying: () => boolean;
  isPaused: () => boolean;
  cleanup: () => void;
}

export function createPlaybackManager(deps: PlaybackDeps): PlaybackManager {
  const { strudel, elements, editor, getCode, showToast, syncAlterPlayBtn, getState } = deps;
  const { pianorollCanvas, spectrumCanvas, scopeCanvas, shaderCanvas, editorContainer, playBtn, logoElement } = elements;

  // Internal state
  let isInitialized = false;
  let playing = false;
  let paused = false;
  let strudelRepl: StrudelRepl | null = null;
  let highlightFramer: { start: () => void; stop: () => void } | null = null;
  let codeOffset = 0;
  let codeChangeTimer: ReturnType<typeof setTimeout> | null = null;
  let customScope: CustomScope | null = null;
  let customSpectrum: CustomSpectrum | null = null;

  /**
   * Initialize Strudel with samples
   */
  async function init(): Promise<void> {
    if (isInitialized) return;
    try {
      strudelRepl = await strudel.initStrudel({
        prebake: async () => {
          await strudel.samples('github:tidalcycles/Dirt-Samples/master/');
          await strudel.samples('https://raw.githubusercontent.com/felixroos/dough-samples/main/piano.json');
          await strudel.samples('https://raw.githubusercontent.com/felixroos/dough-samples/main/tidal-drum-machines.json');
        },
      });
      isInitialized = true;
    } catch (error) {
      console.error('Init error:', error);
    }
  }

  /**
   * Start highlighting and pianoroll visualization
   */
  function startHighlighting(): void {
    if (!strudelRepl?.scheduler) return;

    highlightFramer?.stop();
    const pianorollCtx = window.__pianorollCtx;

    highlightFramer = new strudel.Framer(() => {
      try {
        if (!strudelRepl?.scheduler?.pattern) return;

        const now = strudelRepl.scheduler.now();
        const cycles = PIANOROLL_QUERY_CYCLES;
        const haps = strudelRepl.scheduler.pattern.queryArc(now - cycles * PIANOROLL_PLAYHEAD, now + cycles * (1 - PIANOROLL_PLAYHEAD));

        if (pianorollCtx) {
          drawPianoroll(pianorollCtx, haps, now, cycles);
        }

        if (window.__shaderCtx) {
          const audioData = extractAudioData(haps, now);
          updateShader(window.__shaderCtx, audioData);
        }

        const activeHaps = filterActiveHaps(haps, now);

        if (logoElement) {
          const intensity = calculateTotalIntensity(activeHaps);
          const glowSize = LOGO_GLOW_MIN + intensity * (LOGO_GLOW_MAX - LOGO_GLOW_MIN);
          const glowOpacity = LOGO_GLOW_BASE_OPACITY - intensity * LOGO_GLOW_OPACITY_FACTOR;
          logoElement.style.filter = `drop-shadow(0 0 ${glowSize}px rgba(255, 255, 255, ${glowOpacity}))`;
        }

        const highlights: { from: number; to: number }[] = [];
        for (const hap of activeHaps) {
          if (hap.context?.locations) {
            for (const loc of hap.context.locations) {
              if (Array.isArray(loc) && loc.length >= 2) {
                highlights.push({ from: loc[0] - codeOffset, to: loc[1] - codeOffset });
              } else if (loc && typeof loc === 'object' && 'start' in loc && 'end' in loc) {
                highlights.push({ from: (loc as { start: number; end: number }).start - codeOffset, to: (loc as { start: number; end: number }).end - codeOffset });
              }
            }
          }
        }

        deps.updateHighlights(editor, highlights);
      } catch (err) {
        // Suppress non-finite AudioParam errors from Strudel's internal scheduling
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('non-finite')) {
          console.warn('Highlight frame error:', err);
        }
      }
    }, (err: unknown) => {
      // Suppress non-finite AudioParam errors from Strudel's internal scheduling
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('non-finite')) {
        console.warn('Highlight error:', err);
      }
    });

    highlightFramer.start();
  }

  /**
   * Stop highlighting and clear visualizations
   */
  function stopHighlighting(): void {
    highlightFramer?.stop();
    highlightFramer = null;
    deps.clearHighlights(editor);
    window.__debuggedHap = false;

    const pianorollCtx = window.__pianorollCtx;
    if (pianorollCtx) {
      pianorollCtx.clearRect(0, 0, pianorollCtx.canvas.width, pianorollCtx.canvas.height);
    }

    const scopeCtx = window.__scopeCtx;
    if (scopeCtx) {
      scopeCtx.clearRect(0, 0, scopeCtx.canvas.width, scopeCtx.canvas.height);
    }

    if (logoElement) {
      logoElement.style.filter = 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))';
    }
  }

  /**
   * Hot-swap the pattern without stopping the scheduler
   */
  async function updatePattern(): Promise<void> {
    const code = getCode().trim();
    if (!code) return;

    await ensureSamplesLoaded(code);
    const wrapped = wrapCodeWithAnalyze(code);
    codeOffset = wrapped.offset;

    try {
      const result = await strudel.evaluate(wrapped.code);

      if (!result) {
        editorContainer.classList.add('error');
        showToast();
        return;
      }

      editorContainer.classList.remove('error');

      const widgets = strudelRepl?.state?.widgets;
      if (widgets && widgets.length > 0) {
        const adjustedWidgets = widgets.map((w: Widget) => ({
          ...w,
          from: w.from - codeOffset,
          to: w.to - codeOffset,
        }));
        const sliders = adjustedWidgets.filter((w: Widget) => w.type === 'slider');
        deps.updateSliderWidgets(editor, sliders);
        deps.updateWidgets(editor, adjustedWidgets);
      }

      strudelRepl?.scheduler?.setPattern(result);
    } catch (evalError) {
      console.error('Hot-swap failed:', evalError);
      editorContainer.classList.add('error');
      showToast();
    }
  }

  /**
   * Handle code changes with debouncing
   */
  function handleCodeChange(): void {
    if (!playing) return;

    if (codeChangeTimer) {
      clearTimeout(codeChangeTimer);
    }

    codeChangeTimer = setTimeout(async () => {
      await updatePattern();
    }, DEBOUNCE_MS);
  }

  /**
   * Update shader visualization style
   */
  function updateShaderStyle(newStyle: string): void {
    if (newStyle === 'none') {
      if (window.__shaderCtx) {
        cleanupShader(window.__shaderCtx);
        window.__shaderCtx = undefined;
        const gl = shaderCanvas.getContext('webgl2');
        if (gl) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }
    } else {
      if (window.__shaderCtx) {
        setShaderStyle(window.__shaderCtx, newStyle);
      } else {
        try {
          window.__shaderCtx = initShader(shaderCanvas, newStyle);
          setShaderIdle(window.__shaderCtx);
        } catch (e) {
          console.warn('Shader initialization failed:', e);
        }
      }
    }
  }

  /**
   * Handle window resize
   */
  function handleResize(): void {
    if (window.__pianorollCtx) {
      window.__pianorollCtx = setupCanvas(pianorollCanvas);
    }
    if (window.__spectrumCtx) {
      window.__spectrumCtx = setupCanvas(spectrumCanvas);
    }
    if (window.__scopeCtx) {
      window.__scopeCtx = createScopeCtxProxy(setupCanvas(scopeCanvas));
    }
    customScope?.resize();
    customSpectrum?.resize();
  }

  /**
   * Play the current code
   */
  async function playCode(): Promise<void> {
    const code = getCode().trim();
    if (!code) {
      console.warn('[playCode] No code to play');
      return;
    }

    if (!isInitialized) {
      await init();
    }

    await ensureSamplesLoaded(code);

    window.__pianorollCtx = setupCanvas(pianorollCanvas);
    window.__spectrumCtx = setupCanvas(spectrumCanvas);
    window.__scopeCtx = createScopeCtxProxy(setupCanvas(scopeCanvas));

    const { isMobile, currentVizStyle, audioVizEnabled } = getState();

    if (!isMobile) {
      if (!customScope) {
        customScope = new CustomScope(scopeCanvas, {
          color: SCOPE_COLOR,
          thickness: 3,
          scale: 0.25,
          pos: 0.5,
          align: true,
          glow: true,
          glowIntensity: 8
        });
      }

      if (!customSpectrum) {
        customSpectrum = new CustomSpectrum(spectrumCanvas, {
          color: '#00FFFF',
          speed: 1,
          min: -80,
          max: 0,
          thickness: 1,
          glow: true,
          glowIntensity: 5
        });
      }
    }

    if (!window.__shaderCtx && currentVizStyle !== 'none') {
      try {
        window.__shaderCtx = initShader(shaderCanvas, currentVizStyle);
      } catch (e) {
        console.warn('Shader initialization failed:', e);
      }
    }

    if (window.__shaderCtx && currentVizStyle !== 'none') {
      startShader(window.__shaderCtx);
    }

    const wrapped = wrapCodeWithAnalyze(code);
    codeOffset = wrapped.offset;

    try {
      const result = await strudel.evaluate(wrapped.code);

      if (!result) {
        editorContainer.classList.add('error');
        showToast();
        return;
      }

      editorContainer.classList.remove('error');

      const strudelAnalyser = strudel.getAnalyserById('viz');
      if (strudelAnalyser) {
        window.__scopeAnalyser = strudelAnalyser;
        window.__scopeAudioContext = strudel.getAudioContext() ?? undefined;
      } else {
        console.warn('[Visualizer] Strudel analyser not found');
      }

      const widgets = strudelRepl?.state?.widgets;
      if (widgets && widgets.length > 0) {
        const adjustedWidgets = widgets.map((w: Widget) => ({
          ...w,
          from: w.from - codeOffset,
          to: w.to - codeOffset,
        }));
        const sliders = adjustedWidgets.filter((w: Widget) => w.type === 'slider');
        const blockWidgets = adjustedWidgets.filter((w: Widget) => w.type !== 'slider');
        if (sliders.length > 0) deps.updateSliderWidgets(editor, sliders);
        if (blockWidgets.length > 0) deps.updateWidgets(editor, blockWidgets);
      }

      startHighlighting();
      if (!isMobile && audioVizEnabled) {
        customScope?.start();
        customSpectrum?.start();
      }
      playing = true;
      paused = false;
      playBtn.textContent = '⏸';
      playBtn.title = 'Pause';
      playBtn.className = 'playing';
      syncAlterPlayBtn();
    } catch (error) {
      console.error('Play error:', error);
      editorContainer.classList.add('error');
      showToast();
    }
  }

  /**
   * Toggle play/pause state
   */
  function togglePlay(): void {
    if (paused) {
      resumeCode();
    } else if (playing) {
      pauseCode();
    } else {
      playCode();
    }
  }

  /**
   * Pause playback
   */
  function pauseCode(): void {
    if (isInitialized && playing) {
      try {
        const audioCtx = strudel.getAudioContext();
        if (audioCtx && audioCtx.state === 'running') {
          audioCtx.suspend();
        }
      } catch (e) {
        console.warn('Could not suspend audio context:', e);
      }
      paused = true;
      playing = false;
      playBtn.textContent = '▶';
      playBtn.title = 'Resume';
      playBtn.className = 'paused';
      syncAlterPlayBtn();
    }
  }

  /**
   * Resume playback
   */
  function resumeCode(): void {
    if (isInitialized && paused) {
      try {
        const audioCtx = strudel.getAudioContext();
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      } catch (e) {
        console.warn('Could not resume audio context:', e);
      }
      paused = false;
      playing = true;
      playBtn.textContent = '⏸';
      playBtn.title = 'Pause';
      playBtn.className = 'playing';
      syncAlterPlayBtn();
    }
  }

  /**
   * Stop playback completely
   */
  function stopCode(): void {
    if (isInitialized) {
      try {
        const audioCtx = strudel.getAudioContext();
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      } catch (e) {
        console.warn('Could not resume audio context:', e);
      }

      strudel.hush();
      strudel.cleanupDraw(true);
      stopHighlighting();
      customScope?.stop();
      customSpectrum?.stop();
      playing = false;
      paused = false;
      playBtn.textContent = '▶';
      playBtn.title = 'Play';
      playBtn.className = '';
      syncAlterPlayBtn();

      if (window.__shaderCtx) {
        setShaderIdle(window.__shaderCtx);
      }
    }
  }

  /**
   * Cleanup resources
   */
  function cleanup(): void {
    if (codeChangeTimer) {
      clearTimeout(codeChangeTimer);
      codeChangeTimer = null;
    }
    highlightFramer?.stop();
    customScope?.stop();
    customSpectrum?.stop();
    if (window.__shaderCtx) {
      cleanupShader(window.__shaderCtx);
      window.__shaderCtx = undefined;
    }
  }

  return {
    init,
    playCode,
    togglePlay,
    pauseCode,
    resumeCode,
    stopCode,
    handleCodeChange,
    updateShaderStyle,
    handleResize,
    getCustomScope: () => customScope,
    getCustomSpectrum: () => customSpectrum,
    isPlaying: () => playing,
    isPaused: () => paused,
    cleanup,
  };
}
