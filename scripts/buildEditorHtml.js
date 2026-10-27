const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'src', 'assets', 'editor', 'editorBundle.js');
const outputPath = path.join(__dirname, '..', 'src', 'assets', 'editor', 'editorHtml.ts');

const bundleJs = fs.readFileSync(bundlePath, 'utf8');

const css = `
  * {
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  /* ── Themes ─────────────────────────────────────────────── */
  body, body.theme-cream {
    background-color: #FAF9F5;
    color: #111111;
  }
  body.theme-sepia {
    background-color: #FBF0D9;
    color: #2D241E;
  }
  body.theme-sepia .ProseMirror blockquote {
    background: #F3E2C4;
    border-color: #2D241E;
    color: #2D241E;
  }
  body.theme-sepia .ProseMirror table {
    background: #FFFBF0;
    border-color: #2D241E;
  }
  body.theme-sepia .ProseMirror th {
    background-color: #EBD6A7;
    border-color: #2D241E;
  }
  body.theme-sepia .ProseMirror td {
    border-color: #2D241E;
  }

  body.theme-dark {
    background-color: #18181B;
    color: #F4F4F5;
  }
  body.theme-dark .ProseMirror h1,
  body.theme-dark .ProseMirror h2,
  body.theme-dark .ProseMirror h3 {
    color: #FAFAFA;
    border-color: #52525B;
  }
  body.theme-dark .ProseMirror hr {
    border-top-color: #52525B;
  }
  body.theme-dark .ProseMirror blockquote {
    background: #27272A;
    border-color: #F4F4F5;
    color: #E4E4E7;
  }
  body.theme-dark .ProseMirror table {
    background: #27272A;
    border-color: #52525B;
  }
  body.theme-dark .ProseMirror th {
    background-color: #3F3F46;
    color: #FFFFFF;
    border-color: #52525B;
  }
  body.theme-dark .ProseMirror td {
    border-color: #52525B;
    color: #F4F4F5;
  }
  body.theme-dark .ProseMirror img {
    border-color: #52525B;
    box-shadow: 3px 3px 0 #52525B;
  }
  body.theme-dark .ProseMirror a {
    color: #60A5FA;
  }

  #editor {
    min-height: 100vh;
    padding: 32px 36px 140px 36px;
    margin: 0 auto;
    max-width: 840px;
    outline: none;
    cursor: text;
    transition: max-width 0.2s ease;
  }

  .ProseMirror {
    outline: none;
    min-height: calc(100vh - 180px);
  }
  .ProseMirror p {
    margin: 0 0 1rem 0;
    line-height: 1.75;
  }
  .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
    font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
    font-weight: 900;
    margin-top: 1.6rem;
    margin-bottom: 0.75rem;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }
  .ProseMirror h1 { font-size: 2rem; border-bottom: 3px solid currentColor; padding-bottom: 4px; }
  .ProseMirror h2 { font-size: 1.5rem; }
  .ProseMirror h3 { font-size: 1.2rem; }
  .ProseMirror strong {
    font-weight: 800;
  }
  .ProseMirror em {
    font-style: italic;
  }
  .ProseMirror u {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }
  .ProseMirror s {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
  }
  .ProseMirror mark {
    background-color: #FEF08A;
    color: #111111;
    padding: 2px 4px;
    border-radius: 2px;
  }
  .ProseMirror blockquote {
    border-left: 4px solid #111111;
    background: #F3EFE6;
    padding: 10px 16px;
    margin: 1.2rem 0;
    font-style: italic;
    border-radius: 0 4px 4px 0;
  }
  .ProseMirror hr {
    border: none;
    border-top: 3px solid #111111;
    margin: 2rem 0;
  }
  .ProseMirror ul, .ProseMirror ol {
    padding-left: 1.6rem;
    margin: 0 0 1rem 0;
  }
  .ProseMirror li {
    margin-bottom: 0.35rem;
  }
  .ProseMirror ul[data-type="taskList"] {
    list-style: none;
    padding: 0;
  }
  .ProseMirror ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .ProseMirror ul[data-type="taskList"] li > label {
    user-select: none;
    margin-top: 4px;
  }
  .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
    accent-color: #FACC15;
    border: 2px solid #111111;
  }
  .ProseMirror img {
    max-width: 100%;
    height: auto;
    border: 2px solid #111111;
    border-radius: 8px;
    box-shadow: 3px 3px 0 #111111;
    display: block;
    margin: 1.5rem auto;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .ProseMirror img:hover {
    transform: translateY(-2px);
    box-shadow: 4px 5px 0 #111111;
  }
  .ProseMirror img.img-load-error {
    min-height: 48px;
    background-color: #FEE2E2;
    border-color: #EF4444;
    border-style: dashed;
  }
  .ProseMirror table {
    border-collapse: collapse;
    width: 100%;
    margin: 1.5rem 0;
    border: 2px solid #111111;
    background: #FFFFFF;
  }
  .ProseMirror th, .ProseMirror td {
    border: 1.5px solid #111111;
    padding: 8px 12px;
    text-align: left;
    vertical-align: top;
  }
  .ProseMirror th {
    background-color: #FEF08A;
    color: #111111;
    font-weight: 800;
  }
  .ProseMirror a {
    color: #2563EB;
    text-decoration: underline;
    font-weight: 600;
    cursor: pointer;
  }
  .ProseMirror p.is-editor-empty:first-child::before {
    color: #9CA3AF;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
    font-style: italic;
  }
  ::selection {
    background: #BFDBFE;
    color: #111111;
  }

  /* ── Focus Mode ─────────────────────────────────────────── */
  body.focus-mode .ProseMirror > * {
    opacity: 0.22;
    transition: opacity 0.2s ease, filter 0.2s ease;
    filter: blur(0.3px);
  }
  body.focus-mode .ProseMirror > *.has-focus {
    opacity: 1;
    filter: none;
  }

  /* ── Slash Menu Popup ───────────────────────────────────── */
  .slash-menu {
    position: absolute;
    display: none;
    z-index: 10000;
    background: #FFFFFF;
    border: 2px solid #111111;
    border-radius: 6px;
    box-shadow: 4px 4px 0 #111111;
    width: 250px;
    max-height: 290px;
    overflow-y: auto;
    padding: 4px;
    font-family: 'DM Sans', sans-serif;
  }
  .slash-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }
  .slash-item.active, .slash-item:hover {
    background-color: #FEF08A;
  }
  .slash-item-icon {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 1.5px solid #111111;
    background: #FAF9F5;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 900;
    color: #111111;
    flex-shrink: 0;
  }
  .slash-item-text {
    flex: 1;
    min-width: 0;
  }
  .slash-item-title {
    font-size: 13px;
    font-weight: 800;
    color: #111111;
    line-height: 1.2;
  }
  .slash-item-desc {
    font-size: 10px;
    color: #666666;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .slash-empty {
    padding: 12px;
    text-align: center;
    font-size: 12px;
    color: #888888;
    font-style: italic;
  }

  /* ── Phase 3: Chips & Footnotes ─────────────────────────── */
  .wiki-link-chip {
    display: inline-flex;
    align-items: center;
    background-color: #FEF08A;
    color: #111111;
    border: 1.5px solid #111111;
    border-radius: 4px;
    padding: 1px 6px;
    margin: 0 2px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    user-select: none;
    box-shadow: 1.5px 1.5px 0 #111111;
    transition: transform 0.1s ease, background-color 0.1s ease;
    vertical-align: baseline;
  }
  .wiki-link-chip:hover {
    background-color: #FDE047;
    transform: translateY(-1px);
  }

  .mention-chip {
    display: inline-flex;
    align-items: center;
    background-color: #BAE6FD;
    color: #0369A1;
    border: 1.5px solid #111111;
    border-radius: 4px;
    padding: 1px 6px;
    margin: 0 2px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    user-select: none;
    box-shadow: 1.5px 1.5px 0 #111111;
    transition: transform 0.1s ease, background-color 0.1s ease;
    vertical-align: baseline;
  }
  .mention-chip:hover {
    background-color: #7DD3FC;
    transform: translateY(-1px);
  }

  .footnote-ref {
    display: inline-block;
    background-color: #FCE7F3;
    color: #9D174D;
    border: 1px solid #111111;
    border-radius: 3px;
    padding: 0 3px;
    margin: 0 2px;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
    user-select: none;
    vertical-align: super;
    transition: background-color 0.15s ease, transform 0.15s ease;
  }
  .footnote-ref:hover {
    background-color: #F472B6;
    color: #FFFFFF;
    transform: scale(1.1);
  }
  .footnote-ref.footnote-highlight {
    background-color: #FACC15 !important;
    color: #111111 !important;
    box-shadow: 0 0 0 3px #F59E0B;
  }

  /* Dark mode overrides for chips */
  body.theme-dark .wiki-link-chip {
    background-color: #854D0E;
    color: #FEF08A;
    border-color: #FDE047;
    box-shadow: 1.5px 1.5px 0 #FDE047;
  }
  body.theme-dark .mention-chip {
    background-color: #075985;
    color: #BAE6FD;
    border-color: #38BDF8;
    box-shadow: 1.5px 1.5px 0 #38BDF8;
  }
  body.theme-dark .footnote-ref {
    background-color: #831843;
    color: #FBCFE8;
    border-color: #F472B6;
  }
  body.theme-dark .slash-menu {
    background: #27272A;
    border-color: #52525B;
    box-shadow: 4px 4px 0 #52525B;
  }
  body.theme-dark .slash-item-icon {
    background: #3F3F46;
    border-color: #52525B;
    color: #FAFAFA;
  }
  body.theme-dark .slash-item-title {
    color: #FAFAFA;
  }
  body.theme-dark .slash-item-desc {
    color: #A1A1AA;
  }
  body.theme-dark .slash-item.active, body.theme-dark .slash-item:hover {
    background-color: #3F3F46;
  }

  /* ── In-Editor Image Lightbox ────────────────────────────── */
  #editor-lightbox {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999999;
    display: none;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 120ms ease;
    user-select: none;
  }
  #editor-lightbox.active {
    display: flex;
    opacity: 1;
  }
  .lightbox-close-btn {
    position: absolute;
    top: 16px;
    right: 20px;
    width: 36px;
    height: 36px;
    background: #FFFFFF;
    border: 2px solid #111111;
    border-radius: 4px;
    box-shadow: 2px 2px 0 #111111;
    font-weight: 900;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #111111;
    z-index: 1000001;
  }
  .lightbox-close-btn:hover {
    background: #FEF08A;
  }
  .lightbox-img-wrapper {
    position: relative;
    max-width: 90vw;
    max-height: 88vh;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    z-index: 1000000;
  }
  .lightbox-img-wrapper:active {
    cursor: grabbing;
  }
  .lightbox-img-el {
    max-width: 90vw;
    max-height: 88vh;
    object-fit: contain;
    border: 2px solid #111111;
    border-radius: 8px;
    display: block;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .lightbox-placeholder-el {
    width: 280px;
    height: 280px;
    background: #E5E5E5;
    border: 2px solid #111111;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', sans-serif;
  }
  .lightbox-toolbar {
    position: absolute;
    bottom: 24px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #FFFFFF;
    border: 2px solid #111111;
    border-radius: 6px;
    padding: 6px 8px;
    box-shadow: 3px 3px 0 #111111;
    z-index: 1000001;
  }
  .lightbox-toolbar button {
    height: 32px;
    min-width: 32px;
    border: 2px solid #111111;
    border-radius: 4px;
    background: #FAF9F5;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #111111;
    padding: 0 8px;
  }
  .lightbox-toolbar button:hover {
    background: #FEF08A;
  }
  .lightbox-zoom-label {
    min-width: 50px;
    text-align: center;
    font-family: 'DM Sans', sans-serif;
    font-weight: 800;
    font-size: 13px;
    color: #111111;
  }
  .lightbox-reset-btn {
    background: #FEF08A !important;
    font-size: 11px !important;
    padding: 0 10px !important;
  }
`;

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apollonography Editor</title>
  <style>${css}</style>
</head>
<body class="theme-cream">
  <div id="editor"></div>
  <script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}</script>
</body>
</html>`;

const tsModuleContent = `/**
 * Auto-generated self-contained offline TipTap WYSIWYG editor bundle
 * Bundle size: ${(bundleJs.length / 1024).toFixed(1)} KB
 */

export const EDITOR_HTML = ${JSON.stringify(htmlContent)};
`;

fs.writeFileSync(outputPath, tsModuleContent, 'utf8');
console.log('Successfully generated editorHtml.ts (' + (htmlContent.length / 1024).toFixed(1) + ' KB)');
