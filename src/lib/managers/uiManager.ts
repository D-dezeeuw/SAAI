/**
 * UI Panel and Mode Management
 * Handles toggles, visibility states, and UI mode switching
 */

import { TOAST_DURATION_MS, TOAST_FADE_MS, VIZ_STYLES } from '../config/constants';
import type { CustomScope } from '../visualization/customScope';
import type { CustomSpectrum } from '../visualization/customSpectrum';

export interface UIElements {
  // Panels
  generatePanel: HTMLElement;
  codeSection: HTMLElement;
  alterSection: HTMLElement;
  contextSection: HTMLElement;
  contextDisplay: HTMLElement;
  contextHeader: HTMLElement;
  contextArrow: HTMLElement;
  // Buttons
  aiBtn: HTMLButtonElement;
  codeBtn: HTMLButtonElement;
  alterToggleBtn: HTMLButtonElement;
  playBtn: HTMLButtonElement;
  alterPlayBtn: HTMLButtonElement;
  vizBtn: HTMLButtonElement;
  audioVizBtn: HTMLButtonElement;
  vizButtons: NodeListOf<HTMLButtonElement>;
  infoBtn: HTMLButtonElement;
  statsBtn: HTMLButtonElement;
  // Canvases
  spectrumCanvas: HTMLCanvasElement;
  scopeCanvas: HTMLCanvasElement;
  pianorollCanvas: HTMLCanvasElement;
  // Bank
  bankSelect: HTMLSelectElement;
  // Toast
  toast: HTMLElement;
  // Popups
  shortcutsPopup: HTMLElement;
  shortcutsClose: HTMLButtonElement;
  tokenPopup: HTMLElement;
  tokenPopupClose: HTMLButtonElement;
  kofiBtn: HTMLButtonElement;
  kofiOverlay: HTMLElement;
  kofiPopup: HTMLElement;
  kofiPopupClose: HTMLButtonElement;
}

export interface UIManagerDeps {
  elements: UIElements;
  getState: () => {
    isPlaying: boolean;
    currentVizStyle: string;
    audioVizEnabled: boolean;
    isMobile: boolean;
  };
  setState: (updates: Partial<{
    currentVizStyle: string;
    audioVizEnabled: boolean;
  }>) => void;
  updateShaderStyle: (style: string) => void;
  stopCode: () => void;
  playCode: () => void;
  getCode: () => string;
  setCode: (code: string) => void;
  getLastBankName: () => string;
  setLastBankName: (name: string) => void;
  getCustomScope?: () => CustomScope | null;
  getCustomSpectrum?: () => CustomSpectrum | null;
  // Initial panel visibility from config
  initialPanelState?: {
    generatePanelVisible: boolean;
    codeSectionVisible: boolean;
    alterSectionVisible: boolean;
  };
}

export interface UIManager {
  showToast: (message?: string, duration?: number) => void;
  toggleGeneratePanel: () => void;
  toggleCodeSection: () => void;
  toggleAlterSection: () => void;
  toggleContextSection: () => void;
  showContextSection: () => void;
  toggleAllPanels: () => void;
  toggleBackgroundVis: () => void;
  cycleBackgroundViz: (direction: number) => void;
  toggleAudioVisualizers: () => void;
  toggleVisualsOnlyMode: () => void;
  handleBankChange: () => void;
  syncAlterPlayBtn: () => void;
  updatePanelState: () => void;
  toggleShortcutsPopup: () => void;
  toggleTokenPopup: () => void;
  toggleKofiPopup: () => void;
  closePopupsOnOutsideClick: (e: Event) => void;
  closePopupsOnEscape: () => void;
}

export function createUIManager(deps: UIManagerDeps): UIManager {
  const { elements, initialPanelState } = deps;

  // Internal state for panel visibility - use config defaults if provided
  const initGenerate = initialPanelState?.generatePanelVisible ?? true;
  const initCode = initialPanelState?.codeSectionVisible ?? true;
  const initAlter = initialPanelState?.alterSectionVisible ?? true;

  let panelsVisible = initGenerate || initCode || initAlter;
  let savedCodeState = initCode;
  let savedGenerateState = initGenerate;
  let savedAlterState = initAlter;

  // State for visuals-only mode
  let visualsOnlyMode = false;
  let savedAudioVizState = true;
  let savedVizStyle = 'orbs';

  function showToast(message: string = 'Strudel is inedible :(', duration: number = TOAST_DURATION_MS) {
    elements.toast.textContent = message;
    elements.toast.classList.remove('hidden', 'fade-out');

    setTimeout(() => {
      elements.toast.classList.add('fade-out');
      setTimeout(() => {
        elements.toast.classList.add('hidden');
        elements.toast.classList.remove('fade-out');
      }, TOAST_FADE_MS);
    }, duration);
  }

  function updatePanelState() {
    const generateHidden = elements.generatePanel.classList.contains('hidden');
    const codeHidden = elements.codeSection.classList.contains('hidden');
    const alterVisible = !elements.alterSection.classList.contains('hidden');

    // Show alter play button when code hidden but alter visible
    elements.alterPlayBtn.classList.toggle('hidden', !(codeHidden && alterVisible));

    // Set only-alter class when only alter section is visible
    const isOnlyAlter = generateHidden && codeHidden && alterVisible;
    document.body.classList.toggle('only-alter', isOnlyAlter);
  }

  function syncAlterPlayBtn() {
    elements.alterPlayBtn.textContent = elements.playBtn.textContent;
    elements.alterPlayBtn.className = 'alter-play-btn' +
      (elements.playBtn.className.includes('playing') ? ' playing' : '') +
      (elements.playBtn.className.includes('paused') ? ' paused' : '');
    if (elements.codeSection.classList.contains('hidden') && !elements.alterSection.classList.contains('hidden')) {
      elements.alterPlayBtn.classList.remove('hidden');
    } else {
      elements.alterPlayBtn.classList.add('hidden');
    }
  }

  function toggleGeneratePanel() {
    const isVisible = !elements.generatePanel.classList.contains('hidden');
    elements.generatePanel.classList.toggle('hidden');
    elements.aiBtn.classList.toggle('active', !isVisible);
    updatePanelState();
  }

  function toggleCodeSection() {
    const isVisible = !elements.codeSection.classList.contains('hidden');
    elements.codeSection.classList.toggle('hidden');
    elements.codeBtn.classList.toggle('active', !isVisible);
    updatePanelState();
  }

  function toggleAlterSection() {
    const isVisible = !elements.alterSection.classList.contains('hidden');
    elements.alterSection.classList.toggle('hidden');
    elements.alterToggleBtn.classList.toggle('active', !isVisible);
    updatePanelState();
  }

  function toggleContextSection() {
    if (!elements.contextDisplay.textContent?.trim()) return;
    elements.contextDisplay.classList.toggle('collapsed');
    elements.contextArrow.classList.toggle('collapsed');
  }

  function showContextSection() {
    elements.contextSection.classList.remove('hidden');
  }

  function toggleAllPanels() {
    if (panelsVisible) {
      // Save current states before hiding
      savedCodeState = !elements.codeSection.classList.contains('hidden');
      savedGenerateState = !elements.generatePanel.classList.contains('hidden');
      savedAlterState = !elements.alterSection.classList.contains('hidden');
      // Hide all
      elements.codeSection.classList.add('hidden');
      elements.generatePanel.classList.add('hidden');
      elements.alterSection.classList.add('hidden');
      elements.codeBtn.classList.remove('active');
      elements.aiBtn.classList.remove('active');
      elements.alterToggleBtn.classList.remove('active');
    } else {
      // Restore saved states
      if (savedCodeState) {
        elements.codeSection.classList.remove('hidden');
        elements.codeBtn.classList.add('active');
      }
      if (savedGenerateState) {
        elements.generatePanel.classList.remove('hidden');
        elements.aiBtn.classList.add('active');
      }
      if (savedAlterState) {
        elements.alterSection.classList.remove('hidden');
        elements.alterToggleBtn.classList.add('active');
      }
    }
    panelsVisible = !panelsVisible;
    updatePanelState();
  }

  function toggleBackgroundVis() {
    const state = deps.getState();
    const newStyle = state.currentVizStyle === 'none' ? 'orbs' : 'none';

    // Update dropdown active state
    elements.vizButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viz === newStyle);
    });
    deps.setState({ currentVizStyle: newStyle });
    elements.vizBtn.classList.toggle('active', newStyle !== 'none');

    deps.updateShaderStyle(newStyle);
  }

  function cycleBackgroundViz(direction: number) {
    const state = deps.getState();
    const currentIndex = VIZ_STYLES.indexOf(state.currentVizStyle as typeof VIZ_STYLES[number]);
    let newIndex = currentIndex + direction;

    // Wrap around
    if (newIndex < 0) newIndex = VIZ_STYLES.length - 1;
    if (newIndex >= VIZ_STYLES.length) newIndex = 0;

    const newStyle = VIZ_STYLES[newIndex];

    // Update dropdown active state
    elements.vizButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.viz === newStyle);
    });
    deps.setState({ currentVizStyle: newStyle });
    elements.vizBtn.classList.toggle('active', newStyle !== 'none');

    deps.updateShaderStyle(newStyle);
  }

  function toggleAudioVisualizers() {
    const state = deps.getState();
    const newEnabled = !state.audioVizEnabled;
    deps.setState({ audioVizEnabled: newEnabled });
    elements.audioVizBtn.classList.toggle('active', newEnabled);
    elements.spectrumCanvas.classList.toggle('hidden', !newEnabled);
    elements.scopeCanvas.classList.toggle('hidden', !newEnabled);
    elements.pianorollCanvas.classList.toggle('hidden', !newEnabled);

    // Actually start/stop the animation loops (not just CSS hide)
    if (!state.isMobile) {
      if (newEnabled && state.isPlaying) {
        deps.getCustomScope?.()?.start();
        deps.getCustomSpectrum?.()?.start();
      } else {
        deps.getCustomScope?.()?.stop();
        deps.getCustomSpectrum?.()?.stop();
      }
    }
  }

  function toggleVisualsOnlyMode() {
    const state = deps.getState();

    if (!visualsOnlyMode) {
      // Entering visuals-only mode - save states first
      savedCodeState = !elements.codeSection.classList.contains('hidden');
      savedGenerateState = !elements.generatePanel.classList.contains('hidden');
      savedAlterState = !elements.alterSection.classList.contains('hidden');
      savedAudioVizState = state.audioVizEnabled;
      savedVizStyle = state.currentVizStyle;

      // Hide all UI panels
      elements.codeSection.classList.add('hidden');
      elements.generatePanel.classList.add('hidden');
      elements.alterSection.classList.add('hidden');
      elements.codeBtn.classList.remove('active');
      elements.aiBtn.classList.remove('active');
      elements.alterToggleBtn.classList.remove('active');
      panelsVisible = false;

      // Enable audio visualizers
      deps.setState({ audioVizEnabled: true });
      elements.audioVizBtn.classList.add('active');
      elements.spectrumCanvas.classList.remove('hidden');
      elements.scopeCanvas.classList.remove('hidden');
      elements.pianorollCanvas.classList.remove('hidden');

      // Set background to "glowing orbs"
      if (state.currentVizStyle !== 'orbs') {
        elements.vizButtons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.viz === 'orbs');
        });
        deps.setState({ currentVizStyle: 'orbs' });
        elements.vizBtn.classList.add('active');
        deps.updateShaderStyle('orbs');
      }

      visualsOnlyMode = true;
    } else {
      // Exiting visuals-only mode - restore saved states
      if (savedCodeState) {
        elements.codeSection.classList.remove('hidden');
        elements.codeBtn.classList.add('active');
      }
      if (savedGenerateState) {
        elements.generatePanel.classList.remove('hidden');
        elements.aiBtn.classList.add('active');
      }
      if (savedAlterState) {
        elements.alterSection.classList.remove('hidden');
        elements.alterToggleBtn.classList.add('active');
      }
      panelsVisible = savedCodeState || savedGenerateState || savedAlterState;

      // Restore audio visualizers state
      deps.setState({ audioVizEnabled: savedAudioVizState });
      elements.audioVizBtn.classList.toggle('active', savedAudioVizState);
      elements.spectrumCanvas.classList.toggle('hidden', !savedAudioVizState);
      elements.scopeCanvas.classList.toggle('hidden', !savedAudioVizState);
      elements.pianorollCanvas.classList.toggle('hidden', !savedAudioVizState);

      // Restore background viz style
      if (savedVizStyle !== state.currentVizStyle) {
        elements.vizButtons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.viz === savedVizStyle);
        });
        deps.setState({ currentVizStyle: savedVizStyle });
        elements.vizBtn.classList.toggle('active', savedVizStyle !== 'none');
        deps.updateShaderStyle(savedVizStyle);
      }

      visualsOnlyMode = false;
    }
    updatePanelState();
  }

  function handleBankChange() {
    const newBank = elements.bankSelect.value;
    const state = deps.getState();
    const wasPlaying = state.isPlaying;

    // Stop current playback
    if (state.isPlaying) {
      deps.stopCode();
    }

    // Get current code and update the bank
    let code = deps.getCode();
    let codeChanged = false;

    if (newBank) {
      if (code.match(/\.bank\("[^"]*"\)/)) {
        // Replace existing bank with new one
        code = code.replace(/\.bank\("[^"]*"\)/, `.bank("${newBank}")`);
        codeChanged = true;
      } else {
        // No .bank() exists - try to add one to the inner drum stack
        const drumStackPattern = /\)(\s*,\s*\n\s*)(\/\/ Synths|note\()/;
        if (code.match(drumStackPattern)) {
          code = code.replace(drumStackPattern, `).bank("${newBank}")$1$2`);
          codeChanged = true;
        }
      }
    } else {
      // Remove .bank() if "Drum machine" (no bank) is selected
      if (code.match(/\.bank\("[^"]*"\)/)) {
        code = code.replace(/\.bank\("[^"]*"\)/, '');
        codeChanged = true;
      }
    }

    // Update the code in editor if changed
    if (codeChanged) {
      deps.setCode(code);
    }

    // Update the stored bank name
    deps.setLastBankName(newBank);

    // Restart playback if it was playing
    if (wasPlaying) {
      deps.playCode();
    }
  }

  function toggleShortcutsPopup() {
    elements.shortcutsPopup.classList.toggle('hidden');
    elements.tokenPopup.classList.add('hidden');
    elements.kofiPopup.classList.add('hidden');
  }

  function toggleTokenPopup() {
    elements.tokenPopup.classList.toggle('hidden');
    elements.shortcutsPopup.classList.add('hidden');
    elements.kofiPopup.classList.add('hidden');
  }

  function toggleKofiPopup() {
    elements.kofiPopup.classList.toggle('hidden');
    elements.kofiOverlay.classList.toggle('hidden');
    elements.shortcutsPopup.classList.add('hidden');
    elements.tokenPopup.classList.add('hidden');
  }

  function closePopupsOnOutsideClick(e: Event) {
    if (!elements.shortcutsPopup.classList.contains('hidden') &&
        !elements.shortcutsPopup.contains(e.target as Node) &&
        !elements.infoBtn.contains(e.target as Node)) {
      elements.shortcutsPopup.classList.add('hidden');
    }
    if (!elements.tokenPopup.classList.contains('hidden') &&
        !elements.tokenPopup.contains(e.target as Node) &&
        !elements.statsBtn.contains(e.target as Node)) {
      elements.tokenPopup.classList.add('hidden');
    }
    if (!elements.kofiPopup.classList.contains('hidden') &&
        !elements.kofiPopup.contains(e.target as Node) &&
        !elements.kofiBtn.contains(e.target as Node)) {
      elements.kofiPopup.classList.add('hidden');
      elements.kofiOverlay.classList.add('hidden');
    }
  }

  function closePopupsOnEscape() {
    elements.shortcutsPopup.classList.add('hidden');
    elements.tokenPopup.classList.add('hidden');
    elements.kofiPopup.classList.add('hidden');
    elements.kofiOverlay.classList.add('hidden');
  }

  return {
    showToast,
    toggleGeneratePanel,
    toggleCodeSection,
    toggleAlterSection,
    toggleContextSection,
    showContextSection,
    toggleAllPanels,
    toggleBackgroundVis,
    cycleBackgroundViz,
    toggleAudioVisualizers,
    toggleVisualsOnlyMode,
    handleBankChange,
    syncAlterPlayBtn,
    updatePanelState,
    toggleShortcutsPopup,
    toggleTokenPopup,
    toggleKofiPopup,
    closePopupsOnOutsideClick,
    closePopupsOnEscape,
  };
}
