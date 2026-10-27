/**
 * src/components/WysiwygEditor/WysiwygExportModal.tsx
 *
 * Neobrutalist Export Dialog for WYSIWYG Editor:
 * - Export to Markdown (.md) or Microsoft Word (.doc)
 * - Formatted live preview
 * - One-click Copy to Clipboard with visual feedback
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BrutalTextInput } from '../brutal/BrutalTextInput';
import {
  BORDER,
  CREAM,
  INK,
  RADIUS,
  WHITE,
  YELLOW,
} from '../../theme/brutal';
import BrutalBox from '../brutal/BrutalBox';
import BrutalButton from '../brutal/BrutalButton';
import BrutalPill from '../brutal/BrutalPill';
import { exportToMarkdown, exportToWordHtml } from '../../utils/editorExport';
import type { EditorFootnote, TipTapDoc } from './types';

interface Props {
  visible: boolean;
  doc: TipTapDoc;
  footnotes?: EditorFootnote[];
  meta?: { title?: string; subtitle?: string };
  onClose: () => void;
  onCopyText: (text: string) => void;
}

export const WysiwygExportModal: React.FC<Props> = ({
  visible,
  doc,
  footnotes = [],
  meta,
  onClose,
  onCopyText,
}) => {
  const [activeTab, setActiveTab] = useState<'markdown' | 'word'>('markdown');
  const [copied, setCopied] = useState(false);

  const markdownContent = useMemo(() => {
    return exportToMarkdown(doc, footnotes, meta);
  }, [doc, footnotes, meta]);

  const wordHtmlContent = useMemo(() => {
    return exportToWordHtml(doc, footnotes, meta);
  }, [doc, footnotes, meta]);

  const currentContent = activeTab === 'markdown' ? markdownContent : wordHtmlContent;
  const wordCount = useMemo(() => {
    return markdownContent.trim() ? markdownContent.trim().split(/\s+/).length : 0;
  }, [markdownContent]);

  const handleCopy = () => {
    onCopyText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <BrutalBox
          fill={WHITE}
          borderColor={INK}
          borderWidth={BORDER.width}
          radius={RADIUS.card}
          shadowOffset={6}
          style={styles.modalCard}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>EXPORT DOCUMENT</Text>
              <BrutalPill
                label={`${wordCount} WORDS`}
                fill={CREAM}
                size="sm"
              />
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Format Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => {
                setActiveTab('markdown');
                setCopied(false);
              }}
              style={[
                styles.tabBtn,
                activeTab === 'markdown' && styles.tabBtnActive,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'markdown' && styles.tabTextActive,
                ]}
              >
                📝 MARKDOWN (.MD)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab('word');
                setCopied(false);
              }}
              style={[
                styles.tabBtn,
                activeTab === 'word' && styles.tabBtnActive,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'word' && styles.tabTextActive,
                ]}
              >
                📄 WORD DOCUMENT (.DOC)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview Box */}
          <View style={styles.previewContainer}>
            <ScrollView style={styles.previewScroll}>
              <BrutalTextInput
                variant="multiline"
                fill="transparent"
                borderWidth={0}
                editable={false}
                value={currentContent}
                style={styles.previewText}
              />
            </ScrollView>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Text style={styles.footerHint}>
              {activeTab === 'markdown'
                ? 'Compatible with Obsidian, GitHub, Notion, and Hugo.'
                : 'Compatible with Microsoft Word, LibreOffice, and Google Docs.'}
            </Text>

            <View style={styles.footerButtons}>
              <BrutalButton
                label="CANCEL"
                variant="secondary"
                size="sm"
                onPress={onClose}
              />
              <BrutalButton
                label={copied ? '✓ COPIED TO CLIPBOARD!' : '📋 COPY TO CLIPBOARD'}
                variant="primary"
                size="sm"
                onPress={handleCopy}
              />
            </View>
          </View>
        </BrutalBox>
      </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 99999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '85%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 13,
    fontWeight: '900',
    color: INK,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: WHITE,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
    backgroundColor: WHITE,
  },
  tabBtnActive: {
    backgroundColor: YELLOW,
    borderBottomWidth: 2,
    borderBottomColor: INK,
  },
  tabText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '800',
    color: '#666666',
  },
  tabTextActive: {
    color: INK,
  },
  previewContainer: {
    flex: 1,
    minHeight: 280,
    maxHeight: 380,
    backgroundColor: '#FAFAF9',
    padding: 12,
  },
  previewScroll: {
    flex: 1,
  },
  previewText: {
    fontFamily: 'Consolas',
    fontSize: 12,
    lineHeight: 18,
    color: INK,
    padding: 0,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerHint: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontStyle: 'italic',
    color: '#666666',
    flex: 1,
    marginRight: 16,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default WysiwygExportModal;
