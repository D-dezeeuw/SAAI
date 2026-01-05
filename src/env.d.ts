/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  readonly MODEL_CONTEXT: string;
  readonly MODEL_CODEGEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
