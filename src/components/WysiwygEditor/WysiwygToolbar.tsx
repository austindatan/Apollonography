/**
 * src/components/WysiwygEditor/WysiwygToolbar.tsx
 *
 * 2-Row Neobrutalist Formatting Toolbar for WYSIWYG Editor:
 * - Row 1: Document Panels, Views, Drawers, Modes & System Tools (with clear readable words)
 * - Row 2: Text Formatting, Typography, Lists, Alignments & Content Inserts
 * - Zero emoji ambiguity — crisp text labels + tactile brutalist buttons
 * - Zero transform crashes on React Native Windows
 */

import React, { useState } from 'react';
import {
  Image,
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
import type { SelectionState } from './types';

interface Props {
  selectionState: SelectionState;
  onCommand: (action: string, params?: Record<string, any>) => void;
  onPickImage?: () => void;
  // Phase 2 props:
  isFocusMode?: boolean;
  isTypewriter?: boolean;
  isOutlineOpen?: boolean;
  headingCount?: number;
  onToggleFocus?: () => void;
  onToggleTypewriter?: () => void;
  onToggleOutline?: () => void;
  onOpenFind?: (replace?: boolean) => void;
  onOpenViewSettings?: () => void;
  // Phase 3 props:
  isHistoryOpen?: boolean;
  snapshotCount?: number;
  onToggleHistory?: () => void;
  isBacklinksOpen?: boolean;
  backlinksCount?: number;
  onToggleBacklinks?: () => void;
  isFootnotesOpen?: boolean;
  footnotesCount?: number;
  onToggleFootnotes?: () => void;
  onOpenExport?: () => void;
  onOpenLink?: () => void;
  onOpenImage?: () => void;
  onInsertWikiLink?: () => void;
  onInsertMention?: () => void;
  onInsertFootnote?: () => void;
}

interface ToolbarButtonProps {
  label: string | React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  onPress: () => void;
  title?: string;
  width?: number;
  paddingHorizontal?: number;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  label,
  isActive = false,
  disabled = false,
  onPress,
  width,
  paddingHorizontal = 7,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <BrutalBox
        fill={isActive ? YELLOW : CREAM}
        borderColor={INK}
        borderWidth={BORDER.width}
        radius={RADIUS.small}
        shadowOffset={isActive ? 0 : 2}
        style={{
          width,
          minWidth: width ? undefined : 28,
          height: 26,
          paddingHorizontal: width ? 0 : paddingHorizontal,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: isActive ? 1 : 0,
        }}
      >
        {typeof label === 'string' ? (
          <Text
            style={{
              fontFamily: 'SpaceGrotesk-Bold',
              fontSize: 10,
              fontWeight: '900',
              color: INK,
              letterSpacing: -0.2,
            }}
          >
            {label}
          </Text>
        ) : (
          label
        )}
      </BrutalBox>
    </TouchableOpacity>
  );
};

const ToolbarDivider = () => (
  <View
    style={{
      width: 1.5,
      height: 16,
      backgroundColor: INK,
      marginHorizontal: 3,
      opacity: 0.25,
      alignSelf: 'center',
    }}
  />
);

export const WysiwygToolbar: React.FC<Props> = ({
  selectionState,
  onCommand,
  onPickImage,
  isFocusMode = false,
  isTypewriter = false,
  isOutlineOpen = false,
  headingCount = 0,
  onToggleFocus,
  onToggleTypewriter,
  onToggleOutline,
  onOpenFind,
  onOpenViewSettings,
  isHistoryOpen = false,
  snapshotCount = 0,
  onToggleHistory,
  isBacklinksOpen = false,
  backlinksCount = 0,
  onToggleBacklinks,
  isFootnotesOpen = false,
  footnotesCount = 0,
  onToggleFootnotes,
  onOpenExport,
  onOpenLink,
  onOpenImage,
  onInsertWikiLink,
  onInsertMention,
  onInsertFootnote,
}) => {
  const { activeMarks, activeNodes, canUndo, canRedo } = selectionState;
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleApplyLink = () => {
    if (linkUrl.trim()) {
      onCommand('setLink', { href: linkUrl.trim() });
    } else {
      onCommand('unsetLink');
    }
    setShowLinkModal(false);
    setLinkUrl('');
  };

  const handleApplyImage = () => {
    if (imageUrl.trim()) {
      onCommand('insertImage', { src: imageUrl.trim(), alt: 'chapter illustration' });
      setShowImageModal(false);
      setImageUrl('');
    }
  };

  return (
    <View style={styles.container}>
      {/* ── ROW 1: Document Tools, Panels & Drawers ──────────────── */}
      <View style={styles.rowWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContent}
        >
          {/* Section: Drawers & Navigation */}
          {onToggleOutline && (
            <ToolbarButton
              label={
                <View style={styles.badgeRow}>
                  <Text style={styles.btnText}>OUTLINE</Text>
                  {headingCount > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{headingCount}</Text>
                    </View>
                  )}
                </View>
              }
              isActive={isOutlineOpen}
              onPress={onToggleOutline}
              title="Table of Contents / Outline"
              paddingHorizontal={8}
            />
          )}

          {onToggleHistory && (
            <ToolbarButton
              label={
                <View style={styles.badgeRow}>
                  <Text style={styles.btnText}>HISTORY</Text>
                  {snapshotCount > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{snapshotCount}</Text>
                    </View>
                  )}
                </View>
              }
              isActive={isHistoryOpen}
              onPress={onToggleHistory}
              title="Version History & Snapshots"
              paddingHorizontal={8}
            />
          )}

          {onToggleBacklinks && (
            <ToolbarButton
              label={
                <View style={styles.badgeRow}>
                  <Text style={styles.btnText}>BACKLINKS</Text>
                  {backlinksCount > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{backlinksCount}</Text>
                    </View>
                  )}
                </View>
              }
              isActive={isBacklinksOpen}
              onPress={onToggleBacklinks}
              title="Linked From (Backlinks)"
              paddingHorizontal={8}
            />
          )}

          {onToggleFootnotes && (
            <ToolbarButton
              label={
                <View style={styles.badgeRow}>
                  <Text style={styles.btnText}>NOTES</Text>
                  {footnotesCount > 0 && (
                    <View style={styles.countPill}>
                      <Text style={styles.countText}>{footnotesCount}</Text>
                    </View>
                  )}
                </View>
              }
              isActive={isFootnotesOpen}
              onPress={onToggleFootnotes}
              title="Footnotes & Margin Notes"
              paddingHorizontal={8}
            />
          )}

          {onOpenExport && (
            <ToolbarButton
              label="EXPORT"
              onPress={onOpenExport}
              title="Export as Markdown (.md) or Word (.doc)"
              paddingHorizontal={8}
            />
          )}

          <ToolbarDivider />

          {/* Section: Search & Writing Modes */}
          {onOpenFind && (
            <ToolbarButton
              label="FIND"
              onPress={() => onOpenFind(false)}
              title="Find & Replace (Ctrl+F / Ctrl+H)"
              paddingHorizontal={8}
            />
          )}

          {onToggleFocus && (
            <ToolbarButton
              label="FOCUS"
              isActive={isFocusMode}
              onPress={onToggleFocus}
              title="Focus Mode (Dims non-active paragraphs)"
              paddingHorizontal={8}
            />
          )}

          {onToggleTypewriter && (
            <ToolbarButton
              label="TYPEWRITER"
              isActive={isTypewriter}
              onPress={onToggleTypewriter}
              title="Typewriter Scrolling (Keeps active line centered)"
              paddingHorizontal={8}
            />
          )}

          {onOpenViewSettings && (
            <ToolbarButton
              label="VIEW SETTINGS"
              onPress={onOpenViewSettings}
              title="Page Width, Zoom & Theme Settings"
              paddingHorizontal={8}
            />
          )}

          <ToolbarDivider />

          {/* Section: Undo / Redo */}
          <ToolbarButton
            label="↺ UNDO"
            disabled={!canUndo}
            onPress={() => onCommand('undo')}
            title="Undo (Ctrl+Z)"
            paddingHorizontal={7}
          />
          <ToolbarButton
            label="↻ REDO"
            disabled={!canRedo}
            onPress={() => onCommand('redo')}
            title="Redo (Ctrl+Y)"
            paddingHorizontal={7}
          />

          <ToolbarDivider />

          {/* Section: Wiki, Mentions, Links & Notes */}
          <ToolbarButton
            label="[[ WIKI ]]"
            onPress={() => {
              if (onInsertWikiLink) {
                onInsertWikiLink();
              } else {
                onCommand('insertWikiLinkPrompt');
              }
            }}
            title="Insert Wiki Link (or type [[ in text)"
            paddingHorizontal={6}
          />

          <ToolbarButton
            label="@ MENTION"
            onPress={() => {
              if (onInsertMention) {
                onInsertMention();
              } else {
                onCommand('insertMentionPrompt');
              }
            }}
            title="Mention Character / Place (or type @ in text)"
            paddingHorizontal={6}
          />

          <ToolbarButton
            label="LINK"
            isActive={activeMarks.link}
            onPress={() => {
              if (onOpenLink) onOpenLink();
              else setShowLinkModal(true);
            }}
            title="Insert Hyperlink"
            paddingHorizontal={6}
          />

          <ToolbarButton
            label="[^ NOTE]"
            onPress={() => {
              if (onInsertFootnote) {
                onInsertFootnote();
              } else {
                onCommand('insertFootnote');
              }
            }}
            title="Insert Footnote Reference"
            paddingHorizontal={6}
          />
        </ScrollView>
      </View>

      {/* ── ROW 2: Text Hierarchy, Marks, Lists, Alignment & Media ── */}
      <View style={styles.rowWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContent}
        >
          {/* Paragraph & Headings */}
          <ToolbarButton
            label="NORMAL"
            isActive={activeNodes.paragraph}
            onPress={() => onCommand('setParagraph')}
            title="Paragraph / Normal Text"
            paddingHorizontal={6}
          />
          <ToolbarButton
            label="H1"
            isActive={activeNodes.heading1}
            onPress={() => onCommand('setHeading', { level: 1 })}
            title="Heading 1"
            width={28}
          />
          <ToolbarButton
            label="H2"
            isActive={activeNodes.heading2}
            onPress={() => onCommand('setHeading', { level: 2 })}
            title="Heading 2"
            width={28}
          />
          <ToolbarButton
            label="H3"
            isActive={activeNodes.heading3}
            onPress={() => onCommand('setHeading', { level: 3 })}
            title="Heading 3"
            width={28}
          />

          <ToolbarDivider />

          {/* Inline Marks */}
          <ToolbarButton
            label="B"
            isActive={activeMarks.bold}
            onPress={() => onCommand('toggleBold')}
            title="Bold (Ctrl+B)"
            width={26}
          />
          <ToolbarButton
            label={<Text style={{ fontStyle: 'italic', fontFamily: 'SpaceGrotesk-Bold', fontSize: 10, fontWeight: '900', color: INK }}>I</Text>}
            isActive={activeMarks.italic}
            onPress={() => onCommand('toggleItalic')}
            title="Italic (Ctrl+I)"
            width={26}
          />
          <ToolbarButton
            label={<Text style={{ textDecorationLine: 'underline', fontFamily: 'SpaceGrotesk-Bold', fontSize: 10, fontWeight: '900', color: INK }}>U</Text>}
            isActive={activeMarks.underline}
            onPress={() => onCommand('toggleUnderline')}
            title="Underline (Ctrl+U)"
            width={26}
          />
          <ToolbarButton
            label={<Text style={{ textDecorationLine: 'line-through', fontFamily: 'SpaceGrotesk-Bold', fontSize: 10, fontWeight: '900', color: INK }}>S</Text>}
            isActive={activeMarks.strike}
            onPress={() => onCommand('toggleStrike')}
            title="Strikethrough"
            width={26}
          />
          <ToolbarButton
            label="HIGHLIGHT"
            isActive={activeMarks.highlight}
            onPress={() => onCommand('toggleHighlight')}
            title="Text Highlighter"
            paddingHorizontal={6}
          />

          <ToolbarDivider />

          {/* Lists & Quotes */}
          <ToolbarButton
            label="• BULLET"
            isActive={activeNodes.bulletList}
            onPress={() => onCommand('toggleBulletList')}
            title="Bullet List"
            paddingHorizontal={6}
          />
          <ToolbarButton
            label="1. NUMBER"
            isActive={activeNodes.orderedList}
            onPress={() => onCommand('toggleOrderedList')}
            title="Numbered List"
            paddingHorizontal={6}
          />
          <ToolbarButton
            label="☑ TASK"
            isActive={activeNodes.taskList}
            onPress={() => onCommand('toggleTaskList')}
            title="Checklist / Task List"
            paddingHorizontal={6}
          />
          <ToolbarButton
            label="❝ QUOTE"
            isActive={activeNodes.blockquote}
            onPress={() => onCommand('toggleBlockquote')}
            title="Blockquote"
            paddingHorizontal={6}
          />

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton
            label="LEFT"
            isActive={activeNodes.alignLeft}
            onPress={() => onCommand('setTextAlign', { alignment: 'left' })}
            title="Align Left"
            paddingHorizontal={5}
          />
          <ToolbarButton
            label="CENTER"
            isActive={activeNodes.alignCenter}
            onPress={() => onCommand('setTextAlign', { alignment: 'center' })}
            title="Align Center"
            paddingHorizontal={5}
          />
          <ToolbarButton
            label="RIGHT"
            isActive={activeNodes.alignRight}
            onPress={() => onCommand('setTextAlign', { alignment: 'right' })}
            title="Align Right"
            paddingHorizontal={5}
          />

          <ToolbarDivider />

          {/* Media & Content Inserts */}
          <ToolbarButton
            label="IMAGE"
            onPress={() => {
              if (onOpenImage) onOpenImage();
              else setShowImageModal(true);
            }}
            title="Insert Image (Upload or Web URL)"
            paddingHorizontal={6}
          />

          <ToolbarButton
            label="TABLE"
            isActive={activeNodes.table}
            onPress={() => onCommand('insertTable', { rows: 3, cols: 3 })}
            title="Insert 3x3 Table"
            paddingHorizontal={6}
          />

          <ToolbarButton
            label="LINE"
            onPress={() => onCommand('setHorizontalRule')}
            title="Horizontal Divider Line"
            paddingHorizontal={6}
          />

          <ToolbarButton
            label="CLEAR"
            onPress={() => onCommand('clearFormatting')}
            title="Clear Formatting"
            paddingHorizontal={6}
          />
        </ScrollView>
      </View>

      {/* Hyperlink Input Overlay */}
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
            style={{ width: 380, maxWidth: '90%', padding: 20 }}
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

      {/* Image Insertion Overlay */}
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
            style={{ width: 440, maxWidth: '92%', padding: 20 }}
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
                if (onPickImage) {
                  onPickImage();
                } else {
                  setTimeout(() => {
                    onCommand('pickImage');
                  }, 150);
                }
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
    backgroundColor: WHITE,
    borderBottomWidth: 2,
    borderBottomColor: INK,
  },
  rowWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  btnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countPill: {
    backgroundColor: INK,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  countText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 8,
    fontWeight: '900',
    color: YELLOW,
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '900',
    color: INK,
  },
  modalCloseBtn: {
    width: 22,
    height: 22,
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
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: 'DM Sans',
    color: INK,
    borderRadius: 6,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: CREAM,
  },
  cancelBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '800',
    color: INK,
  },
  applyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: YELLOW,
  },
  applyBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },
  filePickerBtn: {
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  filePickerBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '900',
    color: INK,
  },
  filePickerBtnSub: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    color: '#666',
    marginTop: 3,
    textAlign: 'center',
  },
  imagePreviewBox: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
    padding: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
});

export default WysiwygToolbar;
