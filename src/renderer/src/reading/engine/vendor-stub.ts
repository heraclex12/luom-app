// Empty stub that replaces the top-level `import 'construct-style-sheets-polyfill'` in foliate `fixed-layout.js`.
//
// That side-effect import polyfills `adoptedStyleSheets` for old browsers; Electron's Chromium supports it
// natively, but the bundler still needs a resolvable module, so we alias it here (see electron.vite.config.ts).
// The `@pdfjs/pdf.min.mjs` alias points at the real pdfjs and no longer uses this file.
export {}
