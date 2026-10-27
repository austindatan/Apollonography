/**
 * src/components/WysiwygEditor/types.ts
 * Type definitions for the TipTap WYSIWYG editor integration (Phase 1 & Phase 2).
 */

export interface ActiveMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  highlight?: boolean;
  code?: boolean;
  link?: boolean;
}

export interface ActiveNodes {
  paragraph?: boolean;
  heading1?: boolean;
  heading2?: boolean;
  heading3?: boolean;
  bulletList?: boolean;
  orderedList?: boolean;
  taskList?: boolean;
  blockquote?: boolean;
  alignLeft?: boolean;
  alignCenter?: boolean;
  alignRight?: boolean;
  alignJustify?: boolean;
  table?: boolean;
}

export interface SelectionState {
  activeMarks: ActiveMarks;
  activeNodes: ActiveNodes;
  canUndo: boolean;
  canRedo: boolean;
  selectionWordCount: number;
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
}

export interface TipTapDoc {
  type: 'doc';
  content: TipTapNode[];
}

export interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

export interface WikiEntity {
  id: string;
  title: string;
  type: 'character' | 'location' | 'faction' | 'chapter' | 'lore' | 'entry';
  subtitle?: string;
  category?: string;
}

export interface EditorFootnote {
  id: string;
  number: number;
  text: string;
}

export interface EditorSnapshot {
  id: string;
  timestamp: number;
  label: string;
  doc: TipTapDoc;
  wordCount: number;
  wordDelta?: number;
}

export interface EditorBacklink {
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  excerpt: string;
}

export interface EditorMessageReady {
  type: 'ready';
}

export interface EditorMessageChange {
  type: 'change';
  doc: TipTapDoc;
  wordCount: number;
  characterCount: number;
  headings?: HeadingItem[];
}

export interface EditorMessageSelection {
  type: 'selection';
  activeMarks: ActiveMarks;
  activeNodes: ActiveNodes;
  canUndo: boolean;
  canRedo: boolean;
  selectionWordCount: number;
}

export interface EditorMessageFindResults {
  type: 'findResults';
  count: number;
  index: number;
}

export interface EditorMessageOpenFind {
  type: 'openFind';
  replace?: boolean;
}

export interface EditorMessageOpenEntity {
  type: 'openEntity';
  entityId: string;
  entityType: string;
  title: string;
}

export interface EditorMessageFootnoteClicked {
  type: 'footnoteClicked';
  id: string;
}

export interface EditorMessageFootnoteAdded {
  type: 'footnoteAdded';
  id: string;
  number: number;
}

export interface EditorMessageImageClick {
  type: 'imageClick';
  src: string;
  alt?: string;
}

export interface EditorMessageRequestImageBase64 {
  type: 'requestImageBase64';
  src: string;
}

export type IncomingEditorMessage =
  | EditorMessageReady
  | EditorMessageChange
  | EditorMessageSelection
  | EditorMessageFindResults
  | EditorMessageOpenFind
  | EditorMessageOpenEntity
  | EditorMessageFootnoteClicked
  | EditorMessageFootnoteAdded
  | EditorMessageImageClick
  | EditorMessageRequestImageBase64;

export interface EditorCommandMessage {
  type: 'command';
  action: string;
  [key: string]: any;
}

export interface EditorLoadMessage {
  type: 'load';
  doc: TipTapDoc;
}

export interface EditorSetEntitiesMessage {
  type: 'setProjectEntities';
  entities: WikiEntity[];
}

export interface EditorMessageResolvedImageBase64 {
  type: 'resolvedImageBase64';
  originalSrc: string;
  base64: string;
}

export type OutgoingEditorMessage =
  | EditorLoadMessage
  | EditorCommandMessage
  | EditorSetEntitiesMessage
  | EditorMessageResolvedImageBase64;

export type ThemeMode = 'cream' | 'sepia' | 'dark';
export type PageWidthOption = 680 | 840 | 1100 | 1400;
export type ZoomOption = 80 | 90 | 100 | 110 | 125 | 150;

