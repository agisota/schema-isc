// Headless smoke test (jsdom): eval the built bundle with DOM globals + a fetch
// stub serving public/data, then assert the app mounts and renders stage tabs.
// Not a substitute for a real browser, but catches ESM/runtime mount errors.
import { JSDOM } from "jsdom";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distDir = "dist";
const assetFile = readdirSync(join(distDir, "assets")).find(f => f.endsWith(".js"));
const bundle = readFileSync(join(distDir, "assets", assetFile), "utf-8");

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="root"></div></body></html>`, {
  url: "https://go.buildworth.org/visual-lab/",
  pretendToBeVisual: true,
});
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
for (const k of ["HTMLElement", "Element", "Node", "SVGElement", "MutationObserver",
                 "getComputedStyle", "DOMParser", "Event", "CustomEvent", "NodeList"]) {
  if (window[k] !== undefined) globalThis[k] = window[k];
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.ResizeObserver = window.ResizeObserver;
window.scrollTo = () => {};

// fetch stub: serve /visual-lab/data/* from public/data
globalThis.fetch = async (url) => {
  const u = String(url).replace(/^https?:\/\/[^/]+/, "");
  const m = u.match(/\/?(?:visual-lab\/)?data\/(.+)$/);
  if (!m) throw new Error("unexpected fetch: " + url);
  const body = readFileSync(join("public/data", m[1]), "utf-8");
  return { ok: true, json: async () => JSON.parse(body), text: async () => body };
};

const errors = [];
window.addEventListener("error", (e) => errors.push(e.error?.message || e.message));
const origError = console.error;
console.error = (...a) => { errors.push(a.join(" ")); origError(...a); };

// Evaluate the bundle as a module.
const blob = "data:text/javascript;base64," + Buffer.from(bundle).toString("base64");
await import(blob);

// Allow async load + render to settle.
await new Promise(r => setTimeout(r, 800));

const root = document.getElementById("root");
const html = root.innerHTML;
const checks = {
  mounted: root.childElementCount > 0,
  hasStageTab: /Этап\s*1/.test(html),
  stage5Cadastre: /Кадастров|Регистрация прав|Выписка/.test(html),
  conditionNodesVisible: /ЭЛЕКТРОСНАБЖЕНИЕ|ТЕПЛО|ВОДООТВЕДЕНИЕ/.test(html),
  documentNodesVisible: /Перечень документов|Сбор обосновывающих/.test(html),
  noFatalErrors: errors.length === 0,
};
console.log("\n=== SMOKE RESULTS ===");
for (const [k, v] of Object.entries(checks)) console.log(`  ${v ? "PASS" : "FAIL"}  ${k}`);
console.log("  rendered HTML length:", html.length);
if (errors.length) { console.log("  errors:"); errors.slice(0, 8).forEach(e => console.log("   - " + e)); }
process.exit(Object.values(checks).every(Boolean) ? 0 : 1);
