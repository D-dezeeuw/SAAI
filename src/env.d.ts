/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  readonly MODEL_CONTEXT: string;
  readonly MODEL_CODEGEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Strudel module declarations
declare module '@strudel/web' {
  export function initStrudel(config: { prebake: () => Promise<void> }): Promise<import('./lib/types').StrudelRepl>;
  export function evaluate(code: string): Promise<unknown>;
  export function hush(): void;
  export function getAudioContext(): AudioContext | null;
  export function getAnalyserById(id: string): AnalyserNode | null;
}

declare module '@strudel/draw' {
  export function cleanupDraw(full: boolean): void;
  export class Framer {
    constructor(callback: () => void, onError?: (err: unknown) => void);
    start(): void;
    stop(): void;
  }
}

declare module '@strudel/codemirror' {
  export function sliderWithID(id: string, value: number, min: number, max: number): number;
  export function slider(value: number, min: number, max: number): number;
}
