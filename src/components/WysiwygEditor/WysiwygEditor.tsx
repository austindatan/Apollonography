/**
 * src/components/WysiwygEditor/WysiwygEditor.tsx
 *
 * Full-surface TipTap WYSIWYG Editor wrapper for React Native Windows:
 * - Single continuous writing surface (like Google Docs)
 * - 100% offline bundling (zero CDN)
 * - Seamless two-way postMessage communication bridge
 * - Debounced autosave (~800ms) with unmount flush
 * - Phase 1: Native toolbar, inline formatting, image insertion, status bar
 * - Phase 2: Focus mode, Typewriter scrolling, Find & Replace, Outline, View Settings
 * - Phase 3:
 *    * [[Wiki Links]] and @Mentions with inline autocomplete chips and navigation
 *    * Linked From (Backlinks) inspector drawer
 *    * Document Snapshots and Version History drawer with auto-checkpoints & restore
 *    * Export to Markdown (.md) and Microsoft Word (.doc)
 *    * Footnotes and Margin Notes system with auto-numbering
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { BrutalTextInput } from '../brutal/BrutalTextInput';
import { EDITOR_HTML } from '../../assets/editor/editorHtml';
import { BORDER, CREAM, INK, RADIUS, WHITE, YELLOW } from '../../theme/brutal';
import BrutalBox from '../brutal/BrutalBox';
import BrutalButton from '../brutal/BrutalButton';
import BrutalPill from '../brutal/BrutalPill';
import { pickImageFromComputer } from '../../native/FilePicker';
import { useLightbox } from '../../context/LightboxContext';
import type {
  EditorBacklink,
  EditorFootnote,
  EditorSnapshot,
  HeadingItem,
  IncomingEditorMessage,
  PageWidthOption,
  SelectionState,
  ThemeMode,
  TipTapDoc,
  WikiEntity,
  ZoomOption,
} from './types';
import WysiwygBacklinks from './WysiwygBacklinks';
import WysiwygExportModal from './WysiwygExportModal';
import WysiwygFindReplace from './WysiwygFindReplace';
import WysiwygFootnotes from './WysiwygFootnotes';
import WysiwygHistory from './WysiwygHistory';
import WysiwygOutline from './WysiwygOutline';
import WysiwygStatusBar from './WysiwygStatusBar';
import WysiwygToolbar from './WysiwygToolbar';
import WysiwygViewSettings from './WysiwygViewSettings';

interface Props {
  initialContent?: TipTapDoc | string;
  initialWordGoal?: number;
  entities?: WikiEntity[];
  backlinks?: EditorBacklink[];
  meta?: { title?: string; subtitle?: string };
  onChange?: (doc: TipTapDoc, textSummary?: string) => void;
  onWordGoalChange?: (goal: number) => void;
  onOpenEntity?: (entity: { id: string; type: string; title: string }) => void;
  readOnly?: boolean;
  isExternalOverlayOpen?: boolean;
}

const defaultSelectionState: SelectionState = {
  activeMarks: {},
  activeNodes: { paragraph: true },
  canUndo: false,
  canRedo: false,
  selectionWordCount: 0,
};

import { htmlToTipTapDoc } from '../../utils/richText';

/**
 * Converts legacy plain text or markdown string into a valid TipTap JSON document.
 */
export function migrateToTipTapDoc(raw?: TipTapDoc | string | null): TipTapDoc {
  if (!raw) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
  }

  // Already a TipTap doc object
  if (typeof raw === 'object' && raw.type === 'doc' && Array.isArray(raw.content)) {
    return raw;
  }

  // Attempt JSON parse in case it's a serialized TipTap doc string
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.type === 'doc' && Array.isArray(parsed.content)) {
          return parsed;
        }
      } catch {
        // Fall back to line-by-line migration
      }
    }

    // If string contains HTML formatting tags, convert via htmlToTipTapDoc
    if (trimmed.includes('<') && (trimmed.includes('</') || trimmed.includes('/>') || trimmed.includes('<br>'))) {
      return htmlToTipTapDoc(trimmed);
    }

    // Convert plain text / simple markdown paragraphs
    const paragraphs = raw.split(/\r?\n\r?\n/);
    const content = paragraphs.map(p => {
      const text = p.trim();
      if (!text) {
        return { type: 'paragraph' };
      }

      // Simple markdown image: ![alt](src)
      const imgMatch = text.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        return {
          type: 'image',
          attrs: {
            alt: imgMatch[1] || 'image',
            src: imgMatch[2],
          },
        };
      }

      // Headings
      if (text.startsWith('### ')) {
        return {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: text.slice(4) }],
        };
      }
      if (text.startsWith('## ')) {
        return {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: text.slice(3) }],
        };
      }
      if (text.startsWith('# ')) {
        return {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: text.slice(2) }],
        };
      }

      return {
        type: 'paragraph',
        content: [{ type: 'text', text: text.replace(/\r?\n/g, ' ') }],
      };
    });

    return {
      type: 'doc',
      content: content.length > 0 ? content : [{ type: 'paragraph' }],
    };
  }

  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  };
}

export const WysiwygEditor: React.FC<Props> = ({
  initialContent,
  initialWordGoal = 500,
  entities = [],
  backlinks = [],
  meta,
  onChange,
  onWordGoalChange,
  onOpenEntity,
  readOnly = false,
  isExternalOverlayOpen = false,
}) => {
  const { openLightbox } = useLightbox();
  const webViewRef = useRef<any>(null);
  const isReadyRef = useRef<boolean>(false);
  const latestDocRef = useRef<TipTapDoc>(migrateToTipTapDoc(initialContent));
  const pendingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase 1 States
  const [selectionState, setSelectionState] = useState<SelectionState>(defaultSelectionState);
  const [wordCount, setWordCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Phase 2 States
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isTypewriter, setIsTypewriter] = useState<boolean>(false);
  const [wordGoal, setWordGoal] = useState<number>(initialWordGoal);

  // Find & Replace States
  const [findVisible, setFindVisible] = useState<boolean>(false);
  const [isReplaceMode, setIsReplaceMode] = useState<boolean>(false);
  const [matchCount, setMatchCount] = useState<number>(0);
  const [matchIndex, setMatchIndex] = useState<number>(-1);

  // View Settings States
  const [viewSettingsVisible, setViewSettingsVisible] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('cream');
  const [currentWidth, setCurrentWidth] = useState<PageWidthOption>(840);
  const [currentZoom, setCurrentZoom] = useState<ZoomOption>(100);

  // Phase 3 States
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isBacklinksOpen, setIsBacklinksOpen] = useState<boolean>(false);
  const [isFootnotesOpen, setIsFootnotesOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [selectedFootnoteId, setSelectedFootnoteId] = useState<string | undefined>(undefined);
  const [footnotes, setFootnotes] = useState<EditorFootnote[]>([]);
  const [snapshots, setSnapshots] = useState<EditorSnapshot[]>([]);
  const lastSnapshotWordsRef = useRef<number>(0);

  // Link & Image Overlay States
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Entity Picker Modal (for toolbar click fallback)
  const [pickerModalMode, setPickerModalMode] = useState<'wiki' | 'mention' | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>('');

  const isAnyOverlayOpen = !!isExternalOverlayOpen ||
    !!pickerModalMode ||
    viewSettingsVisible ||
    isExportOpen ||
    showLinkModal ||
    showImageModal;

  // Send message helper to WebView with unique msgId for deduplication
  const sendMessage = useCallback((msg: Record<string, any>) => {
    const msgId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const enriched = { ...msg, _msgId: msgId };
    const json = JSON.stringify(enriched);
    // Allow large image data URLs (up to 50MB) while guarding against unbounded payloads
    if (json.length > 50 * 1024 * 1024) {
      console.warn('[WysiwygEditor] Message payload exceeds 50MB limit, skipping.');
      return;
    }
    try {
      webViewRef.current?.postMessage(json);
    } catch (e) {}
    // Only inject script for small payloads to avoid string evaluation overhead on large images
    if (json.length < 500 * 1024) {
      try {
        webViewRef.current?.injectJavaScript(`window.handleRNMessage(${json});true;`);
      } catch (e) {}
    }
  }, []);

  const handleCommand = useCallback((action: string, params?: Record<string, any>) => {
    sendMessage({
      type: 'command',
      action,
      ...params,
    });
  }, [sendMessage]);

  // Load document into WebView
  const loadContent = useCallback((doc: TipTapDoc) => {
    latestDocRef.current = doc;
    sendMessage({
      type: 'load',
      doc,
    });
  }, [sendMessage]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const onOpenEntityRef = useRef(onOpenEntity);
  useEffect(() => {
    onOpenEntityRef.current = onOpenEntity;
  }, [onOpenEntity]);

  // Send entities to WebView whenever editor is ready or entities change
  const entitiesJsonRef = useRef<string>('');
  const syncEntities = useCallback(() => {
    const json = JSON.stringify(entities);
    if (json !== entitiesJsonRef.current) {
      entitiesJsonRef.current = json;
      sendMessage({
        type: 'setProjectEntities',
        entities,
      });
    }
  }, [entities, sendMessage]);

  useEffect(() => {
    if (isReadyRef.current) {
      syncEntities();
    }
  }, [syncEntities]);

  // Auto-snapshot timer (every 5 minutes if content changed)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentWords = wordCount;
      const lastWords = lastSnapshotWordsRef.current;
      if (Math.abs(currentWords - lastWords) >= 5 || snapshots.length === 0) {
        const delta = currentWords - lastWords;
        const newSnap: EditorSnapshot = {
          id: `snap-${Date.now().toString(36)}`,
          timestamp: Date.now(),
          label: snapshots.length === 0 ? 'Initial Checkpoint' : 'Auto-save Checkpoint',
          doc: JSON.parse(JSON.stringify(latestDocRef.current)),
          wordCount: currentWords,
          wordDelta: delta,
        };
        lastSnapshotWordsRef.current = currentWords;
        setSnapshots(prev => [newSnap, ...prev.slice(0, 49)]);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [wordCount, snapshots.length]);

  // Handle incoming messages from WebView
  const handleMessage = useCallback((event: any) => {
    const rawData = event.nativeEvent?.data;
    if (!rawData) return;

    let msg: IncomingEditorMessage;
    try {
      msg = JSON.parse(rawData);
    } catch {
      return;
    }

    if (msg.type === 'ready') {
      isReadyRef.current = true;
      syncEntities();
      loadContent(latestDocRef.current);
      if (readOnly) {
        handleCommand('setEditable', { editable: false });
      }
    } else if (msg.type === 'change') {
      latestDocRef.current = msg.doc;
      setWordCount(msg.wordCount);
      setCharacterCount(msg.characterCount);
      if (msg.headings) {
        setHeadings(msg.headings);
      }
      setIsSaving(true);

      // Debounce autosave (~800ms)
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
      }
      pendingSaveTimerRef.current = setTimeout(() => {
        setIsSaving(false);
        onChangeRef.current?.(latestDocRef.current);
      }, 800);
    } else if (msg.type === 'selection') {
      setSelectionState({
        activeMarks: msg.activeMarks || {},
        activeNodes: msg.activeNodes || {},
        canUndo: !!msg.canUndo,
        canRedo: !!msg.canRedo,
        selectionWordCount: msg.selectionWordCount || 0,
      });
    } else if (msg.type === 'findResults') {
      setMatchCount(msg.count);
      setMatchIndex(msg.index);
    } else if (msg.type === 'openFind') {
      setFindVisible(true);
      setIsReplaceMode(!!msg.replace);
    } else if (msg.type === 'openEntity') {
      onOpenEntityRef.current?.({
        id: msg.entityId,
        type: msg.entityType,
        title: msg.title,
      });
    } else if (msg.type === 'footnoteAdded') {
      setFootnotes(prev => {
        if (prev.some(f => f.id === msg.id)) return prev;
        return [...prev, { id: msg.id, number: msg.number, text: '' }];
      });
      setSelectedFootnoteId(msg.id);
      setIsFootnotesOpen(true);
    } else if (msg.type === 'footnoteClicked') {
      setSelectedFootnoteId(msg.id);
      setIsFootnotesOpen(true);
    } else if (msg.type === 'imageClick') {
      if ((msg as any).src) {
        openLightbox((msg as any).src, (msg as any).alt || 'Illustration');
      }
    } else if (msg.type === 'requestImageBase64') {
      const srcToResolve = (msg as any).src;
      if (srcToResolve) {
        try {
          fetch(srcToResolve)
            .then(res => res.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result as string;
                if (base64) {
                  sendMessage({
                    type: 'resolvedImageBase64',
                    originalSrc: srcToResolve,
                    base64,
                  });
                }
              };
              reader.readAsDataURL(blob);
            })
            .catch(() => {
              // Silently swallow in background fetch fallback
            });
        } catch {}
      }
    }
  }, [loadContent, syncEntities, openLightbox, sendMessage]);

  // Sync readOnly state with TipTap editor
  useEffect(() => {
    if (isReadyRef.current) {
      handleCommand('setEditable', { editable: !readOnly });
    }
  }, [readOnly, handleCommand]);

  // Unmount flush: persist pending change strictly when component unmounts
  useEffect(() => {
    return () => {
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current);
        onChangeRef.current?.(latestDocRef.current);
      }
    };
  }, []);

  // Focus mode toggle
  const handleToggleFocus = () => {
    const next = !isFocusMode;
    setIsFocusMode(next);
    handleCommand('setFocusMode', { enabled: next });
  };

  // Typewriter scrolling toggle
  const handleToggleTypewriter = () => {
    const next = !isTypewriter;
    setIsTypewriter(next);
    handleCommand('setTypewriterMode', { enabled: next });
  };

  // Theme change
  const handleSelectTheme = (theme: ThemeMode) => {
    setCurrentTheme(theme);
    handleCommand('setTheme', { theme });
  };

  // Page width change
  const handleSelectWidth = (width: PageWidthOption) => {
    setCurrentWidth(width);
    handleCommand('setPageWidth', { width });
  };

  // Zoom change
  const handleSelectZoom = (zoom: ZoomOption) => {
    setCurrentZoom(zoom);
    handleCommand('setZoom', { zoom: `${zoom}%` });
  };

  // Headings outline navigation
  const handleSelectHeading = (pos: number) => {
    handleCommand('scrollToPos', { pos });
  };

  // Find & Replace actions
  const handleOpenFind = (replace = false) => {
    setFindVisible(true);
    setIsReplaceMode(replace);
  };

  const handleCloseFind = () => {
    setFindVisible(false);
    handleCommand('findText', { query: '' });
  };

  const handleSearch = (query: string, caseSensitive: boolean) => {
    handleCommand('findText', { query, caseSensitive });
  };

  const handleNextMatch = () => {
    handleCommand('findNext');
  };

  const handlePrevMatch = () => {
    handleCommand('findPrev');
  };

  const handleReplaceCurrent = (replaceText: string) => {
    handleCommand('replaceCurrent', { replaceText });
  };

  const handleReplaceAll = (replaceText: string) => {
    handleCommand('replaceAll', { replaceText });
  };

  const handleApplyLink = () => {
    if (linkUrl.trim()) {
      handleCommand('setLink', { href: linkUrl.trim() });
    } else {
      handleCommand('unsetLink');
    }
    setShowLinkModal(false);
    setLinkUrl('');
  };

  const handleApplyImage = () => {
    if (imageUrl.trim()) {
      handleCommand('insertImage', { src: imageUrl.trim() });
    }
    setShowImageModal(false);
    setImageUrl('');
  };

  // Image insertion: opens native Windows file explorer once, reads image, and embeds cleanly into document
  const handlePickImage = useCallback(async () => {
    setShowImageModal(false);
    try {
      const res = await pickImageFromComputer();
      if (res) {
        const srcToInsert = res.base64 || res.uri;
        handleCommand('insertImage', { src: srcToInsert });
      }
    } catch (err) {
      console.error('[WysiwygEditor] pickImageFromComputer failed:', err);
    }
  }, [handleCommand]);

  // Snapshots
  const handleSaveSnapshot = (label: string) => {
    const delta = wordCount - lastSnapshotWordsRef.current;
    lastSnapshotWordsRef.current = wordCount;
    const newSnap: EditorSnapshot = {
      id: `snap-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      label: label.trim() || 'Manual Snapshot',
      doc: JSON.parse(JSON.stringify(latestDocRef.current)),
      wordCount,
      wordDelta: delta,
    };
    setSnapshots(prev => [newSnap, ...prev]);
  };

  const handleRestoreSnapshot = (snap: EditorSnapshot) => {
    loadContent(snap.doc);
    onChangeRef.current?.(snap.doc);
  };

  // Footnotes
  const handleAddFootnote = () => {
    handleCommand('insertFootnote');
  };

  const handleUpdateFootnote = (id: string, text: string) => {
    setFootnotes(prev => prev.map(f => f.id === id ? { ...f, text } : f));
  };

  const handleDeleteFootnote = (id: string) => {
    setFootnotes(prev => prev.filter(f => f.id !== id));
  };

  const handleSelectFootnote = (id: string) => {
    setSelectedFootnoteId(id);
    handleCommand('locateFootnote', { id });
  };

  // Entity Picker Modal items
  const filteredEntities = entities.filter(ent => {
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return ent.title.toLowerCase().includes(q) || (ent.category && ent.category.toLowerCase().includes(q));
  });

  const handleInsertEntityFromPicker = (ent: WikiEntity) => {
    if (pickerModalMode === 'wiki') {
      handleCommand('insertWikiLink', { entity: ent });
    } else if (pickerModalMode === 'mention') {
      handleCommand('insertMention', { entity: ent });
    }
    setPickerModalMode(null);
    setPickerSearch('');
  };

  const handleInsertCustomLink = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const fakeEntity: WikiEntity = {
      id: `custom-${Date.now().toString(36)}`,
      title: trimmed,
      type: pickerModalMode === 'wiki' ? 'entry' : 'character',
    };
    handleInsertEntityFromPicker(fakeEntity);
  };

  const WebViewComponent = WebView as any;

  return (
    <View style={styles.container}>
      {!readOnly && (
        <WysiwygToolbar
          selectionState={selectionState}
          onCommand={handleCommand}
          onPickImage={handlePickImage}
          isFocusMode={isFocusMode}
          isTypewriter={isTypewriter}
          isOutlineOpen={isOutlineOpen}
          headingCount={headings.length}
          onToggleFocus={handleToggleFocus}
          onToggleTypewriter={handleToggleTypewriter}
          onToggleOutline={() => {
            setIsOutlineOpen(!isOutlineOpen);
          }}
          onOpenFind={handleOpenFind}
          onOpenViewSettings={() => setViewSettingsVisible(true)}
          // Phase 3 Toolbar Props:
          isHistoryOpen={isHistoryOpen}
          snapshotCount={snapshots.length}
          onToggleHistory={() => {
            setIsHistoryOpen(!isHistoryOpen);
            if (!isHistoryOpen) {
              setIsBacklinksOpen(false);
              setIsFootnotesOpen(false);
            }
          }}
          isBacklinksOpen={isBacklinksOpen}
          backlinksCount={backlinks.length}
          onToggleBacklinks={() => {
            setIsBacklinksOpen(!isBacklinksOpen);
            if (!isBacklinksOpen) {
              setIsHistoryOpen(false);
              setIsFootnotesOpen(false);
            }
          }}
          isFootnotesOpen={isFootnotesOpen}
          footnotesCount={footnotes.length}
          onToggleFootnotes={() => {
            setIsFootnotesOpen(!isFootnotesOpen);
            if (!isFootnotesOpen) {
              setIsHistoryOpen(false);
              setIsBacklinksOpen(false);
            }
          }}
          onOpenExport={() => setIsExportOpen(true)}
          onOpenLink={() => {
            setShowLinkModal(true);
            setLinkUrl('');
          }}
          onOpenImage={() => {
            setShowImageModal(true);
            setImageUrl('');
          }}
          onInsertWikiLink={() => {
            setPickerModalMode('wiki');
            setPickerSearch('');
          }}
          onInsertMention={() => {
            setPickerModalMode('mention');
            setPickerSearch('');
          }}
          onInsertFootnote={handleAddFootnote}
        />
      )}

      {/* Find and Replace Floating Panel */}
      <WysiwygFindReplace
        visible={findVisible}
        isReplaceMode={isReplaceMode}
        matchCount={matchCount}
        matchIndex={matchIndex}
        onSearch={handleSearch}
        onNext={handleNextMatch}
        onPrev={handlePrevMatch}
        onReplace={handleReplaceCurrent}
        onReplaceAll={handleReplaceAll}
        onClose={handleCloseFind}
        onToggleMode={() => setIsReplaceMode(!isReplaceMode)}
      />

      {/* Main Workspace Body with optional Drawers */}
      <View style={styles.workspaceRow}>
        {/* Left Drawer: Outline */}
        <WysiwygOutline
          visible={isOutlineOpen}
          headings={headings}
          onSelectHeading={handleSelectHeading}
          onClose={() => setIsOutlineOpen(false)}
        />

        {/* Center: Continuous Docs Writing Surface */}
        <View
          style={[
            styles.webViewContainer,
            {
              backgroundColor: currentTheme === 'sepia'
                ? '#FBF0D9'
                : currentTheme === 'dark'
                ? '#18181B'
                : '#FAF9F5',
            },
            isAnyOverlayOpen && { display: 'none' },
          ]}
        >
          <WebViewComponent
            ref={webViewRef}
            useWebView2={true}
            source={{ html: EDITOR_HTML, baseUrl: 'file:///' }}
            originWhitelist={['*']}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleMessage}
            onLoadEnd={() => {
              if (!isReadyRef.current) {
                loadContent(latestDocRef.current);
              }
            }}
            style={[
              styles.webView,
              {
                backgroundColor: currentTheme === 'sepia'
                  ? '#FBF0D9'
                  : currentTheme === 'dark'
                  ? '#18181B'
                  : '#FAF9F5',
              },
            ]}
            containerStyle={styles.webView}
            scrollEnabled={true}
          />
        </View>

        {/* Right Drawers (mutually exclusive) */}
        <WysiwygHistory
          visible={isHistoryOpen}
          snapshots={snapshots}
          currentWordCount={wordCount}
          onClose={() => setIsHistoryOpen(false)}
          onSaveSnapshot={handleSaveSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
        />

        <WysiwygBacklinks
          visible={isBacklinksOpen}
          backlinks={backlinks}
          onClose={() => setIsBacklinksOpen(false)}
          onOpenSource={(sourceId, sourceType) => {
            onOpenEntity?.({
              id: sourceId,
              type: sourceType,
              title: sourceId,
            });
          }}
        />

        <WysiwygFootnotes
          visible={isFootnotesOpen}
          footnotes={footnotes}
          selectedFootnoteId={selectedFootnoteId}
          onClose={() => setIsFootnotesOpen(false)}
          onAddFootnote={handleAddFootnote}
          onUpdateFootnote={handleUpdateFootnote}
          onDeleteFootnote={handleDeleteFootnote}
          onSelectFootnote={handleSelectFootnote}
        />
      </View>

      {/* Status Bar with Word Goal */}
      <WysiwygStatusBar
        wordCount={wordCount}
        characterCount={characterCount}
        selectionWordCount={selectionState.selectionWordCount}
        isSaving={isSaving}
        wordGoal={wordGoal}
        onUpdateWordGoal={(goal: number) => {
          setWordGoal(goal);
          onWordGoalChange?.(goal);
        }}
      />

      {/* View Settings Modal */}
      <WysiwygViewSettings
        visible={viewSettingsVisible}
        currentTheme={currentTheme}
        currentWidth={currentWidth}
        currentZoom={currentZoom}
        onSelectTheme={handleSelectTheme}
        onSelectWidth={handleSelectWidth}
        onSelectZoom={handleSelectZoom}
        onClose={() => setViewSettingsVisible(false)}
      />

      {/* Export Document Modal */}
      <WysiwygExportModal
        visible={isExportOpen}
        doc={latestDocRef.current}
        footnotes={footnotes}
        meta={meta}
        onClose={() => setIsExportOpen(false)}
        onCopyText={(text) => handleCommand('copyToClipboard', { text })}
      />

      {/* Entity Picker Dialog (In-App Overlay) */}
      {pickerModalMode && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPickerModalMode(null)}
          />
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.card}
            shadowOffset={6}
            style={styles.pickerBox}
          >
            <View style={styles.pickerHeader}>
              <View style={styles.pickerHeaderLeft}>
                <BrutalPill
                  label={pickerModalMode === 'wiki' ? '[[ WIKI LINK ]]' : '@ MENTION'}
                  fill={YELLOW}
                  size="sm"
                />
                <Text style={styles.pickerTitle}>
                  {pickerModalMode === 'wiki' ? 'LINK PROJECT ENTITY' : 'MENTION CHARACTER OR LORE'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPickerModalMode(null)}
                style={styles.pickerCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchRow}>
              <BrutalTextInput
                size="md"
                fill={CREAM}
                placeholder="Type to search entries or create custom link..."
                placeholderTextColor="#888888"
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoFocus
                style={{ width: '100%', borderRadius: 6 }}
              />
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {/* Option to insert whatever author typed as a custom link */}
              {pickerSearch.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInsertCustomLink(pickerSearch)}
                  style={styles.pickerCustomBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pickerCustomBtnText}>
                    ➕ CREATE LINK: {pickerModalMode === 'wiki' ? `[[ ${pickerSearch.trim()} ]]` : `@${pickerSearch.trim()}`}
                  </Text>
                  <Text style={styles.pickerCustomBtnSub}>Insert as custom link</Text>
                </TouchableOpacity>
              )}

              {filteredEntities.length === 0 && !pickerSearch.trim() ? (
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerEmptyText}>No project entities yet.</Text>
                  <Text style={styles.pickerEmptySub}>Type any name above to insert a link directly into your chapter!</Text>
                </View>
              ) : (
                filteredEntities.map(ent => (
                  <TouchableOpacity
                    key={ent.id}
                    onPress={() => handleInsertEntityFromPicker(ent)}
                    style={styles.pickerItem}
                    activeOpacity={0.8}
                  >
                    <View style={styles.pickerItemLeft}>
                      <BrutalPill
                        label={(ent.type || 'entry').toUpperCase()}
                        fill={pickerModalMode === 'wiki' ? YELLOW : '#BAE6FD'}
                        size="sm"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemTitle}>{ent.title}</Text>
                        {ent.subtitle ? (
                          <Text style={styles.pickerItemSub} numberOfLines={1}>
                            {ent.subtitle}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.pickerInsertPill}>
                      <Text style={styles.pickerItemInsert}>INSERT ↵</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </BrutalBox>
        </View>
      )}

      {/* Hyperlink Input Overlay (In-App Overlay) */}
      {showLinkModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLinkModal(false)}
          />
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.card}
            shadowOffset={4}
            style={{ width: 380, padding: 20 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>
                INSERT HYPERLINK
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                }}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <BrutalTextInput
              size="md"
              fill={CREAM}
              placeholder="https://example.com"
              placeholderTextColor="#888"
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoFocus
              style={{ borderRadius: 6, marginBottom: 14 }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApplyLink}
                style={styles.applyBtn}
              >
                <Text style={styles.applyBtnText}>APPLY LINK</Text>
              </TouchableOpacity>
            </View>
          </BrutalBox>
        </View>
      )}

      {/* Image Insertion Overlay (In-App Overlay) */}
      {showImageModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowImageModal(false)}
          />
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.card}
            shadowOffset={6}
            style={{ width: 440, padding: 20 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BrutalBox
                  fill={YELLOW}
                  borderColor={INK}
                  borderWidth={BORDER.width}
                  radius={RADIUS.small}
                  shadowOffset={0}
                  style={{ paddingHorizontal: 8, height: 22, justifyContent: 'center' }}
                >
                  <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 10, fontWeight: '900', color: INK }}>IMAGE</Text>
                </BrutalBox>
                <Text style={styles.modalTitle}>INSERT CHAPTER IMAGE</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                }}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Option A: Choose from Computer */}
            <TouchableOpacity
              onPress={() => {
                setShowImageModal(false);
                handlePickImage();
              }}
              style={styles.filePickerBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.filePickerBtnText}>📁 CHOOSE IMAGE FROM COMPUTER</Text>
              <Text style={styles.filePickerBtnSub}>Loads image file directly with instant visual preview in document</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 14 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: INK, opacity: 0.2 }} />
              <Text style={{ marginHorizontal: 10, fontFamily: 'SpaceGrotesk-Bold', fontSize: 10, fontWeight: '900', color: '#777' }}>OR PASTE WEB URL</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: INK, opacity: 0.2 }} />
            </View>

            {/* Option B: Direct URL */}
            <BrutalTextInput
              size="md"
              fill={CREAM}
              placeholder="https://example.com/illustration.png"
              placeholderTextColor="#888"
              value={imageUrl}
              onChangeText={setImageUrl}
              style={{ borderRadius: 6, marginBottom: 12 }}
            />

            {/* Live Image Preview */}
            {imageUrl.trim().length > 5 && (
              <View style={styles.imagePreviewBox}>
                <Image
                  source={{ uri: imageUrl.trim() }}
                  style={{ width: '100%', height: 120, borderRadius: 4 }}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowImageModal(false);
                  setImageUrl('');
                }}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApplyImage}
                disabled={!imageUrl.trim()}
                style={[styles.applyBtn, !imageUrl.trim() && { opacity: 0.4 }]}
              >
                <Text style={styles.applyBtnText}>INSERT IMAGE</Text>
              </TouchableOpacity>
            </View>
          </BrutalBox>
        </View>
      )}
  </View>
);
};

const styles = StyleSheet.create({
container: {
  flex: 1,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#FAF9F5',
},
workspaceRow: {
  flex: 1,
  height: '100%',
  flexDirection: 'row',
  overflow: 'hidden',
},
webViewContainer: {
  flex: 1,
  height: '100%',
},
webView: {
  flex: 1,
  width: '100%',
  height: '100%',
},
modalOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(20, 20, 20, 0.65)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
  zIndex: 99999,
},
modalTitle: {
  fontFamily: 'SpaceGrotesk-Bold',
  fontSize: 14,
  fontWeight: '900',
  color: INK,
  letterSpacing: -0.2,
},
modalCloseBtn: {
  width: 24,
  height: 24,
  borderWidth: 2,
  borderColor: INK,
  borderRadius: 4,
  backgroundColor: WHITE,
  alignItems: 'center',
  justifyContent: 'center',
},
modalCloseText: {
  fontSize: 11,
  fontWeight: '900',
  color: INK,
},
modalInput: {
  height: 40,
  borderWidth: 2,
  borderColor: INK,
  borderRadius: 6,
  paddingHorizontal: 12,
  fontFamily: 'DM Sans',
  fontSize: 13,
  color: INK,
  backgroundColor: CREAM,
  marginBottom: 14,
},
modalActions: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 6,
},
cancelBtn: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderWidth: 2,
  borderColor: INK,
  borderRadius: 6,
  backgroundColor: CREAM,
  alignItems: 'center',
  justifyContent: 'center',
},
cancelBtnText: {
  fontFamily: 'SpaceGrotesk-Bold',
  fontSize: 11,
  fontWeight: '800',
  color: INK,
},
applyBtn: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderWidth: 2,
  borderColor: INK,
  borderRadius: 6,
  backgroundColor: YELLOW,
  alignItems: 'center',
  justifyContent: 'center',
},
applyBtnText: {
  fontFamily: 'SpaceGrotesk-Bold',
  fontSize: 11,
  fontWeight: '900',
  color: INK,
},
filePickerBtn: {
  borderWidth: 2,
  borderColor: INK,
  borderRadius: 6,
  backgroundColor: '#FEF08A',
  paddingVertical: 12,
  paddingHorizontal: 14,
  alignItems: 'center',
  justifyContent: 'center',
},
filePickerBtnText: {
  fontFamily: 'SpaceGrotesk-Bold',
  fontSize: 12,
  fontWeight: '900',
  color: INK,
  marginBottom: 2,
},
filePickerBtnSub: {
  fontFamily: 'DM Sans',
  fontSize: 10,
  color: '#555555',
  textAlign: 'center',
},
imagePreviewBox: {
  borderWidth: 2,
  borderColor: INK,
  borderRadius: 6,
  backgroundColor: WHITE,
  padding: 8,
  marginBottom: 14,
  alignItems: 'center',
  justifyContent: 'center',
},
  pickerBox: {
    width: 480,
    height: 420,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  pickerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pickerTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.2,
  },
  pickerCloseBtn: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseText: {
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },
  pickerSearchRow: {
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: WHITE,
    width: '100%',
  },
  pickerInput: {
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: INK,
  },
  pickerCustomBtn: {
    backgroundColor: '#FEF08A',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pickerCustomBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '900',
    color: INK,
  },
  pickerCustomBtnSub: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    color: '#666666',
    marginTop: 2,
  },
  pickerList: {
    flex: 1,
    minHeight: 250,
    padding: 12,
  },
  pickerEmpty: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmptyText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: INK,
  },
  pickerEmptySub: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#777777',
    marginTop: 6,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
    marginBottom: 8,
    minHeight: 52,
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pickerItemTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: INK,
  },
  pickerItemSub: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    color: '#666666',
    marginTop: 1,
  },
  pickerInsertPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: CREAM,
    borderRadius: 4,
  },
  pickerItemInsert: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '900',
    color: INK,
  },
});

export default WysiwygEditor;
