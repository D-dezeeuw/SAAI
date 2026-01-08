/**
 * Centralized DOM element queries
 * Returns typed references to all interactive elements
 */

export interface DOMElements {
  // Header buttons
  aiBtn: HTMLButtonElement;
  codeBtn: HTMLButtonElement;
  alterToggleBtn: HTMLButtonElement;
  audioVizBtn: HTMLButtonElement;
  vizBtn: HTMLButtonElement;
  shareBtn: HTMLButtonElement;
  infoBtn: HTMLButtonElement;
  statsBtn: HTMLButtonElement;

  // Panels
  generatePanel: HTMLDivElement;
  codeSection: HTMLDivElement;
  alterSection: HTMLDivElement;
  contextSection: HTMLDivElement;
  contextHeader: HTMLDivElement;
  contextArrow: HTMLSpanElement;
  contextDisplay: HTMLPreElement;

  // Inputs
  promptInput: HTMLInputElement;
  alterInput: HTMLInputElement;
  genreSelect: HTMLSelectElement;
  bankSelect: HTMLSelectElement;

  // Action buttons
  generateBtn: HTMLButtonElement;
  alterBtn: HTMLButtonElement;
  evolveBtn: HTMLButtonElement;
  playBtn: HTMLButtonElement;
  alterPlayBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  resetTokensBtn: HTMLButtonElement;

  // Editor
  editorContainer: HTMLDivElement;

  // Canvases
  pianorollCanvas: HTMLCanvasElement;
  spectrumCanvas: HTMLCanvasElement;
  scopeCanvas: HTMLCanvasElement;
  shaderCanvas: HTMLCanvasElement;

  // Visualizer dropdown
  vizDropdown: HTMLDivElement;
  vizButtons: NodeListOf<HTMLButtonElement>;

  // Popups
  shortcutsPopup: HTMLDivElement;
  shortcutsClose: HTMLButtonElement;
  tokenPopup: HTMLDivElement;
  tokenPopupClose: HTMLButtonElement;

  // Other
  logoElement: HTMLElement;
  toast: HTMLDivElement;
}

/**
 * Query all DOM elements needed by the application
 */
export function getDOMElements(): DOMElements {
  const vizDropdown = document.getElementById('viz-dropdown') as HTMLDivElement;

  return {
    // Header buttons
    aiBtn: document.getElementById('ai-btn') as HTMLButtonElement,
    codeBtn: document.getElementById('code-btn') as HTMLButtonElement,
    alterToggleBtn: document.getElementById('alter-toggle-btn') as HTMLButtonElement,
    audioVizBtn: document.getElementById('audio-viz-btn') as HTMLButtonElement,
    vizBtn: document.getElementById('viz-btn') as HTMLButtonElement,
    shareBtn: document.getElementById('share-btn') as HTMLButtonElement,
    infoBtn: document.getElementById('info-btn') as HTMLButtonElement,
    statsBtn: document.getElementById('stats-btn') as HTMLButtonElement,

    // Panels
    generatePanel: document.getElementById('generate-panel') as HTMLDivElement,
    codeSection: document.querySelector('.code-section') as HTMLDivElement,
    alterSection: document.querySelector('.alter-section') as HTMLDivElement,
    contextSection: document.getElementById('context-section') as HTMLDivElement,
    contextHeader: document.getElementById('context-header') as HTMLDivElement,
    contextArrow: document.getElementById('context-arrow') as HTMLSpanElement,
    contextDisplay: document.getElementById('context-display') as HTMLPreElement,

    // Inputs
    promptInput: document.getElementById('prompt-input') as HTMLInputElement,
    alterInput: document.getElementById('alter-input') as HTMLInputElement,
    genreSelect: document.getElementById('genre-select') as HTMLSelectElement,
    bankSelect: document.getElementById('bank-select') as HTMLSelectElement,

    // Action buttons
    generateBtn: document.getElementById('generate-btn') as HTMLButtonElement,
    alterBtn: document.getElementById('alter-btn') as HTMLButtonElement,
    evolveBtn: document.getElementById('evolve-btn') as HTMLButtonElement,
    playBtn: document.getElementById('play-btn') as HTMLButtonElement,
    alterPlayBtn: document.getElementById('alter-play-btn') as HTMLButtonElement,
    stopBtn: document.getElementById('stop-btn') as HTMLButtonElement,
    resetTokensBtn: document.getElementById('reset-tokens') as HTMLButtonElement,

    // Editor
    editorContainer: document.getElementById('code-editor-container') as HTMLDivElement,

    // Canvases
    pianorollCanvas: document.getElementById('pianoroll-canvas') as HTMLCanvasElement,
    spectrumCanvas: document.getElementById('spectrum-canvas') as HTMLCanvasElement,
    scopeCanvas: document.getElementById('scope-canvas') as HTMLCanvasElement,
    shaderCanvas: document.getElementById('shader-canvas') as HTMLCanvasElement,

    // Visualizer dropdown
    vizDropdown,
    vizButtons: vizDropdown.querySelectorAll('button[data-viz]') as NodeListOf<HTMLButtonElement>,

    // Popups
    shortcutsPopup: document.getElementById('shortcuts-popup') as HTMLDivElement,
    shortcutsClose: document.getElementById('shortcuts-close') as HTMLButtonElement,
    tokenPopup: document.getElementById('token-popup') as HTMLDivElement,
    tokenPopupClose: document.getElementById('token-popup-close') as HTMLButtonElement,

    // Other
    logoElement: document.querySelector('.header h1') as HTMLElement,
    toast: document.getElementById('toast') as HTMLDivElement,
  };
}
