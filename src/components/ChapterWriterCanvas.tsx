/**
 * src/components/ChapterWriterCanvas.tsx
 *
 * Neobrutalist Writer Canvas for Lore & Story Chapters:
 * - Powered by TipTap WYSIWYG Editor (100% offline, zero CDN)
 * - Single continuous writing surface (like Google Docs)
 * - Bold, italic, underline, strike, headings, lists format in-place while typing
 * - Real-time keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y, Enter, etc.)
 * - Phase 1: Real-time formatting & debounced autosave
 * - Phase 2: Focus mode, Typewriter scrolling, Find & Replace, Outline, View Settings
 * - Phase 3:
 *    * Wiki link autocomplete [[ ]] and Mention tags @ with navigation
 *    * Linked From (Backlinks) inspector
 *    * Version history & snapshots with auto-checkpoints
 *    * Export to Markdown & Microsoft Word
 *    * Footnotes & Margin notes
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLightbox } from '../context/LightboxContext';
import { BrutalTextInput } from './brutal/BrutalTextInput';
import {
  BORDER,
  CREAM,
  INK,
  RADIUS,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Project } from '../types/models';
import BrutalBox from './brutal/BrutalBox';
import BrutalButton from './brutal/BrutalButton';
import BrutalPill from './brutal/BrutalPill';
import { Icon, ICONS } from './Icon';
import { useEntries } from '../hooks/useEntries';
import { WysiwygEditor } from './WysiwygEditor/WysiwygEditor';
import type { EditorBacklink, TipTapDoc, WikiEntity } from './WysiwygEditor/types';

export interface ChapterData {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  content: string;
  act?: string;
  wordGoal?: number;
  tagLabel?: string;
  tagColor?: string;
  updatedAt?: number;
  sortOrder?: number;
}

const COLOR_WHEEL_HUES = [
  '#FF3B30', '#FF7A00', '#FFCC00', '#FFEB3B',
  '#A3E635', '#22C55E', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#18181B',
];

const PRESET_TAG_COLORS = [
  '#FFDE59', '#4ECDC4', '#FF6B6B', '#FF9F5A',
  '#B59CDD', '#38BDF8', '#6BCB77', '#141414',
];

const TAG_NAME_PRESETS = [
  'PROLOGUE', 'CHAPTER 1', 'CHAPTER 2', 'CHAPTER 3',
  'ACT I', 'ACT II', 'INTERLUDE', 'EPILOGUE', 'SIDE STORY',
];

interface Props {
  chapter: ChapterData | null;
  project: Project;
  accentColor: string;
  onUpdateChapter?: (updated: ChapterData) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onBackToList?: () => void;
  onAddNewChapter?: () => void;
}

export const ChapterWriterCanvas: React.FC<Props> = ({
  chapter,
  project,
  accentColor,
  onUpdateChapter,
  onDeleteChapter,
  onBackToList,
  onAddNewChapter,
}) => {
  const [title, setTitle] = useState(chapter?.title ?? '');
  const [subtitle, setSubtitle] = useState(chapter?.subtitle ?? '');
  const [act, setAct] = useState(chapter?.act ?? 'Act I — The Opening Stanza');

  const { isOpen: isLightboxOpen } = useLightbox();
  const projectEntries = useEntries(project.id);
  const [previewEntity, setPreviewEntity] = useState<{ id: string; type: string; title: string } | null>(null);

  const [tagLabel, setTagLabel] = useState(chapter?.tagLabel ?? chapter?.number ?? 'Chapter 1');
  const [tagColor, setTagColor] = useState(chapter?.tagColor ?? YELLOW);
  const [showTagModal, setShowTagModal] = useState(false);
  const [modalTagText, setModalTagText] = useState(tagLabel);
  const [modalTagColor, setModalTagColor] = useState(tagColor);

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setSubtitle(chapter.subtitle);
      setAct(chapter.act ?? 'Act I — The Opening Stanza');
      setTagLabel(chapter.tagLabel ?? chapter.number);
      setTagColor(chapter.tagColor ?? YELLOW);
    }
    setIsEditing(false);
  }, [chapter?.id]);

  const handleSaveTag = () => {
    if (!chapter) return;
    const finalLabel = modalTagText.trim() || chapter.number;
    const finalColor = modalTagColor || YELLOW;
    setTagLabel(finalLabel);
    setTagColor(finalColor);
    setShowTagModal(false);
    onUpdateChapter?.({
      ...chapter,
      tagLabel: finalLabel,
      tagColor: finalColor,
      title,
      subtitle,
      act,
    });
  };

  const chapterRef = useRef(chapter);
  useEffect(() => {
    chapterRef.current = chapter;
  }, [chapter]);

  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  const subtitleRef = useRef(subtitle);
  useEffect(() => {
    subtitleRef.current = subtitle;
  }, [subtitle]);

  const actRef = useRef(act);
  useEffect(() => {
    actRef.current = act;
  }, [act]);

  const onUpdateChapterRef = useRef(onUpdateChapter);
  useEffect(() => {
    onUpdateChapterRef.current = onUpdateChapter;
  }, [onUpdateChapter]);

  // Map project entries into WikiEntities for [[ ]] and @ autocomplete
  const wikiEntities: WikiEntity[] = useMemo(() => {
    return projectEntries.map(entry => {
      const isChar = entry.categoryId === 'characters' || entry.categoryId === 'god' || entry.categoryId === 'demon' || entry.categoryId === 'dragon';
      return {
        id: entry.id,
        title: entry.title,
        type: isChar ? 'character' : entry.categoryId === 'items' ? 'lore' : 'entry',
        category: entry.categoryId,
        subtitle: entry.summary,
      };
    });
  }, [project.id, projectEntries.length]);

  // Scan project entries for inbound backlinks to this chapter
  const backlinks: EditorBacklink[] = useMemo(() => {
    if (!chapter) return [];
    const links: EditorBacklink[] = [];
    const targetTitleLower = title.toLowerCase();
    const targetId = chapter.id;

    for (const entry of projectEntries) {
      let mentioned = false;
      let excerpt = '';

      if (entry.summary && entry.summary.toLowerCase().includes(targetTitleLower)) {
        mentioned = true;
        excerpt = entry.summary;
      } else if (entry.sections) {
        for (const s of entry.sections) {
          if (s.body && (s.body.toLowerCase().includes(targetTitleLower) || s.body.includes(targetId))) {
            mentioned = true;
            excerpt = s.body.slice(0, 160) + '...';
            break;
          }
        }
      }

      if (mentioned) {
        links.push({
          sourceId: entry.id,
          sourceTitle: entry.title,
          sourceType: entry.categoryId || 'entry',
          excerpt,
        });
      }
    }

    return links;
  }, [project.id, chapter?.id, projectEntries.length, title]);

  // Target entry details for quick preview modal
  const targetEntry = useMemo(() => {
    if (!previewEntity) return null;
    return projectEntries.find(
      e => e.id === previewEntity.id || e.title.toLowerCase() === previewEntity.title.toLowerCase()
    );
  }, [previewEntity, projectEntries]);

  const handleEditorChange = useCallback((doc: TipTapDoc) => {
    if (!chapterRef.current) return;
    const serialized = JSON.stringify(doc);
    if (serialized !== chapterRef.current.content) {
      onUpdateChapterRef.current?.({
        ...chapterRef.current,
        title: titleRef.current,
        subtitle: subtitleRef.current,
        act: actRef.current,
        content: serialized,
      });
    }
  }, []);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!chapterRef.current) return;
    onUpdateChapterRef.current?.({
      ...chapterRef.current,
      title: newTitle,
      subtitle: subtitleRef.current,
      act: actRef.current,
    });
  };

  const handleSubtitleChange = (newSubtitle: string) => {
    setSubtitle(newSubtitle);
    if (!chapterRef.current) return;
    onUpdateChapterRef.current?.({
      ...chapterRef.current,
      title: titleRef.current,
      subtitle: newSubtitle,
      act: actRef.current,
    });
  };

  if (!chapter) {
    return (
      <View style={[styles.outerContainer, { alignItems: 'center', justifyContent: 'center' }]}>
        <BrutalBox
          fill={WHITE}
          borderColor={INK}
          borderWidth={BORDER.width}
          radius={RADIUS.card}
          shadowOffset={4}
          style={{ padding: 32, alignItems: 'center', maxWidth: 460 }}
        >
          <Text style={{ fontSize: 36, marginBottom: 12 }}>📖</Text>
          <Text style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: '900', color: INK, marginBottom: 8, textAlign: 'center' }}>
            NO CHAPTER SELECTED
          </Text>
          <Text style={{ fontSize: 13, color: '#555555', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
            This project has no chapters yet, or no chapter is currently selected. Click below to start writing your chronicle!
          </Text>
          {onAddNewChapter && (
            <BrutalButton
              label="+ CREATE FIRST CHAPTER"
              variant="primary"
              accentColor={accentColor || YELLOW}
              size="md"
              onPress={onAddNewChapter}
            />
          )}
        </BrutalBox>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <BrutalBox
        fill={WHITE}
        borderColor={INK}
        borderWidth={BORDER.width}
        radius={RADIUS.card}
        shadowOffset={0}
        style={{ flex: 1, height: '100%' }}
      >
        {/* ── Writer Header Bar ────────────────────────────────────── */}
        <View className="h-[52px] px-4 flex-row items-center justify-between bg-cream border-b-2 border-ink">
          <View className="flex-row items-center gap-2">
            {onBackToList && (
              <BrutalButton
                label="← CHAPTERS"
                variant="secondary"
                size="sm"
                onPress={onBackToList}
              />
            )}

            {isEditing ? (
              <TouchableOpacity
                onPress={() => {
                  setModalTagText(tagLabel || chapter.number);
                  setModalTagColor(tagColor || YELLOW);
                  setShowTagModal(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                activeOpacity={0.7}
              >
                <BrutalPill
                  label={(tagLabel || chapter.number).toUpperCase()}
                  fill={tagColor || YELLOW}
                  size="sm"
                />
                <View style={styles.tagEditBadge}>
                  <Text style={styles.tagEditText}>🎨 EDIT TAG</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <BrutalPill
                label={(tagLabel || chapter.number).toUpperCase()}
                fill={tagColor || YELLOW}
                size="sm"
              />
            )}
          </View>

          <View className="flex-row items-center gap-2">
            {isEditing ? (
              <>
                {onDeleteChapter && (
                  <TouchableOpacity
                    onPress={() => onDeleteChapter(chapter.id)}
                    className="h-[32px] px-2.5 rounded-button border-2 border-ink bg-white items-center justify-center flex-row gap-1.5"
                    activeOpacity={0.8}
                  >
                    <Icon glyph={ICONS.delete} size={13} color="#DC2626" />
                    <Text className="font-display text-[10px] font-black text-[#DC2626]">
                      DELETE
                    </Text>
                  </TouchableOpacity>
                )}

                <BrutalButton
                  label="✓ FINISH EDITING"
                  variant="primary"
                  accentColor="#10B981"
                  size="sm"
                  onPress={() => setIsEditing(false)}
                />
              </>
            ) : (
              <BrutalButton
                label="✎ EDIT CHAPTER"
                variant="primary"
                accentColor={YELLOW}
                size="sm"
                onPress={() => setIsEditing(true)}
              />
            )}
          </View>
        </View>

        {/* ── Chapter Metadata Header (Title & Subtitle) ───────────── */}
        <View style={styles.headerTitleBox}>
          {isEditing ? (
            <>
              <BrutalTextInput
                size="md"
                fill="transparent"
                borderWidth={0}
                value={title}
                onChangeText={handleTitleChange}
                placeholder="Chapter Title..."
                placeholderTextColor="#888888"
                style={{
                  fontFamily: 'SpaceGrotesk-Bold',
                  fontSize: 20,
                  fontWeight: '900',
                  letterSpacing: -0.3,
                  paddingHorizontal: 0,
                }}
              />

              <BrutalTextInput
                variant="multiline"
                fill="transparent"
                borderWidth={0}
                value={subtitle}
                onChangeText={handleSubtitleChange}
                placeholder="Add epigraph, synopsis, or chronicle location note..."
                placeholderTextColor="#888888"
                style={{
                  fontFamily: 'DM Sans',
                  fontSize: 12,
                  fontStyle: 'italic',
                  paddingHorizontal: 0,
                  minHeight: 40,
                }}
              />
            </>
          ) : (
            <View>
              <Text style={styles.titleDisplay}>{title || 'Untitled Chapter'}</Text>
              {subtitle ? (
                <Text style={styles.subtitleDisplay}>{subtitle}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* ── True WYSIWYG Editor Canvas (Single Continuous Surface) ── */}
        <View style={styles.editorWrapper}>
          <WysiwygEditor
            key={chapter.id}
            initialContent={chapter.content}
            initialWordGoal={chapter.wordGoal ?? 3000}
            entities={wikiEntities}
            backlinks={backlinks}
            meta={{ title, subtitle }}
            readOnly={!isEditing}
            isExternalOverlayOpen={showTagModal || !!previewEntity || isLightboxOpen}
            onChange={handleEditorChange}
            onOpenEntity={(ent) => setPreviewEntity(ent)}
            onWordGoalChange={(goal) => {
              onUpdateChapter?.({
                ...chapter,
                title,
                subtitle,
                act,
                wordGoal: goal,
              });
            }}
          />
        </View>
      </BrutalBox>

      {/* ── Entity Quick Preview Modal (from [[ ]] or @ clicks) ── */}
      {previewEntity && (
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setPreviewEntity(null)}
          />
          <View
            style={{ width: '100%', maxWidth: 520, maxHeight: '75%' }}
          >
            <BrutalBox
              fill={WHITE}
              borderColor={INK}
              borderWidth={BORDER.width}
              radius={RADIUS.card}
              shadowOffset={6}
              style={styles.previewBox}
            >
              <View style={styles.previewHeader}>
                <View style={styles.previewHeaderLeft}>
                  <BrutalPill
                    label={(targetEntry?.categoryId || previewEntity?.type || 'ENTRY').toUpperCase()}
                    fill={YELLOW}
                    size="sm"
                  />
                  <Text style={styles.previewTitle}>
                    {targetEntry ? targetEntry.title : previewEntity?.title}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setPreviewEntity(null)}
                  style={styles.previewCloseBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.previewCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.previewBody}>
                {targetEntry ? (
                  <View>
                    <Text style={styles.previewSummary}>
                      {targetEntry.summary}
                    </Text>

                    {targetEntry.infoFields && targetEntry.infoFields.length > 0 && (
                      <View style={styles.previewInfoGrid}>
                        {targetEntry.infoFields.map((field, idx) => (
                          <View key={idx} style={styles.previewInfoRow}>
                            <Text style={styles.previewInfoKey}>{field.key}:</Text>
                            <Text style={styles.previewInfoVal}>{field.value}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {targetEntry.sections && targetEntry.sections.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        {targetEntry.sections.map((sec, idx) => (
                          <View key={idx} style={styles.previewSection}>
                            <Text style={styles.previewSectionTitle}>{sec.title}</Text>
                            <Text style={styles.previewSectionBody}>{sec.body}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.previewNoDetails}>
                    <Text style={styles.previewNoDetailsText}>
                      Referenced entity: {previewEntity?.title} ({previewEntity?.type})
                    </Text>
                    <Text style={styles.previewNoDetailsSub}>
                      This entity is linked from your chronicle text.
                    </Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.previewFooter}>
                <BrutalButton
                  label="CLOSE PREVIEW"
                  variant="primary"
                  size="sm"
                  onPress={() => setPreviewEntity(null)}
                />
              </View>
            </BrutalBox>
          </View>
        </View>
      )}

      {/* ── Tag Settings & Color Wheel Modal ── */}
      {showTagModal && (
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setShowTagModal(false)}
          />
          <View
            style={{ width: '100%', maxWidth: 460 }}
          >
            <BrutalBox
              fill={WHITE}
              borderColor={INK}
              borderWidth={BORDER.width}
              radius={RADIUS.card}
              shadowOffset={6}
              style={styles.tagModalBox}
            >
              {/* Header */}
              <View style={styles.tagModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.tagModalTitle}>TAG & COLOR SETTINGS</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowTagModal(false)}
                  style={styles.previewCloseBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.previewCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.tagModalBody} showsVerticalScrollIndicator={false}>
                {/* Live Preview */}
                <View style={styles.tagPreviewSection}>
                  <Text style={styles.tagSectionLabel}>LIVE PREVIEW</Text>
                  <View style={styles.tagPreviewRow}>
                    <BrutalPill
                      label={(modalTagText.trim() || 'SAMPLE').toUpperCase()}
                      fill={modalTagColor || YELLOW}
                      size="md"
                    />
                  </View>
                </View>

                {/* Custom Tag Name / Label */}
                <View style={styles.tagInputSection}>
                  <Text style={styles.tagSectionLabel}>TAG LABEL / CHAPTER NAME</Text>
                  <BrutalTextInput
                    size="md"
                    value={modalTagText}
                    onChangeText={setModalTagText}
                    placeholder="e.g. PROLOGUE, CHAPTER 1, ACT I, INTERLUDE..."
                    placeholderTextColor="#888888"
                    style={{
                      fontFamily: 'SpaceGrotesk-Bold',
                      fontSize: 13,
                      fontWeight: '800',
                      borderRadius: 6,
                    }}
                  />
                </View>

                {/* Quick Presets */}
                <View style={styles.presetSection}>
                  <Text style={styles.tagSectionLabel}>QUICK PRESETS</Text>
                  <View style={styles.presetChipsWrap}>
                    {TAG_NAME_PRESETS.map((preset) => {
                      const isSelected =
                        modalTagText.trim().toUpperCase() === preset.toUpperCase();
                      return (
                        <TouchableOpacity
                          key={preset}
                          onPress={() => setModalTagText(preset)}
                          style={[
                            styles.presetChip,
                            isSelected && styles.presetChipActive,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isSelected && styles.presetChipTextActive,
                            ]}
                          >
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Circular Color Wheel */}
                <View style={styles.colorWheelSection}>
                  <Text style={styles.tagSectionLabel}>PICK TAG COLOR (COLOR WHEEL)</Text>
                  <View style={styles.colorWheelContainer}>
                    <View style={styles.colorWheelCircle}>
                      {COLOR_WHEEL_HUES.map((hue, i) => {
                        const total = COLOR_WHEEL_HUES.length;
                        const angle = (i * 2 * Math.PI) / total - Math.PI / 2;
                        const radius = 68;
                        const left = 85 + radius * Math.cos(angle) - 13;
                        const top = 85 + radius * Math.sin(angle) - 13;
                        const isSelected =
                          modalTagColor.toLowerCase() === hue.toLowerCase();

                        return (
                          <TouchableOpacity
                            key={hue}
                            onPress={() => setModalTagColor(hue)}
                            style={[
                              styles.wheelSwatch,
                              { backgroundColor: hue, left, top },
                              isSelected && styles.wheelSwatchActive,
                            ]}
                            activeOpacity={0.8}
                          />
                        );
                      })}

                      {/* Center Selected Swatch */}
                      <View
                        style={[
                          styles.wheelCenterHub,
                          { backgroundColor: modalTagColor || YELLOW },
                        ]}
                      >
                        <Text style={styles.wheelCenterCheck}>✓</Text>
                      </View>
                    </View>
                  </View>

                  {/* Palette Swatches Row */}
                  <View style={styles.paletteRow}>
                    {PRESET_TAG_COLORS.map((col) => {
                      const isSelected =
                        modalTagColor.toLowerCase() === col.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={col}
                          onPress={() => setModalTagColor(col)}
                          style={[
                            styles.paletteSwatch,
                            { backgroundColor: col },
                            isSelected && styles.paletteSwatchActive,
                          ]}
                          activeOpacity={0.8}
                        />
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={styles.tagModalFooter}>
                <BrutalButton
                  label="CANCEL"
                  variant="secondary"
                  size="sm"
                  onPress={() => setShowTagModal(false)}
                />
                <BrutalButton
                  label="APPLY TAG"
                  variant="primary"
                  accentColor={modalTagColor || YELLOW}
                  size="sm"
                  onPress={handleSaveTag}
                />
              </View>
            </BrutalBox>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    height: '100%',
  },
  editorWrapper: {
    flex: 1,
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 24,
  },
  previewBox: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '75%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  previewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  previewTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 15,
    fontWeight: '900',
    color: INK,
  },
  previewCloseBtn: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },
  previewBody: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAF9',
  },
  previewSummary: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    lineHeight: 19,
    color: INK,
    marginBottom: 12,
  },
  previewInfoGrid: {
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 6,
    backgroundColor: WHITE,
    padding: 10,
    marginBottom: 12,
  },
  previewInfoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  previewInfoKey: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '800',
    color: INK,
    width: 90,
  },
  previewInfoVal: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#444444',
    flex: 1,
  },
  previewSection: {
    marginBottom: 10,
  },
  previewSectionTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: INK,
    marginBottom: 3,
  },
  previewSectionBody: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 17,
    color: '#555555',
  },
  previewNoDetails: {
    padding: 16,
  },
  previewNoDetailsText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: INK,
  },
  previewNoDetailsSub: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#666666',
    marginTop: 4,
  },
  previewFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerTitleBox: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: WHITE,
    borderBottomWidth: 2,
    borderBottomColor: INK,
  },
  titleDisplay: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 22,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.3,
  },
  subtitleDisplay: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 18,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  titleInput: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.3,
    padding: 0,
    margin: 0,
    minHeight: 28,
  },
  subtitleInput: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    lineHeight: 18,
    color: '#666666',
    fontStyle: 'italic',
    padding: 0,
    marginTop: 4,
    marginBottom: 2,
  },
  tagEditBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: WHITE,
  },
  tagEditText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    fontWeight: '900',
    color: INK,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 99999,
  },
  tagModalBox: {
    width: '100%',
    maxHeight: 580,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tagModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagModalTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.5,
  },
  tagModalBody: {
    padding: 16,
    backgroundColor: WHITE,
  },
  tagPreviewSection: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: CREAM,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 6,
  },
  tagPreviewRow: {
    marginTop: 6,
  },
  tagSectionLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '900',
    color: '#666666',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagInputSection: {
    marginBottom: 14,
  },
  tagNameInput: {
    height: 38,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: INK,
    backgroundColor: WHITE,
  },
  presetSection: {
    marginBottom: 14,
  },
  presetChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: CREAM,
  },
  presetChipActive: {
    backgroundColor: INK,
  },
  presetChipText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '800',
    color: INK,
  },
  presetChipTextActive: {
    color: WHITE,
  },
  colorWheelSection: {
    marginBottom: 8,
  },
  colorWheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  colorWheelCircle: {
    width: 170,
    height: 170,
    position: 'relative',
  },
  wheelSwatch: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: INK,
  },
  wheelSwatchActive: {
    borderWidth: 3.5,
  },
  wheelCenterHub: {
    position: 'absolute',
    left: 63,
    top: 63,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelCenterCheck: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    fontWeight: '900',
    color: INK,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  paletteSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: INK,
  },
  paletteSwatchActive: {
    borderWidth: 3.5,
  },
  tagModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default ChapterWriterCanvas;
