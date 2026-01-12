/**
 * Application initialization module
 * Handles all manager setup, event binding, and initialization
 */
import { initStrudel, evaluate, hush, getAudioContext, getAnalyserById } from '@strudel/web';
import { cleanupDraw, Framer } from '@strudel/draw';
import { sliderWithID, slider } from '@strudel/codemirror';
import type { EditorView } from '@codemirror/view';
import { createEditor, getCode, setCode, updateHighlights, clearHighlights, updateSliderWidgets, updateWidgets } from './utils/editor';
import { initShader, setShaderIdle } from './visualization/shader';
import { APP_CONFIG } from './config/appConfig';
import { getCodeFromUrl, generateShareUrl, clearCodeFromUrl } from './utils/urlShare';
import { resetAndUpdateDisplay } from './utils/tokenTracking';
import { createUIManager } from './managers/uiManager';
import { createAIManager } from './managers/aiManager';
import { createPlaybackManager } from './managers/playbackManager';
import { MOBILE_BREAKPOINT } from './config/constants';
import { getDOMElements } from './domElements';
import type { VizStyle } from './types';

// Declare global functions made available by initStrudel
declare function samples(source: string): Promise<void>;

/**
 * Initialize CSS custom properties from appConfig colors
 * This allows CSS to use theme colors defined in TypeScript
 */
function initColors(): void {
  const { colors } = APP_CONFIG;
  const root = document.documentElement;

  // Primary theme colors
  root.style.setProperty('--color-primary', colors.primary.base);
  root.style.setProperty('--color-primary-light', colors.primary.light);
  root.style.setProperty('--color-primary-dark', colors.primary.dark);

  root.style.setProperty('--color-secondary', colors.secondary.base);
  root.style.setProperty('--color-secondary-light', colors.secondary.light);
  root.style.setProperty('--color-secondary-dark', colors.secondary.dark);

  root.style.setProperty('--color-tertiary', colors.tertiary.base);
  root.style.setProperty('--color-tertiary-light', colors.tertiary.light);
  root.style.setProperty('--color-tertiary-lighter', colors.tertiary.lighter);
  root.style.setProperty('--color-tertiary-dark', colors.tertiary.dark);
}

/**
 * Initialize the entire application
 */
export function initApp(): void {
  // Initialize CSS custom properties from config
  initColors();

  // Make slider functions available globally for evaluated code
  window.sliderWithID = sliderWithID;
  window.slider = slider;

  // Get all DOM elements
  const dom = getDOMElements();

  // Set app version in info popup
  const versionElement = document.getElementById('app-version');
  if (versionElement) versionElement.textContent = APP_CONFIG.version;

  // State
  let currentVizStyle: VizStyle = APP_CONFIG.defaultBackgroundEffect as VizStyle;
  let audioVizEnabled = APP_CONFIG.audioVisualizersEnabled;
  let lastEnrichedContext = '';
  let lastGenreContext = '';
  let lastBankName = '';

  // Mobile detection
  const isMobile = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;

  // Check for shared code in URL
  const { code: sharedCode, error: shareError } = getCodeFromUrl();
  if (shareError) console.warn('Failed to load shared code:', shareError);
  const exampleCode = sharedCode || APP_CONFIG.defaultCode;
  if (sharedCode) clearCodeFromUrl();

  // Set default values from config
  dom.promptInput.value = APP_CONFIG.defaultPrompt;
  dom.genreSelect.value = APP_CONFIG.defaultGenre;
  dom.bankSelect.value = APP_CONFIG.defaultDrumKit;
  dom.vizButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viz === APP_CONFIG.defaultBackgroundEffect);
  });

  // Set default panel visibility from config
  dom.generatePanel.classList.toggle('hidden', !APP_CONFIG.generatePanelVisible);
  dom.aiBtn.classList.toggle('active', APP_CONFIG.generatePanelVisible);
  dom.codeSection.classList.toggle('hidden', !APP_CONFIG.codeSectionVisible);
  dom.codeBtn.classList.toggle('active', APP_CONFIG.codeSectionVisible);
  dom.alterSection.classList.toggle('hidden', !APP_CONFIG.alterSectionVisible);
  dom.alterToggleBtn.classList.toggle('active', APP_CONFIG.alterSectionVisible);

  // Set initial only-alter class
  const isOnlyAlter = !APP_CONFIG.generatePanelVisible &&
                      !APP_CONFIG.codeSectionVisible &&
                      APP_CONFIG.alterSectionVisible;
  document.body.classList.toggle('only-alter', isOnlyAlter);

  // Initialize CodeMirror editor (playbackMgr referenced via closure)
  let playbackMgr: ReturnType<typeof createPlaybackManager>;
  const editor: EditorView = createEditor(dom.editorContainer, exampleCode, () => playbackMgr.handleCodeChange());

  // Initialize Playback Manager
  playbackMgr = createPlaybackManager({
    strudel: {
      initStrudel,
      evaluate,
      hush,
      getAudioContext,
      getAnalyserById,
      cleanupDraw,
      Framer,
      samples: (src: string) => samples(src),
    },
    elements: {
      pianorollCanvas: dom.pianorollCanvas,
      spectrumCanvas: dom.spectrumCanvas,
      scopeCanvas: dom.scopeCanvas,
      shaderCanvas: dom.shaderCanvas,
      editorContainer: dom.editorContainer,
      playBtn: dom.playBtn,
      logoElement: dom.logoElement,
    },
    editor,
    getCode: () => getCode(editor),
    setCode: (code: string) => setCode(editor, code),
    updateHighlights,
    clearHighlights,
    updateSliderWidgets,
    updateWidgets,
    showToast: (msg, dur) => uiMgr.showToast(msg, dur),
    syncAlterPlayBtn: () => uiMgr.syncAlterPlayBtn(),
    getState: () => ({ currentVizStyle, audioVizEnabled, isMobile }),
  });

  // Initialize UI Manager
  const uiMgr = createUIManager({
    elements: {
      generatePanel: dom.generatePanel,
      codeSection: dom.codeSection,
      alterSection: dom.alterSection,
      contextSection: dom.contextSection,
      contextDisplay: dom.contextDisplay,
      contextHeader: dom.contextHeader,
      contextArrow: dom.contextArrow,
      aiBtn: dom.aiBtn,
      codeBtn: dom.codeBtn,
      alterToggleBtn: dom.alterToggleBtn,
      playBtn: dom.playBtn,
      alterPlayBtn: dom.alterPlayBtn,
      vizBtn: dom.vizBtn,
      audioVizBtn: dom.audioVizBtn,
      vizButtons: dom.vizButtons,
      spectrumCanvas: dom.spectrumCanvas,
      scopeCanvas: dom.scopeCanvas,
      pianorollCanvas: dom.pianorollCanvas,
      bankSelect: dom.bankSelect,
      toast: dom.toast,
      infoBtn: dom.infoBtn,
      shortcutsPopup: dom.shortcutsPopup,
      shortcutsClose: dom.shortcutsClose,
      statsBtn: dom.statsBtn,
      tokenPopup: dom.tokenPopup,
      tokenPopupClose: dom.tokenPopupClose,
      kofiBtn: dom.kofiBtn,
      kofiOverlay: dom.kofiOverlay,
      kofiPopup: dom.kofiPopup,
      kofiPopupClose: dom.kofiPopupClose,
    },
    getState: () => ({
      isPlaying: playbackMgr.isPlaying(),
      currentVizStyle,
      audioVizEnabled,
      isMobile,
    }),
    setState: (updates) => {
      if (updates.currentVizStyle !== undefined) currentVizStyle = updates.currentVizStyle as VizStyle;
      if (updates.audioVizEnabled !== undefined) audioVizEnabled = updates.audioVizEnabled;
    },
    updateShaderStyle: playbackMgr.updateShaderStyle,
    stopCode: playbackMgr.stopCode,
    playCode: playbackMgr.playCode,
    getCode: () => getCode(editor),
    setCode: (code: string) => setCode(editor, code),
    getLastBankName: () => lastBankName,
    setLastBankName: (name: string) => { lastBankName = name; },
    getCustomScope: () => playbackMgr.getCustomScope(),
    getCustomSpectrum: () => playbackMgr.getCustomSpectrum(),
    initialPanelState: {
      generatePanelVisible: APP_CONFIG.generatePanelVisible,
      codeSectionVisible: APP_CONFIG.codeSectionVisible,
      alterSectionVisible: APP_CONFIG.alterSectionVisible,
    },
  });

  // Sync panel state (alter play button visibility + only-alter body class)
  uiMgr.updatePanelState();

  // Initialize AI Manager
  const aiMgr = createAIManager({
    elements: {
      promptInput: dom.promptInput,
      alterInput: dom.alterInput,
      generateBtn: dom.generateBtn,
      alterBtn: dom.alterBtn,
      evolveBtn: dom.evolveBtn,
      genreSelect: dom.genreSelect,
      bankSelect: dom.bankSelect,
      contextDisplay: dom.contextDisplay,
    },
    getCode: () => getCode(editor),
    setCode: (code: string) => setCode(editor, code),
    getState: () => ({
      isPlaying: playbackMgr.isPlaying(),
      isPaused: playbackMgr.isPaused(),
      lastEnrichedContext,
      lastGenreContext,
      lastBankName,
    }),
    setState: (updates) => {
      if (updates.lastEnrichedContext !== undefined) lastEnrichedContext = updates.lastEnrichedContext;
      if (updates.lastGenreContext !== undefined) lastGenreContext = updates.lastGenreContext;
      if (updates.lastBankName !== undefined) lastBankName = updates.lastBankName;
    },
    stopCode: playbackMgr.stopCode,
    showContextSection: () => dom.contextSection.classList.remove('hidden'),
  });

  // =============================================================================
  // Event Listeners
  // =============================================================================
  bindEventListeners(dom, uiMgr, aiMgr, playbackMgr, editor, currentVizStyle, audioVizEnabled);

  // =============================================================================
  // Initialization
  // =============================================================================
  playbackMgr.init();
  if (sharedCode) uiMgr.showToast('Loaded shared code!');

  // Initialize shader visualizer
  if (currentVizStyle !== 'none') {
    try {
      window.__shaderCtx = initShader(dom.shaderCanvas, currentVizStyle);
      setShaderIdle(window.__shaderCtx);
      dom.vizBtn.classList.add('active');
    } catch (e) {
      console.warn('Shader initialization failed:', e);
    }
  }

  // Cleanup on unload
  window.addEventListener('resize', playbackMgr.handleResize);
  window.addEventListener('beforeunload', () => {
    playbackMgr.cleanup();
    window.removeEventListener('resize', playbackMgr.handleResize);
  });
}

/**
 * Bind all event listeners
 */
function bindEventListeners(
  dom: ReturnType<typeof getDOMElements>,
  uiMgr: ReturnType<typeof createUIManager>,
  aiMgr: ReturnType<typeof createAIManager>,
  playbackMgr: ReturnType<typeof createPlaybackManager>,
  editor: EditorView,
  currentVizStyle: VizStyle,
  audioVizEnabled: boolean
): void {
  // Panel toggles
  dom.contextHeader.addEventListener('click', uiMgr.toggleContextSection);
  dom.aiBtn.addEventListener('click', uiMgr.toggleGeneratePanel);
  dom.codeBtn.addEventListener('click', uiMgr.toggleCodeSection);
  dom.alterToggleBtn.addEventListener('click', uiMgr.toggleAlterSection);

  // AI actions
  dom.generateBtn.addEventListener('click', aiMgr.generateCode);
  dom.alterBtn.addEventListener('click', aiMgr.alterCode);
  dom.evolveBtn.addEventListener('click', aiMgr.toggleEvolution);
  dom.alterInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') aiMgr.alterCode(); });
  dom.promptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') aiMgr.generateCode(); });

  // Playback
  dom.playBtn.addEventListener('click', playbackMgr.togglePlay);
  dom.alterPlayBtn.addEventListener('click', playbackMgr.togglePlay);
  dom.stopBtn.addEventListener('click', playbackMgr.stopCode);

  // UI controls
  dom.bankSelect.addEventListener('change', uiMgr.handleBankChange);
  dom.infoBtn.addEventListener('click', (e) => { e.stopPropagation(); uiMgr.toggleShortcutsPopup(); });
  dom.shortcutsClose.addEventListener('click', (e) => { e.stopPropagation(); uiMgr.toggleShortcutsPopup(); });
  dom.statsBtn.addEventListener('click', (e) => { e.stopPropagation(); uiMgr.toggleTokenPopup(); });
  dom.tokenPopupClose.addEventListener('click', (e) => { e.stopPropagation(); uiMgr.toggleTokenPopup(); });
  dom.resetTokensBtn.addEventListener('click', (e) => { e.stopPropagation(); resetAndUpdateDisplay(); });
  dom.kofiBtn.addEventListener('click', (e) => { e.stopPropagation(); uiMgr.toggleKofiPopup(); });
  dom.kofiPopupClose.addEventListener('click', (e) => { e.stopPropagation(); uiMgr.toggleKofiPopup(); });

  // Share button
  dom.shareBtn.addEventListener('click', async () => {
    const code = getCode(editor);
    if (!code.trim()) { uiMgr.showToast('No code to share'); return; }
    const { url, error } = generateShareUrl(code);
    if (!url) { uiMgr.showToast('Failed to generate share link'); return; }
    try {
      await navigator.clipboard.writeText(url);
      uiMgr.showToast(error ? 'Link copied! Warning: URL is long' : 'Share link copied!', error ? 4000 : undefined);
    } catch (err) {
      console.error('Clipboard write failed:', err);
      uiMgr.showToast('Failed to copy link');
    }
  });

  // Visualizer dropdown
  dom.vizBtn.addEventListener('click', (e) => { e.stopPropagation(); dom.vizDropdown.classList.toggle('hidden'); });
  document.addEventListener('click', () => { dom.vizDropdown.classList.add('hidden'); uiMgr.closePopupsOnOutsideClick(event!); });

  // Local state for viz style changes (closure captures initial value)
  let vizStyle = currentVizStyle;

  dom.vizButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newStyle = btn.dataset.viz!;
      dom.vizButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      vizStyle = newStyle as VizStyle;
      dom.vizBtn.classList.toggle('active', newStyle !== 'none');
      dom.vizDropdown.classList.add('hidden');
      playbackMgr.updateShaderStyle(newStyle);
    });
  });

  dom.audioVizBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    uiMgr.toggleAudioVisualizers();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || dom.editorContainer.contains(e.target as Node)) return;

    const key = e.key.toLowerCase();
    if (key === 'k') { e.preventDefault(); playbackMgr.togglePlay(); }
    else if (key === 'h') { e.preventDefault(); uiMgr.toggleAllPanels(); }
    else if (key === 'v') { e.preventDefault(); uiMgr.toggleAudioVisualizers(); }
    else if (key === 'b') { e.preventDefault(); uiMgr.toggleBackgroundVis(); }
    else if (key === 'a') { e.preventDefault(); uiMgr.toggleVisualsOnlyMode(); }
    else if (e.key === '<' || e.key === ',') { e.preventDefault(); uiMgr.cycleBackgroundViz(-1); }
    else if (e.key === '>' || e.key === '.') { e.preventDefault(); uiMgr.cycleBackgroundViz(1); }
    else if (e.key === 'Escape') { uiMgr.closePopupsOnEscape(); }
  });
}
