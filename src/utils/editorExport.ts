/**
 * src/utils/editorExport.ts
 *
 * Export utilities for Apollonography WYSIWYG Editor:
 * - Markdown (.md) converter supporting full TipTap AST (marks, nodes, tables, tasks, wiki links, footnotes)
 * - Microsoft Word / Rich Text (.doc) generator
 */

import type { EditorFootnote, TipTapDoc, TipTapNode } from '../components/WysiwygEditor/types';

/**
 * Converts a TipTap document JSON into clean GitHub-flavored Markdown.
 */
export function exportToMarkdown(
  doc: TipTapDoc,
  footnotes: EditorFootnote[] = [],
  meta?: { title?: string; subtitle?: string }
): string {
  const lines: string[] = [];

  if (meta?.title) {
    lines.push(`# ${meta.title}`);
    if (meta.subtitle) {
      lines.push(`*${meta.subtitle}*`);
    }
    lines.push('');
  }

  function renderInlineMarks(node: TipTapNode): string {
    let text = node.text || '';
    if (!text) return '';

    if (node.marks && Array.isArray(node.marks)) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `**${text}**`;
            break;
          case 'italic':
            text = `*${text}*`;
            break;
          case 'underline':
            text = `<u>${text}</u>`;
            break;
          case 'strike':
            text = `~~${text}~~`;
            break;
          case 'code':
            text = `\`${text}\``;
            break;
          case 'highlight':
            text = `==${text}==`;
            break;
          case 'link':
            text = `[${text}](${mark.attrs?.href || '#'})`;
            break;
        }
      }
    }
    return text;
  }

  function renderInlineNodes(content?: TipTapNode[]): string {
    if (!content || !Array.isArray(content)) return '';
    return content.map(node => {
      if (node.type === 'text') {
        return renderInlineMarks(node);
      }
      if (node.type === 'hardBreak') {
        return '  \n';
      }
      if (node.type === 'image') {
        return `![${node.attrs?.alt || 'image'}](${node.attrs?.src || ''})`;
      }
      if (node.type === 'wikiLink') {
        return `[[${node.attrs?.title || ''}]]`;
      }
      if (node.type === 'mentionTag') {
        return `@${node.attrs?.title || ''}`;
      }
      if (node.type === 'footnoteRef') {
        return `[^${node.attrs?.number || 1}]`;
      }
      return '';
    }).join('');
  }

  function processNode(node: TipTapNode, indent = ''): void {
    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 1;
        const prefix = '#'.repeat(level);
        const text = renderInlineNodes(node.content);
        lines.push(`${prefix} ${text}\n`);
        break;
      }

      case 'paragraph': {
        const text = renderInlineNodes(node.content);
        lines.push(`${indent}${text}\n`);
        break;
      }

      case 'blockquote': {
        const innerLines: string[] = [];
        if (node.content) {
          for (const child of node.content) {
            const childText = renderInlineNodes(child.content);
            if (childText) innerLines.push(`> ${childText}`);
          }
        }
        lines.push(innerLines.join('\n') + '\n');
        break;
      }

      case 'bulletList': {
        if (node.content) {
          node.content.forEach(item => {
            const itemText = item.content?.map(c => renderInlineNodes(c.content)).join(' ') || '';
            lines.push(`${indent}- ${itemText}`);
          });
          lines.push('');
        }
        break;
      }

      case 'orderedList': {
        if (node.content) {
          node.content.forEach((item, idx) => {
            const itemText = item.content?.map(c => renderInlineNodes(c.content)).join(' ') || '';
            lines.push(`${indent}${idx + 1}. ${itemText}`);
          });
          lines.push('');
        }
        break;
      }

      case 'taskList': {
        if (node.content) {
          node.content.forEach(item => {
            const checked = item.attrs?.checked ? 'x' : ' ';
            const itemText = item.content?.map(c => renderInlineNodes(c.content)).join(' ') || '';
            lines.push(`${indent}- [${checked}] ${itemText}`);
          });
          lines.push('');
        }
        break;
      }

      case 'horizontalRule': {
        lines.push('---\n');
        break;
      }

      case 'image': {
        lines.push(`![${node.attrs?.alt || 'image'}](${node.attrs?.src || ''})\n`);
        break;
      }

      case 'table': {
        if (node.content && node.content.length > 0) {
          const rows = node.content;
          rows.forEach((row, rIdx) => {
            const cells = row.content || [];
            const cellTexts = cells.map(cell => {
              return cell.content?.map(c => renderInlineNodes(c.content)).join(' ').trim() || '';
            });
            lines.push(`| ${cellTexts.join(' | ')} |`);

            if (rIdx === 0) {
              const divider = cells.map(() => '---').join(' | ');
              lines.push(`| ${divider} |`);
            }
          });
          lines.push('');
        }
        break;
      }

      default:
        if (node.content) {
          node.content.forEach(child => processNode(child, indent));
        }
        break;
    }
  }

  if (doc.content) {
    doc.content.forEach(child => processNode(child));
  }

  // Append Footnotes if present
  if (footnotes && footnotes.length > 0) {
    lines.push('\n---\n');
    lines.push('### Notes & References\n');
    footnotes.forEach(fn => {
      lines.push(`[^${fn.number}]: ${fn.text}`);
    });
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Converts TipTap document into Word-compatible HTML document (.doc).
 */
export function exportToWordHtml(
  doc: TipTapDoc,
  footnotes: EditorFootnote[] = [],
  meta?: { title?: string; subtitle?: string }
): string {
  function renderInlineHtml(content?: TipTapNode[]): string {
    if (!content) return '';
    return content.map(node => {
      if (node.type === 'text') {
        let text = (node.text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        if (node.marks) {
          for (const m of node.marks) {
            if (m.type === 'bold') text = `<strong>${text}</strong>`;
            if (m.type === 'italic') text = `<em>${text}</em>`;
            if (m.type === 'underline') text = `<u>${text}</u>`;
            if (m.type === 'strike') text = `<strike>${text}</strike>`;
            if (m.type === 'highlight') text = `<mark style="background-color: #FEF08A;">${text}</mark>`;
            if (m.type === 'link') text = `<a href="${m.attrs?.href || '#'}" style="color: #2563EB;">${text}</a>`;
          }
        }
        return text;
      }
      if (node.type === 'hardBreak') return '<br />';
      if (node.type === 'image') {
        return `<img src="${node.attrs?.src || ''}" alt="${node.attrs?.alt || ''}" style="max-width: 100%; height: auto;" />`;
      }
      if (node.type === 'wikiLink') {
        return `<span style="background-color: #FEF08A; padding: 1pt 4pt; border: 1pt solid #111111; font-weight: bold; border-radius: 2pt;">[[${node.attrs?.title || ''}]]</span>`;
      }
      if (node.type === 'mentionTag') {
        return `<span style="background-color: #BAE6FD; padding: 1pt 4pt; border: 1pt solid #111111; font-weight: bold; border-radius: 2pt;">@${node.attrs?.title || ''}</span>`;
      }
      if (node.type === 'footnoteRef') {
        return `<sup>[${node.attrs?.number || 1}]</sup>`;
      }
      return '';
    }).join('');
  }

  const bodyParts: string[] = [];

  if (meta?.title) {
    bodyParts.push(`<h1 style="font-family: Arial, sans-serif; font-size: 26pt; margin-bottom: 4pt; color: #111111;">${meta.title}</h1>`);
    if (meta.subtitle) {
      bodyParts.push(`<p style="font-family: Georgia, serif; font-size: 13pt; color: #555555; font-style: italic; margin-bottom: 24pt;">${meta.subtitle}</p>`);
    }
  }

  function processNodeHtml(node: TipTapNode): void {
    switch (node.type) {
      case 'heading': {
        const level = node.attrs?.level || 1;
        const size = level === 1 ? '20pt' : level === 2 ? '16pt' : '13pt';
        bodyParts.push(`<h${level} style="font-family: Arial, sans-serif; font-size: ${size}; font-weight: bold; margin-top: 18pt; margin-bottom: 6pt; color: #111111;">${renderInlineHtml(node.content)}</h${level}>`);
        break;
      }
      case 'paragraph': {
        bodyParts.push(`<p style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; margin-bottom: 10pt; color: #111111;">${renderInlineHtml(node.content)}</p>`);
        break;
      }
      case 'blockquote': {
        const inner = node.content?.map(c => renderInlineHtml(c.content)).join('<br />') || '';
        bodyParts.push(`<blockquote style="border-left: 3pt solid #111111; padding-left: 14pt; margin: 12pt 0; font-family: Georgia, serif; font-style: italic; color: #333333; background: #F8F7F3;">${inner}</blockquote>`);
        break;
      }
      case 'bulletList': {
        const items = node.content?.map(li => `<li style="margin-bottom: 4pt;">${li.content?.map(c => renderInlineHtml(c.content)).join('')}</li>`).join('') || '';
        bodyParts.push(`<ul style="font-family: 'Times New Roman', serif; font-size: 12pt; margin-bottom: 10pt;">${items}</ul>`);
        break;
      }
      case 'orderedList': {
        const items = node.content?.map(li => `<li style="margin-bottom: 4pt;">${li.content?.map(c => renderInlineHtml(c.content)).join('')}</li>`).join('') || '';
        bodyParts.push(`<ol style="font-family: 'Times New Roman', serif; font-size: 12pt; margin-bottom: 10pt;">${items}</ol>`);
        break;
      }
      case 'horizontalRule': {
        bodyParts.push(`<hr style="border: none; border-top: 2pt solid #111111; margin: 18pt 0;" />`);
        break;
      }
      case 'table': {
        if (node.content) {
          const rowsHtml = node.content.map((row, rIdx) => {
            const cells = row.content || [];
            const isHeader = rIdx === 0;
            const cellsHtml = cells.map(cell => {
              const tag = isHeader ? 'th' : 'td';
              const bg = isHeader ? 'background-color: #FEF08A; font-weight: bold;' : '';
              return `<${tag} style="border: 1pt solid #111111; padding: 6pt 10pt; text-align: left; ${bg}">${cell.content?.map(c => renderInlineHtml(c.content)).join('')}</${tag}>`;
            }).join('');
            return `<tr>${cellsHtml}</tr>`;
          }).join('');
          bodyParts.push(`<table style="border-collapse: collapse; width: 100%; margin: 14pt 0; font-family: Arial, sans-serif; font-size: 11pt;">${rowsHtml}</table>`);
        }
        break;
      }
      default:
        if (node.content) {
          node.content.forEach(processNodeHtml);
        }
        break;
    }
  }

  if (doc.content) {
    doc.content.forEach(processNodeHtml);
  }

  if (footnotes && footnotes.length > 0) {
    bodyParts.push(`<hr style="border: none; border-top: 1pt solid #888888; margin-top: 24pt; margin-bottom: 12pt;" />`);
    bodyParts.push(`<h4 style="font-family: Arial, sans-serif; font-size: 11pt; color: #444444; margin-bottom: 8pt;">Footnotes</h4>`);
    footnotes.forEach(fn => {
      bodyParts.push(`<p style="font-family: 'Times New Roman', serif; font-size: 10pt; color: #555555; margin-bottom: 4pt;"><sup>[${fn.number}]</sup> ${fn.text}</p>`);
    });
  }

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${meta?.title || 'Document'}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      margin: 1.0in 1.0in 1.0in 1.0in;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111111;
    }
  </style>
</head>
<body>
  ${bodyParts.join('\n')}
</body>
</html>`;
}
