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
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "SAAI - Strudel Augmented Artificial Intelligence" }, { "default": async ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="viz-background"> <canvas id="spectrum-canvas"></canvas> <canvas id="scope-canvas"></canvas> <canvas id="pianoroll-canvas"></canvas> <canvas id="shader-canvas"></canvas> </div>  <header class="header"> <h1 title="Strudel Augmented Artificial Intelligence">SAAI</h1> <div class="header-controls"> <button id="ai-btn" title="AI Generate">✦</button> <button id="code-btn" title="Code Editor" class="active">&lt;/&gt;</button> <button id="alter-toggle-btn" title="Alter Code" class="active">⚙</button> <span class="header-divider"></span> <button id="audio-viz-btn" title="Audio Visualizers" class="active">〰</button> <div class="viz-selector"> <button id="viz-btn" title="Background Effects" class="active">◎</button> <div id="viz-dropdown" class="viz-dropdown hidden"> <button data-viz="none">No vis</button> <button data-viz="orbs" class="active">Glowing Orbs</button> <button data-viz="stars">Stars</button> <button data-viz="trails">Flowing Trails</button> </div> </div> </div> </header>  <div class="container"> <div id="generate-panel" class="generate-panel hidden"> <div class="input-section"> <div class="input-group"> <select id="genre-select"> <option value="">No genre template</option> <option value="edm">EDM / House / Techno</option> <option value="dnb">Drum & Bass</option> <option value="hiphop-trap">Hip-Hop / Trap</option> <option value="acid">Acid</option> <option value="jazz">Jazz</option> </select> <select id="bank-select"> <option value="" selected>Drum kit</option> <option value="RolandTR909">Roland TR-909</option> <option value="RolandTR808">Roland TR-808</option> <option value="RolandTR707">Roland TR-707</option> <option value="LinnDrum">LinnDrum</option> <option value="AkaiLinn">Akai Linn</option> <option value="KorgM1">Korg M1</option> <option value="AlesisHR16">Alesis HR16</option> </select> <input type="text" id="prompt-input" placeholder="Describe the music you want... (e.g., 'funky drum beat with hi-hats')"> <button id="generate-btn">Generate</button> </div> </div> <div class="context-section"> <div class="context-header" id="context-header"> <span>AI Context (Stage 1 output)</span> <span class="context-arrow collapsed" id="context-arrow">▼</span> </div> <pre id="context-display" class="collapsed">// The enriched prompt will appear here...</pre> </div> </div> <div class="code-section"> <div id="code-editor-container"> <button id="stop-btn" title="Stop">■</button> <button id="play-btn" title="Play">▶</button> </div> <div class="alter-section"> <input type="text" id="alter-input" placeholder="Alter: e.g., 'add more reverb', 'make it faster', 'remove hi-hats'..."> <button id="alter-btn">Alter</button> <button id="evolve-btn" title="Auto-evolve the music">Evolve</button> </div> </div> </div>  <button id="info-btn" class="info-btn" title="Keyboard Shortcuts"> <span>i</span> </button>  <div id="shortcuts-popup" class="shortcuts-popup hidden"> <div class="shortcuts-header"> <span>Keyboard Shortcuts</span> <button id="shortcuts-close" class="shortcuts-close">&times;</button> </div> <div class="shortcuts-list"> <div class="shortcut-item"> <kbd>K</kbd> <span>Play / Stop</span> </div> <div class="shortcut-item"> <kbd>H</kbd> <span>Hide / Show UI</span> </div> <div class="shortcut-item"> <kbd>V</kbd> <span>Toggle Visualizers</span> </div> <div class="shortcut-item"> <kbd>B</kbd> <span>Toggle Background</span> </div> <div class="shortcut-item"> <kbd>A</kbd> <span>Toggle Visuals Only</span> </div> <div class="shortcut-item"> <kbd>&lt;</kbd> <span>Previous Background</span> </div> <div class="shortcut-item"> <kbd>&gt;</kbd> <span>Next Background</span> </div> </div> </div> ${renderScript($$result2, "/Users/ddezeeuw/Projects/2026/strudel_ai/src/pages/index.astro?astro&type=script&index=0&lang.ts")} ` })}`;
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
