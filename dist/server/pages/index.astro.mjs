import { e as createComponent, f as createAstro, k as renderHead, l as renderSlot, r as renderTemplate, n as renderComponent, m as maybeRenderHead, o as renderScript } from '../chunks/astro/server_BCDDxPbG.mjs';
import 'piccolore';
import 'clsx';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><title>${title}</title><link rel="stylesheet" href="/styles.css">${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "/Users/ddezeeuw/Projects/2026/strudel_ai/src/layouts/Layout.astro", void 0);

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Strudel AI" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container"> <h1>Strudel AI</h1> <div class="input-section"> <div class="input-group"> <input type="text" id="prompt-input" placeholder="Describe the music you want... (e.g., 'funky drum beat with hi-hats')"> <button id="generate-btn">Generate</button> </div> </div> <div class="context-section"> <div class="context-header">AI Context (Stage 1 output)</div> <pre id="context-display">// The enriched prompt will appear here...</pre> </div> <div class="controls"> <button id="play-btn">▶ Play</button> <button id="stop-btn">■ Stop</button> <button id="reset-btn">↺ Reset</button> </div> <div class="visualizations"> <div class="viz-panel"> <div class="viz-header">Pianoroll</div> <canvas id="pianoroll-canvas"></canvas> </div> <div class="viz-panel"> <div class="viz-header">Spectrum</div> <canvas id="spectrum-canvas"></canvas> </div> </div> <div class="code-section"> <div class="code-header">Strudel Code (editable)</div> <div id="code-editor-container"></div> </div> <div id="status"></div> </div> ${renderScript($$result2, "/Users/ddezeeuw/Projects/2026/strudel_ai/src/pages/index.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "/Users/ddezeeuw/Projects/2026/strudel_ai/src/pages/index.astro", void 0);

const $$file = "/Users/ddezeeuw/Projects/2026/strudel_ai/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
