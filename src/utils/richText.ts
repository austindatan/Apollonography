/**
 * src/utils/richText.ts
 *
 * Rich Text helpers for Apollonography:
 * - toPlainText: Clean plaintext fallback that strips HTML tags & converts TipTap JSON
 * - tipTapDocToHtml: Converts TipTap JSON document to clean inline HTML
 * - parseRichTextTokens: Parses inline HTML (bold, italic, underline, strike, code, highlight, color)
 *   into structured tokens for 60fps native React Native <Text> rendering without WebViews.
 */

import { TipTapDoc } from '../components/WysiwygEditor/types';

export interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  highlight?: string;
  color?: string;
}

/**
 * Converts any HTML, markdown, or TipTap JSON document into clean human-readable plain text.
 * Perfect for card previews, search indexing, and badges where WebViews are too heavy.
 */
export function toPlainText(raw?: string | TipTapDoc | null): string {
  if (!raw) return '';

  // TipTap document object
  if (typeof raw === 'object' && raw.type === 'doc') {
    let out = '';
    const walk = (node: any) => {
      if (node.text) {
        out += node.text;
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(walk);
        if (node.type === 'paragraph') {
          out += '\n';
        }
      }
    };
    walk(raw);
    return out.trim();
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // In case a serialized JSON TipTap doc is stored as string
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.type === 'doc') {
          return toPlainText(parsed);
        }
      } catch {}
    }

    // Strip HTML tags and decode standard HTML entities
    return raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  return String(raw);
}

/**
 * Converts a TipTap document into a compact HTML string containing only inline formatting.
 */
export function tipTapDocToHtml(doc: TipTapDoc | any): string {
  if (!doc || !doc.content || !Array.isArray(doc.content)) return '';

  // Check if any block has formatting marks or if there are multiple paragraphs
  let hasFormatting = false;
  let paragraphCount = 0;

  for (const block of doc.content) {
    if (block.type === 'paragraph') paragraphCount++;
    if (block.content && Array.isArray(block.content)) {
      for (const node of block.content) {
        if (node.marks && Array.isArray(node.marks) && node.marks.length > 0) {
          hasFormatting = true;
          break;
        }
      }
    }
  }

  // If simple single-line/single-paragraph text with NO bold/italic/color marks, keep as clean plain text!
  if (!hasFormatting && paragraphCount <= 1) {
    return toPlainText(doc);
  }

  return doc.content
    .map((block: any) => {
      if (!block.content || !Array.isArray(block.content)) {
        return '<p></p>';
      }

      const inlines = block.content
        .map((node: any) => {
          if (node.type !== 'text' || !node.text) return '';

          let text = node.text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          if (node.marks && Array.isArray(node.marks)) {
            for (const m of node.marks) {
              if (m.type === 'bold') {
                text = `<strong>${text}</strong>`;
              } else if (m.type === 'italic') {
                text = `<em>${text}</em>`;
              } else if (m.type === 'underline') {
                text = `<u>${text}</u>`;
              } else if (m.type === 'strike') {
                text = `<s>${text}</s>`;
              } else if (m.type === 'code') {
                text = `<code>${text}</code>`;
              } else if (m.type === 'highlight') {
                const color = m.attrs?.color || '#FEF08A';
                text = `<mark data-color="${color}">${text}</mark>`;
              } else if (m.type === 'textStyle' && m.attrs?.color) {
                text = `<span data-color="${m.attrs.color}">${text}</span>`;
              }
            }
          }
          return text;
        })
        .join('');

      return `<p>${inlines}</p>`;
    })
    .join('');
}
/**
 * Converts an HTML string with inline formatting (<p>, <strong>, <em>, <u>, <s>, <code>, <mark>, <span>)
 * into a valid TipTap JSON document.
 * Prevents HTML tags from ever being escaped or shown as literal characters in the editor!
 */
export function htmlToTipTapDoc(html: string): TipTapDoc {
  if (!html || !html.trim()) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
  }

  // Handle double-escaped HTML (e.g. &lt;p&gt; from previous bugs)
  let cleaned = html;
  while (
    cleaned.includes('&lt;p&gt;') ||
    cleaned.includes('&lt;strong&gt;') ||
    cleaned.includes('&lt;mark') ||
    cleaned.includes('&lt;em&gt;')
  ) {
    cleaned = cleaned
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // If no HTML tags present at all, return plain text paragraph
  if (!cleaned.includes('<')) {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: cleaned }],
        },
      ],
    };
  }

  // Split into paragraphs by <p>...</p> or newlines
  const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
  let pMatches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pRegex.exec(cleaned)) !== null) {
    pMatches.push(m[1]);
  }

  if (pMatches.length === 0) {
    pMatches = cleaned.split(/\r?\n\r?\n/);
  }

  const paragraphNodes = pMatches.map(pText => {
    const segments = parseRichTextSegments(pText);
    if (segments.length === 0) {
      return { type: 'paragraph' };
    }

    const inlineContent: any[] = [];
    for (const seg of segments) {
      if (!seg.text) continue;

      const marks: any[] = [];
      if (seg.bold) marks.push({ type: 'bold' });
      if (seg.italic) marks.push({ type: 'italic' });
      if (seg.underline) marks.push({ type: 'underline' });
      if (seg.strike) marks.push({ type: 'strike' });
      if (seg.code) marks.push({ type: 'code' });
      if (seg.highlight) marks.push({ type: 'highlight', attrs: { color: seg.highlight } });
      if (seg.color) marks.push({ type: 'textStyle', attrs: { color: seg.color } });

      inlineContent.push({
        type: 'text',
        marks: marks.length > 0 ? marks : undefined,
        text: seg.text,
      });
    }

    return {
      type: 'paragraph',
      content: inlineContent.length > 0 ? inlineContent : undefined,
    };
  });

  return {
    type: 'doc',
    content: paragraphNodes.length > 0 ? paragraphNodes : [{ type: 'paragraph' }],
  };
}

/**
 * Lightweight inline HTML parser that tokenizes standard formatting tags into segments
 * for native React Native <Text> tree rendering.
 */
export function parseRichTextSegments(rawHtml: string): RichTextSegment[] {
  if (!rawHtml) return [];

  // If plain text with no HTML tags, return single segment
  if (!rawHtml.includes('<')) {
    return [{ text: rawHtml }];
  }

  const segments: RichTextSegment[] = [];

  // Replace <p> tags with appropriate paragraph line breaks
  const normalized = rawHtml
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Tag matcher regex: matches open/close tags or plain text chunks
  const tagRegex = /(<\/?[a-z0-9_-]+(?:\s+[^>]*?)?>|[^<]+)/gi;
  const matches = normalized.match(tagRegex) || [normalized];

  const state = {
    bold: 0,
    italic: 0,
    underline: 0,
    strike: 0,
    code: 0,
    highlight: null as string | null,
    color: null as string | null,
  };

  for (const part of matches) {
    if (part.startsWith('</')) {
      const tag = part.toLowerCase().replace(/[</>]/g, '').trim();
      if (tag === 'strong' || tag === 'b') state.bold = Math.max(0, state.bold - 1);
      else if (tag === 'em' || tag === 'i') state.italic = Math.max(0, state.italic - 1);
      else if (tag === 'u') state.underline = Math.max(0, state.underline - 1);
      else if (tag === 's' || tag === 'strike') state.strike = Math.max(0, state.strike - 1);
      else if (tag === 'code') state.code = Math.max(0, state.code - 1);
      else if (tag === 'mark') state.highlight = null;
      else if (tag === 'span') state.color = null;
    } else if (part.startsWith('<')) {
      const lower = part.toLowerCase();
      if (lower.startsWith('<strong') || lower.startsWith('<b ') || lower === '<b>') {
        state.bold++;
      } else if (lower.startsWith('<em') || lower.startsWith('<i ') || lower === '<i>') {
        state.italic++;
      } else if (lower.startsWith('<u ') || lower === '<u>') {
        state.underline++;
      } else if (lower.startsWith('<s ') || lower === '<s>' || lower.startsWith('<strike')) {
        state.strike++;
      } else if (lower.startsWith('<code ') || lower === '<code>') {
        state.code++;
      } else if (lower.startsWith('<mark')) {
        const colorMatch = part.match(/data-color=["']([^"']+)["']/) || part.match(/background-color:\s*([^;"']+)/i);
        const rawColor = colorMatch ? colorMatch[1] : '#D97706';
        // Map pale yellow highlight to rich gold text color
        state.color = rawColor === '#FEF08A' ? '#D97706' : rawColor;
      } else if (lower.startsWith('<span')) {
        const colorMatch = part.match(/data-color=["']([^"']+)["']/) || part.match(/color:\s*([^;"']+)/i);
        if (colorMatch) state.color = colorMatch[1];
      }
    } else {
      // Decode HTML entities
      const decodedText = part
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

      if (decodedText) {
        segments.push({
          text: decodedText,
          bold: state.bold > 0,
          italic: state.italic > 0,
          underline: state.underline > 0,
          strike: state.strike > 0,
          code: state.code > 0,
          highlight: state.highlight || undefined,
          color: state.color || undefined,
        });
      }
    }
  }

  return segments;
}
