/**
 * src/components/MiniTipTapEditor.tsx
 *
 * Lightweight TipTap WYSIWYG editor variant for short fields:
 * - Overview / summary
 * - Ability description
 *
 * Features:
 * - Inline formatting only (bold, italic, underline, strike, inline code, highlight / text color)
 * - Compact Neobrutalist toolbar with real-time active state indicators
 * - Reuses existing offline TipTap bundle / WebView2 infrastructure (zero disk space added)
 * - Injected compact styles (removes full-page paddings & suppresses slash commands/blocks)
 * - Configurable height (e.g. 70-140px for abilities, 90-200px for overview)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { EDITOR_HTML } from '../assets/editor/editorHtml';
import { INK, RADIUS, WHITE, YELLOW, TEAL, LAVENDER } from '../theme/brutal';
import { TipTapDoc } from './WysiwygEditor/types';
import { migrateToTipTapDoc } from './WysiwygEditor/WysiwygEditor';
import { tipTapDocToHtml, toPlainText } from '../utils/richText';

const TEXT_COLOR_PALETTE = [
  { label: 'Ink', color: '#111111' },
  { label: 'Gold', color: '#D97706' },
  { label: 'Crimson', color: '#DC2626' },
  { label: 'Emerald', color: '#059669' },
  { label: 'Blue', color: '#2563EB' },
  { label: 'Purple', color: '#7C3AED' },
  { label: 'Pink', color: '#DB2777' },
];

const WebViewComponent = WebView as any;

interface MiniTipTapEditorProps {
  value?: string | TipTapDoc;
  onChange?: (html: string, doc?: TipTapDoc) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  compact?: boolean;
  style?: ViewStyle;
}

export const MiniTipTapEditor: React.FC<MiniTipTapEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type description...',
  minHeight = 80,
  maxHeight = 160,
  compact = false,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const isReadyRef = useRef<boolean>(false);
  const latestDocRef = useRef<TipTapDoc>(migrateToTipTapDoc(value));
  const onChangeRef = useRef(onChange);

  const [activeMarks, setActiveMarks] = useState<Record<string, boolean>>({});
  const [currentColor, setCurrentColor] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [showColorBar, setShowColorBar] = useState<boolean>(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Send message helper to WebView
  const sendMessage = useCallback((msg: Record<string, any>) => {
    const msgId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const enriched = { ...msg, _msgId: msgId };
    const json = JSON.stringify(enriched);

    try {
      webViewRef.current?.postMessage(json);
    } catch {}
    try {
      webViewRef.current?.injectJavaScript(`window.handleRNMessage(${json});true;`);
    } catch {}
  }, []);

  const handleCommand = useCallback(
    (action: string, params?: Record<string, any>) => {
      if (action === 'setColor') {
        setCurrentColor(params?.color || null);
        if (params?.color) {
          webViewRef.current?.injectJavaScript(`
            try {
              if (window.editor) {
                window.editor.chain().focus().setColor('${params.color}').run();
              }
            } catch(e) {}
            true;
          `);
        } else {
          webViewRef.current?.injectJavaScript(`
            try {
              if (window.editor) {
                if (window.editor.commands.unsetColor) {
                  window.editor.chain().focus().unsetColor().run();
                } else {
                  window.editor.chain().focus().setColor('#111111').run();
                }
              }
            } catch(e) {}
            true;
          `);
        }
      }
      sendMessage({
        type: 'command',
        action,
        ...params,
      });
    },
    [sendMessage]
  );

  // Injected CSS and scripts to adapt TipTap into a compact mini editor
  const injectedMiniStyles = `
    (function() {
      try {
        var style = document.createElement('style');
        style.innerHTML = \`
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100% !important;
            height: auto !important;
            background: #FFFFFF !important;
            overflow-x: hidden !important;
          }
          #editor {
            margin: 0 !important;
            padding: 8px 10px !important;
            max-width: 100% !important;
            min-height: 50px !important;
            font-size: 14px !important;
            line-height: 1.55 !important;
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
          .ProseMirror {
            outline: none !important;
            min-height: 48px !important;
          }
          .ProseMirror p {
            margin: 0 0 6px 0 !important;
            line-height: 1.45 !important;
          }
          .ProseMirror p:last-child {
            margin-bottom: 0 !important;
          }
          /* Suppress slash menu & large blocks */
          #slash-menu, .slash-menu {
            display: none !important;
          }
        \`;
        document.head.appendChild(style);
      } catch (e) {}
    })();
    true;
  `;

  // Handle incoming messages from WebView
  const handleMessage = useCallback(
    (event: any) => {
      const rawData = event.nativeEvent?.data;
      if (!rawData) return;

      try {
        const msg = JSON.parse(rawData);

        if (msg.type === 'ready') {
          isReadyRef.current = true;
          // Apply compact styles & load initial document
          webViewRef.current?.injectJavaScript(injectedMiniStyles);
          const initialDoc = migrateToTipTapDoc(value);
          latestDocRef.current = initialDoc;
          sendMessage({
            type: 'load',
            doc: initialDoc,
          });
        } else if (msg.type === 'change') {
          latestDocRef.current = msg.doc;
          const html = tipTapDocToHtml(msg.doc);
          onChangeRef.current?.(html, msg.doc);
        } else if (msg.type === 'selection') {
          setActiveMarks(msg.activeMarks || {});
          if (typeof msg.activeMarks?.color === 'string') {
            setCurrentColor(msg.activeMarks.color);
          } else if (msg.activeMarks?.color === null) {
            setCurrentColor(null);
          }
          setCanUndo(!!msg.canUndo);
          setCanRedo(!!msg.canRedo);
        }
      } catch {}
    },
    [injectedMiniStyles, sendMessage, value]
  );

  return (
    <View
      style={[
        styles.container,
        {
          minHeight: minHeight + 36,
          maxHeight: maxHeight + 36,
        },
        style,
      ]}
    >
      {/* ── Compact Formatting Toolbar ────────────────────────────── */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarGroup}>
          {/* Bold */}
          <TouchableOpacity
            onPress={() => handleCommand('toggleBold')}
            style={[styles.toolBtn, activeMarks.bold && styles.toolBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, styles.boldText, activeMarks.bold && styles.activeText]}>
              B
            </Text>
          </TouchableOpacity>

          {/* Italic */}
          <TouchableOpacity
            onPress={() => handleCommand('toggleItalic')}
            style={[styles.toolBtn, activeMarks.italic && styles.toolBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, styles.italicText, activeMarks.italic && styles.activeText]}>
              I
            </Text>
          </TouchableOpacity>

          {/* Underline */}
          <TouchableOpacity
            onPress={() => handleCommand('toggleUnderline')}
            style={[styles.toolBtn, activeMarks.underline && styles.toolBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, styles.underlineText, activeMarks.underline && styles.activeText]}>
              U
            </Text>
          </TouchableOpacity>

          {/* Strike */}
          <TouchableOpacity
            onPress={() => handleCommand('toggleStrike')}
            style={[styles.toolBtn, activeMarks.strike && styles.toolBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, styles.strikeText, activeMarks.strike && styles.activeText]}>
              S
            </Text>
          </TouchableOpacity>

          {/* Inline Code */}
          <TouchableOpacity
            onPress={() => handleCommand('toggleCode')}
            style={[styles.toolBtn, activeMarks.code && styles.toolBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, styles.codeText, activeMarks.code && styles.activeText]}>
              {'</>'}
            </Text>
          </TouchableOpacity>

          {/* Text Color Picker Toggle */}
          <TouchableOpacity
            onPress={() => setShowColorBar(!showColorBar)}
            style={[styles.toolBtn, (showColorBar || !!currentColor) && styles.toolBtnActive]}
            activeOpacity={0.7}
          >
            <View style={styles.colorBtnContent}>
              <Text
                style={[
                  styles.toolBtnText,
                  styles.boldText,
                  { color: currentColor || INK },
                ]}
              >
                A
              </Text>
              <View
                style={[
                  styles.colorUnderline,
                  { backgroundColor: currentColor || '#F59E0B' },
                ]}
              />
            </View>
          </TouchableOpacity>

          {/* Clear Formatting */}
          <TouchableOpacity
            onPress={() => handleCommand('clearFormatting')}
            style={styles.toolBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, { fontSize: 10, color: '#666666' }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Undo / Redo */}
        <View style={styles.toolbarGroup}>
          <TouchableOpacity
            onPress={() => handleCommand('undo')}
            style={[styles.toolBtn, !canUndo && styles.toolBtnDisabled]}
            disabled={!canUndo}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, !canUndo && styles.disabledText]}>↺</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleCommand('redo')}
            style={[styles.toolBtn, !canRedo && styles.toolBtnDisabled]}
            disabled={!canRedo}
            activeOpacity={0.7}
          >
            <Text style={[styles.toolBtnText, !canRedo && styles.disabledText]}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sub-bar: Text Color Swatches ───────────────────────────── */}
      {showColorBar && (
        <View style={styles.colorBar}>
          <Text style={styles.colorBarLabel}>TEXT COLOR:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.swatchRow}>
              {TEXT_COLOR_PALETTE.map(p => {
                const isSelected = currentColor === p.color;
                return (
                  <TouchableOpacity
                    key={p.color}
                    onPress={() => {
                      handleCommand('setColor', { color: p.color });
                      setShowColorBar(false);
                    }}
                    style={[
                      styles.swatch,
                      { backgroundColor: p.color },
                      isSelected && { borderWidth: 2, borderColor: YELLOW },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.swatchText, { color: p.color === '#111111' ? '#FFFFFF' : '#FFFFFF' }]}>
                      A
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => {
                  handleCommand('setColor', { color: null });
                  setShowColorBar(false);
                }}
                style={[styles.swatch, { backgroundColor: WHITE, borderWidth: 1 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.swatchText}>✕</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ── TipTap Mini WebView Surface ───────────────────────────── */}
      <View style={[styles.webViewContainer, { minHeight, maxHeight }]}>
        <WebViewComponent
          ref={webViewRef}
          useWebView2={true}
          originWhitelist={['*']}
          source={{ html: EDITOR_HTML, baseUrl: 'file:///' }}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          onMessage={handleMessage}
          injectedJavaScript={injectedMiniStyles}
          style={styles.webView}
          scrollEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.small,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: WHITE,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
  },
  toolbarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  toolBtn: {
    minWidth: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toolBtnActive: {
    backgroundColor: YELLOW,
    borderColor: INK,
    borderWidth: 1.5,
  },
  toolBtnDisabled: {
    opacity: 0.35,
  },
  toolBtnText: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '800',
    color: INK,
  },
  activeText: {
    color: INK,
    fontWeight: '900',
  },
  disabledText: {
    color: '#888888',
  },
  boldText: {
    fontWeight: '900',
  },
  italicText: {
    fontStyle: 'italic',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  strikeText: {
    textDecorationLine: 'line-through',
  },
  codeText: {
    fontFamily: 'Consolas',
    fontSize: 10,
    fontWeight: '700',
  },
  colorBtnContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorUnderline: {
    width: 14,
    height: 3,
    borderRadius: 1,
    marginTop: 1,
  },
  highlightPill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 6,
  },
  colorBarLabel: {
    fontFamily: 'Outfit',
    fontSize: 9,
    fontWeight: '800',
    color: INK,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchText: {
    fontSize: 9,
    fontWeight: '800',
    color: INK,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: WHITE,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default MiniTipTapEditor;
