/**
 * AI Code Generation, Alteration, and Evolution
 * Handles all LLM-based code operations
 */

import { EVOLUTION_INTERVAL_MS } from '../config/constants';
import { trackTokens } from '../utils/tokenTracking';
import type { TokenUsage } from '../types';

export interface AIElements {
  promptInput: HTMLInputElement;
  alterInput: HTMLInputElement;
  generateBtn: HTMLButtonElement;
  alterBtn: HTMLButtonElement;
  evolveBtn: HTMLButtonElement;
  genreSelect: HTMLSelectElement;
  bankSelect: HTMLSelectElement;
  contextDisplay: HTMLElement;
}

export interface AIManagerDeps {
  elements: AIElements;
  getCode: () => string;
  setCode: (code: string) => void;
  getState: () => {
    isPlaying: boolean;
    isPaused: boolean;
    lastEnrichedContext: string;
    lastGenreContext: string;
    lastBankName: string;
  };
  setState: (updates: Partial<{
    lastEnrichedContext: string;
    lastGenreContext: string;
    lastBankName: string;
  }>) => void;
  stopCode: () => void;
  showContextSection: () => void;
}

export interface AIManager {
  generateCode: () => Promise<void>;
  alterCode: () => Promise<void>;
  evolveCode: () => Promise<void>;
  toggleEvolution: () => void;
  stopEvolution: () => void;
  isEvolving: () => boolean;
}

export function createAIManager(deps: AIManagerDeps): AIManager {
  const { elements } = deps;

  // Evolution state
  let evolving = false;
  let evolveInterval: ReturnType<typeof setInterval> | null = null;

  async function generateCode() {
    const message = elements.promptInput.value.trim();
    if (!message) {
      return;
    }

    const state = deps.getState();

    // Stop any currently playing song before generating new code
    if (state.isPlaying || state.isPaused) {
      deps.stopCode();
    }

    elements.generateBtn.disabled = true;
    elements.contextDisplay.textContent = 'Generating context...';
    elements.contextDisplay.className = 'loading';
    deps.setCode('// Generating...');

    // Fetch genre template if selected
    let genreContext = '';
    const selectedGenre = elements.genreSelect.value;
    if (selectedGenre) {
      try {
        const genreResponse = await fetch(`/genres/strudel-${selectedGenre}-template.md`);
        if (genreResponse.ok) {
          genreContext = await genreResponse.text();
          deps.setState({ lastGenreContext: genreContext });
        }
      } catch (e) {
        console.warn('Failed to load genre template:', e);
      }
    }

    // Get selected bank and store it for alter/evolve operations
    const bankName = elements.bankSelect.value;
    deps.setState({ lastBankName: bankName });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, currentCode: deps.getCode(), genreContext, bankName })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ') && eventType) {
            const data = JSON.parse(line.slice(6));

            if (eventType === 'stage1') {
              deps.setState({ lastEnrichedContext: data.enrichedPrompt });
              elements.contextDisplay.textContent = data.enrichedPrompt;
              elements.contextDisplay.className = '';
              deps.showContextSection();
              deps.setCode('// Generating code...');
            } else if (eventType === 'stage2') {
              deps.setCode(data.code);
            } else if (eventType === 'done') {
              if (data.usage) {
                trackTokens(data.usage as TokenUsage);
              }
            } else if (eventType === 'error') {
              throw new Error(data.error);
            }
            eventType = '';
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      deps.setCode(`// Error: ${msg}`);
      elements.contextDisplay.className = '';
    } finally {
      elements.generateBtn.disabled = false;
    }
  }

  async function alterCode() {
    const alterRequest = elements.alterInput.value.trim();
    if (!alterRequest) {
      return;
    }

    const currentCode = deps.getCode();
    if (!currentCode) {
      return;
    }

    const state = deps.getState();

    elements.alterBtn.disabled = true;
    elements.alterBtn.textContent = '...';

    try {
      const response = await fetch('/api/alter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alterRequest,
          currentCode,
          enrichedContext: state.lastEnrichedContext,
          genreContext: state.lastGenreContext,
          bankName: state.lastBankName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Alter failed');
      }

      deps.setCode(data.code);
      elements.alterInput.value = '';

      // Track token usage
      if (data.usage) {
        trackTokens(data.usage as TokenUsage);
      }

    } catch (error) {
      console.error('Alter error:', error);
    } finally {
      elements.alterBtn.disabled = false;
      elements.alterBtn.textContent = 'Go!';
    }
  }

  async function evolveCode() {
    const currentCode = deps.getCode();
    if (!currentCode) {
      return;
    }

    const state = deps.getState();

    try {
      const response = await fetch('/api/evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentCode,
          enrichedContext: state.lastEnrichedContext,
          genreContext: state.lastGenreContext,
          bankName: state.lastBankName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Evolution failed');
      }

      deps.setCode(data.code);

      // Track token usage
      if (data.usage) {
        trackTokens(data.usage as TokenUsage);
      }

    } catch (error) {
      console.error('Evolution error:', error);
    }
  }

  function toggleEvolution() {
    evolving = !evolving;
    elements.evolveBtn.classList.toggle('active', evolving);

    if (evolving) {
      // Immediately trigger one evolution
      evolveCode();
      // Then continue at configured interval
      evolveInterval = setInterval(evolveCode, EVOLUTION_INTERVAL_MS);
    } else {
      if (evolveInterval) {
        clearInterval(evolveInterval);
        evolveInterval = null;
      }
    }
  }

  function stopEvolution() {
    if (evolving) {
      evolving = false;
      elements.evolveBtn.classList.remove('active');
      if (evolveInterval) {
        clearInterval(evolveInterval);
        evolveInterval = null;
      }
    }
  }

  function isEvolvingFn() {
    return evolving;
  }

  return {
    generateCode,
    alterCode,
    evolveCode,
    toggleEvolution,
    stopEvolution,
    isEvolving: isEvolvingFn,
  };
}
