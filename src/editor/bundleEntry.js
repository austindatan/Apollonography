import { Editor, Node } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

const sendToRN = (msg) => {
  try {
    const payload = JSON.stringify(msg);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(payload);
    } else if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
      window.chrome.webview.postMessage(payload);
    }
  } catch (err) {
    console.error('Error sending message to React Native:', err);
  }
};

/* ── Custom Phase 3 TipTap Nodes ─────────────────────────── */

const WikiLinkNode = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: '' },
      title: { default: '' },
      type: { default: 'entry' },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-link]',
        getAttrs: (element) => ({
          id: element.getAttribute('data-entity-id') || '',
          title: element.getAttribute('data-title') || element.textContent.replace(/^\[\[|\]\]$/g, ''),
          type: element.getAttribute('data-entity-type') || 'entry',
        }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        class: 'wiki-link-chip',
        'data-wiki-link': 'true',
        'data-entity-id': node.attrs.id,
        'data-entity-type': node.attrs.type,
        'data-title': node.attrs.title,
      },
      `[[${node.attrs.title}]]`,
    ];
  },
});

const MentionNode = Node.create({
  name: 'mentionTag',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: '' },
      title: { default: '' },
      type: { default: 'character' },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'span[data-mention-tag]',
        getAttrs: (element) => ({
          id: element.getAttribute('data-entity-id') || '',
          title: element.getAttribute('data-title') || element.textContent.replace(/^@/, ''),
          type: element.getAttribute('data-entity-type') || 'character',
        }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        class: 'mention-chip',
        'data-mention-tag': 'true',
        'data-entity-id': node.attrs.id,
        'data-entity-type': node.attrs.type,
        'data-title': node.attrs.title,
      },
      `@${node.attrs.title}`,
    ];
  },
});

const FootnoteNode = Node.create({
  name: 'footnoteRef',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,
  addAttributes() {
    return {
      id: { default: '' },
      number: { default: 1 },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'sup[data-footnote-ref]',
        getAttrs: (element) => ({
          id: element.getAttribute('data-footnote-id') || '',
          number: parseInt(element.getAttribute('data-footnote-number') || '1', 10),
        }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'sup',
      {
        ...HTMLAttributes,
        class: 'footnote-ref',
        'data-footnote-ref': 'true',
        'data-footnote-id': node.attrs.id,
        'data-footnote-number': node.attrs.number,
      },
      `[${node.attrs.number}]`,
    ];
  },
});

/* ── Outline Extraction ──────────────────────────────────── */

const extractOutline = (editorInstance) => {
  const headings = [];
  try {
    editorInstance.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          level: node.attrs.level || 1,
          text: node.textContent || 'Untitled Heading',
          pos,
        });
      }
    });
  } catch (e) {}
  return headings;
};

let debounceTimer = null;
const debounceChange = (doc, wordCount, characterCount, headings) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    sendToRN({
      type: 'change',
      doc,
      wordCount,
      characterCount,
      headings,
    });
  }, 250);
};

const sendSelection = (editorInstance) => {
  const activeMarks = {
    bold: editorInstance.isActive('bold'),
    italic: editorInstance.isActive('italic'),
    underline: editorInstance.isActive('underline'),
    strike: editorInstance.isActive('strike'),
    highlight: editorInstance.isActive('highlight'),
    code: editorInstance.isActive('code'),
    link: editorInstance.isActive('link'),
    textStyle: editorInstance.isActive('textStyle'),
    color: editorInstance.getAttributes('textStyle').color || null,
  };

  const activeNodes = {
    paragraph: editorInstance.isActive('paragraph'),
    heading1: editorInstance.isActive('heading', { level: 1 }),
    heading2: editorInstance.isActive('heading', { level: 2 }),
    heading3: editorInstance.isActive('heading', { level: 3 }),
    bulletList: editorInstance.isActive('bulletList'),
    orderedList: editorInstance.isActive('orderedList'),
    taskList: editorInstance.isActive('taskList'),
    blockquote: editorInstance.isActive('blockquote'),
    alignLeft: editorInstance.isActive({ textAlign: 'left' }),
    alignCenter: editorInstance.isActive({ textAlign: 'center' }),
    alignRight: editorInstance.isActive({ textAlign: 'right' }),
    alignJustify: editorInstance.isActive({ textAlign: 'justify' }),
    table: editorInstance.isActive('table'),
  };

  const selection = editorInstance.state.selection;
  const selectedText = editorInstance.state.doc.textBetween(selection.from, selection.to, ' ');
  const selectionWordCount = selectedText.trim() ? selectedText.trim().split(/\s+/).length : 0;

  sendToRN({
    type: 'selection',
    activeMarks,
    activeNodes,
    canUndo: editorInstance.can().undo(),
    canRedo: editorInstance.can().redo(),
    selectionWordCount,
  });
};

/* ── Focus Mode & Typewriter Scrolling ────────────────────── */
let focusModeActive = false;
let typewriterActive = false;

const updateFocusAndTypewriter = () => {
  if (!focusModeActive && !typewriterActive) return;

  const sel = window.getSelection();
  if (!sel || !sel.anchorNode) return;

  let node = sel.anchorNode;
  if (node.nodeType === 3) node = node.parentNode;

  const editorDom = document.getElementById('editor');
  const prosemirrorDom = editorDom ? editorDom.querySelector('.ProseMirror') : null;
  if (!prosemirrorDom) return;

  let currentBlock = node;
  while (currentBlock && currentBlock.parentNode && currentBlock.parentNode !== prosemirrorDom) {
    currentBlock = currentBlock.parentNode;
  }

  if (focusModeActive && currentBlock && currentBlock.parentNode === prosemirrorDom) {
    const children = prosemirrorDom.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i] === currentBlock) {
        children[i].classList.add('has-focus');
      } else {
        children[i].classList.remove('has-focus');
      }
    }
  }

  if (typewriterActive && currentBlock) {
    try {
      currentBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
  }
};

/* ── Find and Replace Engine ─────────────────────────────── */
let currentSearchMatches = [];
let currentSearchIndex = -1;
let currentSearchQuery = '';

const searchInDoc = (query, caseSensitive = false) => {
  currentSearchMatches = [];
  currentSearchIndex = -1;
  currentSearchQuery = query;

  if (!query) {
    sendToRN({ type: 'findResults', count: 0, index: -1 });
    return;
  }

  const doc = editor.state.doc;
  const q = caseSensitive ? query : query.toLowerCase();

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const text = caseSensitive ? node.text : node.text.toLowerCase();
      let index = text.indexOf(q);
      while (index !== -1) {
        currentSearchMatches.push({
          from: pos + index,
          to: pos + index + q.length,
        });
        index = text.indexOf(q, index + 1);
      }
    }
  });

  if (currentSearchMatches.length > 0) {
    currentSearchIndex = 0;
    highlightMatch(currentSearchIndex);
  }

  sendToRN({
    type: 'findResults',
    count: currentSearchMatches.length,
    index: currentSearchIndex,
  });
};

const highlightMatch = (idx) => {
  if (idx < 0 || idx >= currentSearchMatches.length) return;
  const match = currentSearchMatches[idx];
  editor.commands.setTextSelection({ from: match.from, to: match.to });
  const dom = editor.view.domAtPos(match.from);
  if (dom && dom.node) {
    const el = dom.node.nodeType === 1 ? dom.node : dom.node.parentElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

const nextMatch = () => {
  if (currentSearchMatches.length === 0) return;
  currentSearchIndex = (currentSearchIndex + 1) % currentSearchMatches.length;
  highlightMatch(currentSearchIndex);
  sendToRN({
    type: 'findResults',
    count: currentSearchMatches.length,
    index: currentSearchIndex,
  });
};

const prevMatch = () => {
  if (currentSearchMatches.length === 0) return;
  currentSearchIndex = (currentSearchIndex - 1 + currentSearchMatches.length) % currentSearchMatches.length;
  highlightMatch(currentSearchIndex);
  sendToRN({
    type: 'findResults',
    count: currentSearchMatches.length,
    index: currentSearchIndex,
  });
};

const replaceCurrent = (replaceText) => {
  if (currentSearchIndex < 0 || currentSearchIndex >= currentSearchMatches.length) return;
  const match = currentSearchMatches[currentSearchIndex];
  editor.chain().focus().insertContentAt({ from: match.from, to: match.to }, replaceText).run();
  searchInDoc(currentSearchQuery);
};

const replaceAllMatches = (replaceText) => {
  if (currentSearchMatches.length === 0) return;
  const sorted = [...currentSearchMatches].sort((a, b) => b.from - a.from);
  const chain = editor.chain().focus();
  for (const m of sorted) {
    chain.insertContentAt({ from: m.from, to: m.to }, replaceText);
  }
  chain.run();
  searchInDoc(currentSearchQuery);
};

/* ── Footnote Generation ─────────────────────────────────── */

const insertFootnoteAtCaret = () => {
  let count = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'footnoteRef') {
      count++;
    }
  });
  const nextNum = count + 1;
  const id = `fn-${Date.now().toString(36)}-${nextNum}`;
  editor.chain().focus().insertContent([
    { type: 'footnoteRef', attrs: { id, number: nextNum } },
    { type: 'text', text: ' ' },
  ]).run();
  sendToRN({ type: 'footnoteAdded', id, number: nextNum });
};

/* ── Autocomplete Menu Engine (Slash, Wiki, Mention) ──────── */

let projectEntities = [];

const SLASH_COMMANDS = [
  { id: 'h1', title: 'Heading 1', icon: 'H1', desc: 'Large narrative header', action: () => editor.chain().focus().setHeading({ level: 1 }).run() },
  { id: 'h2', title: 'Heading 2', icon: 'H2', desc: 'Medium section header', action: () => editor.chain().focus().setHeading({ level: 2 }).run() },
  { id: 'h3', title: 'Heading 3', icon: 'H3', desc: 'Small subsection header', action: () => editor.chain().focus().setHeading({ level: 3 }).run() },
  { id: 'wikilink', title: 'Wiki Link', icon: '[[ ]]', desc: 'Link to chronicle entry or chapter', action: () => setTimeout(() => showAutocomplete('wiki'), 10) },
  { id: 'mention', title: 'Mention Tag', icon: '@', desc: 'Tag character, place or faction', action: () => setTimeout(() => showAutocomplete('mention'), 10) },
  { id: 'footnote', title: 'Footnote', icon: '[¹]', desc: 'Insert numbered footnote citation', action: () => insertFootnoteAtCaret() },
  { id: 'bullet', title: 'Bullet List', icon: '• ≡', desc: 'Unordered point list', action: () => editor.chain().focus().toggleBulletList().run() },
  { id: 'ordered', title: 'Numbered List', icon: '1. ≡', desc: 'Sequential numbered list', action: () => editor.chain().focus().toggleOrderedList().run() },
  { id: 'task', title: 'Checklist', icon: '☑', desc: 'Todo checkbox task list', action: () => editor.chain().focus().toggleTaskList().run() },
  { id: 'quote', title: 'Blockquote', icon: '❝ ❞', desc: 'Distinguished quote block', action: () => editor.chain().focus().toggleBlockquote().run() },
  { id: 'divider', title: 'Divider', icon: '―', desc: 'Thick horizontal rule', action: () => editor.chain().focus().setHorizontalRule().run() },
  { id: 'table', title: 'Table', icon: '▦', desc: '3x3 ink grid table', action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: 'image', title: 'Image', icon: '🖼️', desc: 'Insert illustration or banner', action: () => window.triggerPickImage() },
];

let autocompleteMenuEl = null;
let autocompleteMode = null; // 'slash' | 'wiki' | 'mention' | null
let autocompleteSelectedIndex = 0;
let autocompleteFilteredList = [];
let autocompleteTriggerPos = null;

const createAutocompleteMenu = () => {
  if (autocompleteMenuEl) return autocompleteMenuEl;
  const menu = document.createElement('div');
  menu.id = 'slash-menu';
  menu.className = 'slash-menu';
  document.body.appendChild(menu);
  autocompleteMenuEl = menu;
  return menu;
};

const getEntityBadgeIcon = (type) => {
  switch (type) {
    case 'character': return '👤';
    case 'location': return '📍';
    case 'faction': return '🛡️';
    case 'chapter': return '📖';
    case 'lore': return '📜';
    default: return '✦';
  }
};

const renderAutocompleteMenu = () => {
  const menu = createAutocompleteMenu();
  if (autocompleteFilteredList.length === 0) {
    const emptyMsg = autocompleteMode === 'wiki'
      ? 'No matching chronicle entries'
      : autocompleteMode === 'mention'
      ? 'No matching characters or places'
      : 'No matching commands';
    menu.innerHTML = `<div class="slash-empty">${emptyMsg}</div>`;
    return;
  }

  menu.innerHTML = autocompleteFilteredList.map((item, idx) => {
    const icon = autocompleteMode === 'slash'
      ? item.icon
      : getEntityBadgeIcon(item.type);
    const title = item.title;
    const desc = item.desc || (item.category ? `Category: ${item.category}` : item.type ? `Type: ${item.type}` : '');

    return `
      <div class="slash-item ${idx === autocompleteSelectedIndex ? 'active' : ''}" data-idx="${idx}">
        <div class="slash-item-icon">${icon}</div>
        <div class="slash-item-text">
          <div class="slash-item-title">${title}</div>
          <div class="slash-item-desc">${desc}</div>
        </div>
      </div>
    `;
  }).join('');

  menu.querySelectorAll('.slash-item').forEach(el => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const idx = parseInt(el.getAttribute('data-idx') || '0', 10);
      executeAutocompleteItem(idx);
    });
  });
};

const showAutocomplete = (mode) => {
  autocompleteMode = mode;
  const menu = createAutocompleteMenu();
  const sel = editor.state.selection;
  autocompleteTriggerPos = sel.from;
  const coords = editor.view.coordsAtPos(sel.from);

  menu.style.display = 'block';
  menu.style.top = `${coords.bottom + window.scrollY + 6}px`;
  menu.style.left = `${Math.min(window.innerWidth - 270, Math.max(20, coords.left + window.scrollX))}px`;

  if (mode === 'slash') {
    autocompleteFilteredList = [...SLASH_COMMANDS];
  } else if (mode === 'wiki') {
    autocompleteFilteredList = [...projectEntities];
  } else if (mode === 'mention') {
    autocompleteFilteredList = projectEntities.filter(e =>
      e.type === 'character' || e.type === 'location' || e.type === 'faction' || !e.type
    );
    if (autocompleteFilteredList.length === 0) {
      autocompleteFilteredList = [...projectEntities];
    }
  }

  autocompleteSelectedIndex = 0;
  renderAutocompleteMenu();
};

const hideAutocomplete = () => {
  if (autocompleteMenuEl) {
    autocompleteMenuEl.style.display = 'none';
  }
  autocompleteMode = null;
  autocompleteTriggerPos = null;
};

const executeAutocompleteItem = (idx) => {
  const item = autocompleteFilteredList[idx];
  if (!item) return;

  const sel = editor.state.selection;

  if (autocompleteMode === 'slash') {
    if (autocompleteTriggerPos !== null) {
      editor.chain().focus().deleteRange({ from: autocompleteTriggerPos - 1, to: sel.to }).run();
    }
    item.action();
  } else if (autocompleteMode === 'wiki') {
    // Delete typed [[ and query text
    const deleteFrom = Math.max(0, (autocompleteTriggerPos || sel.from) - 2);
    editor.chain().focus().deleteRange({ from: deleteFrom, to: sel.to })
      .insertContent([
        { type: 'wikiLink', attrs: { id: item.id, title: item.title, type: item.type || 'entry' } },
        { type: 'text', text: ' ' },
      ]).run();
  } else if (autocompleteMode === 'mention') {
    // Delete typed @ and query text
    const deleteFrom = Math.max(0, (autocompleteTriggerPos || sel.from) - 1);
    editor.chain().focus().deleteRange({ from: deleteFrom, to: sel.to })
      .insertContent([
        { type: 'mentionTag', attrs: { id: item.id, title: item.title, type: item.type || 'character' } },
        { type: 'text', text: ' ' },
      ]).run();
  }

  hideAutocomplete();
  sendSelection(editor);
};

window.triggerPickImage = () => {
  try {
    let oldInput = document.getElementById('apollonography-image-picker');
    if (oldInput) {
      oldInput.remove();
    }

    const input = document.createElement('input');
    input.id = 'apollonography-image-picker';
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    input.style.left = '-9999px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
            sendSelection(editor);
          }
        };
        reader.readAsDataURL(file);
      }
      setTimeout(() => {
        try { input.remove(); } catch (e) {}
      }, 500);
    });

    try {
      window.focus();
      document.body.focus();
    } catch (e) {}

    input.click();
  } catch (err) {
    console.error('triggerPickImage error:', err);
  }
};

/* ── TipTap Editor Instance ───────────────────────────────── */
const element = document.getElementById('editor');

const editor = new Editor({
  element: element,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Underline,
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
    }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
    Placeholder.configure({
      placeholder: "Write your chronicle here... (Type '/' for commands, '[[' for wiki links, '@' for mentions)",
    }),
    CharacterCount,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    // Phase 3 custom nodes
    WikiLinkNode,
    MentionNode,
    FootnoteNode,
  ],
  editorProps: {
    handleDrop: (view, event, slice, moved) => {
      if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
            }
          };
          reader.readAsDataURL(file);
          return true;
        }
      }
      return false;
    },
    handlePaste: (view, event) => {
      const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
      if (items) {
        for (const item of items) {
          if (item.type && item.type.indexOf('image') === 0) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  editor.chain().focus().setImage({ src: reader.result }).run();
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
      }
      return false;
    },
    handleKeyDown: (view, event) => {
      // Find shortcuts: Ctrl+F, Ctrl+H
      if (event.ctrlKey && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        sendToRN({ type: 'openFind', replace: false });
        return true;
      }
      if (event.ctrlKey && (event.key === 'h' || event.key === 'H')) {
        event.preventDefault();
        sendToRN({ type: 'openFind', replace: true });
        return true;
      }

      // Autocomplete Menu Keyboard Navigation
      if (autocompleteMenuEl && autocompleteMenuEl.style.display !== 'none') {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          autocompleteSelectedIndex = (autocompleteSelectedIndex + 1) % autocompleteFilteredList.length;
          renderAutocompleteMenu();
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          autocompleteSelectedIndex = (autocompleteSelectedIndex - 1 + autocompleteFilteredList.length) % autocompleteFilteredList.length;
          renderAutocompleteMenu();
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault();
          executeAutocompleteItem(autocompleteSelectedIndex);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          hideAutocomplete();
          return true;
        }
      }

      // Trigger detection
      if (event.key === '/') {
        setTimeout(() => {
          showAutocomplete('slash');
        }, 10);
      } else if (event.key === '@') {
        setTimeout(() => {
          showAutocomplete('mention');
        }, 10);
      } else if (event.key === '[') {
        setTimeout(() => {
          const sel = editor.state.selection;
          if (sel.from >= 2) {
            const prevTwo = editor.state.doc.textBetween(sel.from - 2, sel.from, '');
            if (prevTwo === '[[') {
              showAutocomplete('wiki');
            }
          }
        }, 10);
      }

      return false;
    },
  },
  content: {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  },
  onUpdate: ({ editor: ed }) => {
    const doc = ed.getJSON();
    const wordCount = ed.storage.characterCount.words();
    const characterCount = ed.storage.characterCount.characters();
    const headings = extractOutline(ed);
    debounceChange(doc, wordCount, characterCount, headings);
    updateFocusAndTypewriter();

    // Check if autocomplete filter needs update
    if (autocompleteMenuEl && autocompleteMenuEl.style.display !== 'none' && autocompleteTriggerPos !== null) {
      const sel = ed.state.selection;
      if (sel.from < autocompleteTriggerPos) {
        hideAutocomplete();
      } else {
        const query = ed.state.doc.textBetween(autocompleteTriggerPos, sel.from, '').trim().toLowerCase();

        if (autocompleteMode === 'slash') {
          autocompleteFilteredList = SLASH_COMMANDS.filter(cmd =>
            cmd.title.toLowerCase().includes(query) || cmd.id.toLowerCase().includes(query)
          );
        } else if (autocompleteMode === 'wiki') {
          if (query.includes(']]')) {
            hideAutocomplete();
            return;
          }
          autocompleteFilteredList = projectEntities.filter(ent =>
            ent.title.toLowerCase().includes(query) || (ent.category && ent.category.toLowerCase().includes(query))
          );
        } else if (autocompleteMode === 'mention') {
          autocompleteFilteredList = projectEntities.filter(ent =>
            (ent.type === 'character' || ent.type === 'location' || ent.type === 'faction' || !ent.type) &&
            ent.title.toLowerCase().includes(query)
          );
          if (autocompleteFilteredList.length === 0) {
            autocompleteFilteredList = projectEntities.filter(ent => ent.title.toLowerCase().includes(query));
          }
        }

        autocompleteSelectedIndex = 0;
        renderAutocompleteMenu();
      }
    }
  },
  onSelectionUpdate: ({ editor: ed }) => {
    sendSelection(ed);
    updateFocusAndTypewriter();
  },
});

window.editor = editor;

/* ── Editor Click Delegation (Chips & Footnotes) ─────────── */

if (element) {
  element.addEventListener('click', (event) => {
    const wikiChip = event.target.closest('.wiki-link-chip');
    if (wikiChip) {
      const entityId = wikiChip.getAttribute('data-entity-id') || '';
      const entityType = wikiChip.getAttribute('data-entity-type') || 'entry';
      const title = wikiChip.getAttribute('data-title') || wikiChip.textContent.replace(/^\[\[|\]\]$/g, '').trim();
      sendToRN({
        type: 'openEntity',
        entityId,
        entityType,
        title,
      });
      return;
    }

    const mentionChip = event.target.closest('.mention-chip');
    if (mentionChip) {
      const entityId = mentionChip.getAttribute('data-entity-id') || '';
      const entityType = mentionChip.getAttribute('data-entity-type') || 'character';
      const title = mentionChip.getAttribute('data-title') || mentionChip.textContent.replace(/^@/, '').trim();
      sendToRN({
        type: 'openEntity',
        entityId,
        entityType,
        title,
      });
      return;
    }

    const footnote = event.target.closest('.footnote-ref');
    if (footnote) {
      const id = footnote.getAttribute('data-footnote-id') || '';
      sendToRN({
        type: 'footnoteClicked',
        id,
      });
      return;
    }

    // Normal editor interaction for images (no lightbox interception)
  });

  // Healing listener: If a local file:// image fails to load due to WebView CORS, ask host RN for base64
  element.addEventListener(
    'error',
    (event) => {
      if (event.target && event.target.tagName === 'IMG') {
        const targetImg = event.target;
        targetImg.classList.add('img-load-error');
        const rawSrc = targetImg.getAttribute('src') || targetImg.src;
        if (rawSrc && (rawSrc.startsWith('file:') || rawSrc.includes('Apollonography'))) {
          sendToRN({
            type: 'requestImageBase64',
            src: rawSrc,
          });
        }
      }
    },
    true
  );

  element.addEventListener(
    'load',
    (event) => {
      if (event.target && event.target.tagName === 'IMG') {
        event.target.classList.remove('img-load-error');
      }
    },
    true
  );
}

/* ── In-Editor Image Lightbox ────────────────────────────── */
let lightboxOverlay = null;
let lightboxImg = null;
let lightboxPlaceholder = null;
let lightboxZoomLabel = null;
let lbScale = 1.0;
let lbTranslateX = 0;
let lbTranslateY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let initialTranslateX = 0;
let initialTranslateY = 0;

function updateLightboxTransform() {
  if (!lightboxImg) return;
  lightboxImg.style.transform = `translate(${lbTranslateX}px, ${lbTranslateY}px) scale(${lbScale})`;
  if (lightboxZoomLabel) {
    lightboxZoomLabel.textContent = `${Math.round(lbScale * 100)}%`;
  }
}

function resetLightboxTransform() {
  lbScale = 1.0;
  lbTranslateX = 0;
  lbTranslateY = 0;
  updateLightboxTransform();
}

function setLightboxZoom(newScale) {
  lbScale = Math.min(4.0, Math.max(1.0, newScale));
  if (lbScale <= 1.0) {
    lbTranslateX = 0;
    lbTranslateY = 0;
  } else {
    const maxPanX = ((lbScale - 1) * window.innerWidth) / 2;
    const maxPanY = ((lbScale - 1) * window.innerHeight) / 2;
    lbTranslateX = Math.max(-maxPanX, Math.min(maxPanX, lbTranslateX));
    lbTranslateY = Math.max(-maxPanY, Math.min(maxPanY, lbTranslateY));
  }
  updateLightboxTransform();
}

function closeEditorLightbox() {
  if (lightboxOverlay) {
    lightboxOverlay.classList.remove('active');
    setTimeout(() => {
      if (!lightboxOverlay.classList.contains('active')) {
        lightboxOverlay.style.display = 'none';
      }
    }, 120);
  }
}

function openEditorLightbox(src, alt) {
  if (!lightboxOverlay) {
    lightboxOverlay = document.createElement('div');
    lightboxOverlay.id = 'editor-lightbox';
    lightboxOverlay.innerHTML = `
      <button class="lightbox-close-btn" title="Close (Esc)">✕</button>
      <div class="lightbox-img-wrapper">
        <img class="lightbox-img-el" alt="${alt || ''}" />
        <div class="lightbox-placeholder-el" style="display: none;">
          <div style="font-size: 24px; font-weight: 900; opacity: 0.7;">✕</div>
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-top: 6px;">IMAGE NOT FOUND</div>
        </div>
      </div>
      <div class="lightbox-toolbar">
        <button id="lb-zoom-out" title="Zoom Out (−)">−</button>
        <span class="lightbox-zoom-label">100%</span>
        <button id="lb-zoom-in" title="Zoom In (+)">+</button>
        <div style="width: 2px; height: 18px; background: #111; margin: 0 2px;"></div>
        <button id="lb-reset" class="lightbox-reset-btn" title="Reset Zoom (0)">FIT / RESET</button>
      </div>
    `;
    document.body.appendChild(lightboxOverlay);

    lightboxImg = lightboxOverlay.querySelector('.lightbox-img-el');
    lightboxPlaceholder = lightboxOverlay.querySelector('.lightbox-placeholder-el');
    lightboxZoomLabel = lightboxOverlay.querySelector('.lightbox-zoom-label');

    lightboxOverlay.querySelector('.lightbox-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeEditorLightbox();
    });

    lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === lightboxOverlay) {
        closeEditorLightbox();
      }
    });

    lightboxOverlay.querySelector('#lb-zoom-out').addEventListener('click', (e) => {
      e.stopPropagation();
      setLightboxZoom(lbScale - 0.25);
    });
    lightboxOverlay.querySelector('#lb-zoom-in').addEventListener('click', (e) => {
      e.stopPropagation();
      setLightboxZoom(lbScale + 0.25);
    });
    lightboxOverlay.querySelector('#lb-reset').addEventListener('click', (e) => {
      e.stopPropagation();
      resetLightboxTransform();
    });

    const imgWrapper = lightboxOverlay.querySelector('.lightbox-img-wrapper');
    imgWrapper.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (lbScale > 1.05) {
        resetLightboxTransform();
      } else {
        setLightboxZoom(2.0);
      }
    });

    imgWrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || lbScale <= 1.0) return;
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      initialTranslateX = lbTranslateX;
      initialTranslateY = lbTranslateY;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartX;
      const dy = e.clientY - panStartY;

      const maxPanX = ((lbScale - 0.5) * window.innerWidth) / 2;
      const maxPanY = ((lbScale - 0.5) * window.innerHeight) / 2;

      lbTranslateX = Math.max(-maxPanX, Math.min(maxPanX, initialTranslateX + dx));
      lbTranslateY = Math.max(-maxPanY, Math.min(maxPanY, initialTranslateY + dy));
      updateLightboxTransform();
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
    });

    lightboxOverlay.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setLightboxZoom(lbScale + 0.25);
      } else {
        setLightboxZoom(lbScale - 0.25);
      }
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (!lightboxOverlay || !lightboxOverlay.classList.contains('active')) return;
      if (e.key === 'Escape') {
        closeEditorLightbox();
      } else if (e.key === '+' || e.key === '=') {
        setLightboxZoom(lbScale + 0.25);
      } else if (e.key === '-' || e.key === '_') {
        setLightboxZoom(lbScale - 0.25);
      } else if (e.key === '0') {
        resetLightboxTransform();
      }
    });

    lightboxImg.onerror = () => {
      lightboxImg.style.display = 'none';
      lightboxPlaceholder.style.display = 'flex';
    };
  }

  resetLightboxTransform();
  lightboxImg.style.display = 'block';
  lightboxPlaceholder.style.display = 'none';
  lightboxImg.src = src || '';
  lightboxImg.alt = alt || '';

  lightboxOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    lightboxOverlay.classList.add('active');
  });
}

/* ── RN Bridge Communication ──────────────────────────────── */
const handledMsgIds = new Set();

window.handleRNMessage = (raw) => {
  try {
    const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!msg || !msg.type) return;

    // Deduplicate identical message dispatched by multiple bridge listeners
    if (msg._msgId) {
      if (handledMsgIds.has(msg._msgId)) return;
      handledMsgIds.add(msg._msgId);
      if (handledMsgIds.size > 200) {
        const first = handledMsgIds.values().next().value;
        handledMsgIds.delete(first);
      }
    }

    if (msg.type === 'setProjectEntities') {
      projectEntities = Array.isArray(msg.entities) ? msg.entities : [];
    } else if (msg.type === 'resolvedImageBase64') {
      if (msg.originalSrc && msg.base64) {
        const imgs = document.querySelectorAll('img');
        imgs.forEach((im) => {
          const s = im.getAttribute('src') || im.src;
          if (s === msg.originalSrc || s.includes(msg.originalSrc) || msg.originalSrc.includes(s)) {
            im.src = msg.base64;
            im.classList.remove('img-load-error');
          }
        });
      }
    } else if (msg.type === 'load') {
      if (msg.doc) {
        editor.commands.setContent(msg.doc, false);
      }
      sendSelection(editor);
      const wordCount = editor.storage.characterCount.words();
      const characterCount = editor.storage.characterCount.characters();
      const headings = extractOutline(editor);
      sendToRN({
        type: 'change',
        doc: editor.getJSON(),
        wordCount,
        characterCount,
        headings,
      });
    } else if (msg.type === 'command') {
      const action = msg.action;
      const chain = editor.chain().focus();

      switch (action) {
        case 'toggleBold':
          chain.toggleBold().run();
          break;
        case 'toggleItalic':
          chain.toggleItalic().run();
          break;
        case 'toggleUnderline':
          chain.toggleUnderline().run();
          break;
        case 'toggleStrike':
          chain.toggleStrike().run();
          break;
        case 'toggleHighlight':
          chain.toggleHighlight({ color: msg.color || '#FEF08A' }).run();
          break;
        case 'setColor':
          if (msg.color) {
            chain.setColor(msg.color).run();
          } else {
            if (chain.unsetColor) chain.unsetColor().run();
            else chain.setColor('#111111').run();
          }
          break;
        case 'unsetColor':
          if (chain.unsetColor) chain.unsetColor().run();
          else chain.setColor('#111111').run();
          break;
        case 'setParagraph':
          chain.setParagraph().run();
          break;
        case 'setHeading':
          chain.setHeading({ level: msg.level || 1 }).run();
          break;
        case 'toggleBulletList':
          chain.toggleBulletList().run();
          break;
        case 'toggleOrderedList':
          chain.toggleOrderedList().run();
          break;
        case 'toggleTaskList':
          chain.toggleTaskList().run();
          break;
        case 'toggleBlockquote':
          chain.toggleBlockquote().run();
          break;
        case 'setTextAlign':
          chain.setTextAlign(msg.alignment || 'left').run();
          break;
        case 'setLink':
          if (msg.href) {
            chain.setLink({ href: msg.href }).run();
          } else {
            chain.unsetLink().run();
          }
          break;
        case 'unsetLink':
          chain.unsetLink().run();
          break;
        case 'pickImage':
          window.triggerPickImage();
          break;
        case 'insertImage':
          if (msg.src) {
            chain.setImage({ src: msg.src, alt: msg.alt || 'image' }).run();
          }
          break;
        case 'insertTable':
          chain.insertTable({ rows: msg.rows || 3, cols: msg.cols || 3, withHeaderRow: true }).run();
          break;
        case 'setHorizontalRule':
          chain.setHorizontalRule().run();
          break;
        case 'clearFormatting':
          chain.unsetAllMarks().clearNodes().run();
          break;
        case 'undo':
          chain.undo().run();
          break;
        case 'redo':
          chain.redo().run();
          break;

        /* Phase 3: Wiki Links, Mentions, Footnotes */
        case 'insertWikiLink':
          if (msg.entity) {
            chain.insertContent([
              { type: 'wikiLink', attrs: { id: msg.entity.id, title: msg.entity.title, type: msg.entity.type || 'entry' } },
              { type: 'text', text: ' ' },
            ]).run();
          }
          break;
        case 'insertMention':
          if (msg.entity) {
            chain.insertContent([
              { type: 'mentionTag', attrs: { id: msg.entity.id, title: msg.entity.title, type: msg.entity.type || 'character' } },
              { type: 'text', text: ' ' },
            ]).run();
          }
          break;
        case 'insertFootnote':
          insertFootnoteAtCaret();
          break;
        case 'locateFootnote':
          if (msg.id) {
            const fnEl = document.querySelector(`[data-footnote-id="${msg.id}"]`);
            if (fnEl) {
              fnEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              fnEl.classList.add('footnote-highlight');
              setTimeout(() => fnEl.classList.remove('footnote-highlight'), 1800);
            }
          }
          break;
        case 'copyToClipboard':
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(msg.text || '').catch(err => {
              console.warn('Clipboard write error in webview:', err);
            });
          }
          break;

        /* Phase 2: Focus, Typewriter, ScrollToPos */
        case 'setFocusMode':
          focusModeActive = !!msg.enabled;
          document.body.classList.toggle('focus-mode', focusModeActive);
          updateFocusAndTypewriter();
          break;
        case 'setTypewriterMode':
          typewriterActive = !!msg.enabled;
          updateFocusAndTypewriter();
          break;
        case 'scrollToPos':
          if (typeof msg.pos === 'number') {
            editor.commands.setTextSelection(msg.pos);
            const dom = editor.view.domAtPos(msg.pos);
            if (dom && dom.node) {
              const el = dom.node.nodeType === 1 ? dom.node : dom.node.parentElement;
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
          break;

        /* Phase 2: Find & Replace */
        case 'findText':
          searchInDoc(msg.query || '', !!msg.caseSensitive);
          break;
        case 'findNext':
          nextMatch();
          break;
        case 'findPrev':
          prevMatch();
          break;
        case 'replaceCurrent':
          replaceCurrent(msg.replaceText || '');
          break;
        case 'replaceAll':
          replaceAllMatches(msg.replaceText || '');
          break;

        case 'setEditable':
          editor.setEditable(!!msg.editable);
          break;

        /* Phase 2: View Settings (Theme, Page Width, Zoom) */
        case 'setTheme':
          document.body.classList.remove('theme-cream', 'theme-sepia', 'theme-dark');
          document.body.classList.add(`theme-${msg.theme || 'cream'}`);
          break;
        case 'setPageWidth':
          if (element) {
            element.style.maxWidth = msg.width ? `${msg.width}px` : '840px';
          }
          break;
        case 'setZoom':
          if (element) {
            element.style.zoom = msg.zoom || '100%';
          }
          break;
      }
      sendSelection(editor);
    }
  } catch (err) {
    console.error('Error handling RN message:', err);
  }
};

window.addEventListener('message', (event) => {
  window.handleRNMessage(event.data);
});
document.addEventListener('message', (event) => {
  window.handleRNMessage(event.data);
});

// Signal ready to React Native
sendToRN({ type: 'ready' });
