/**
 * src/components/ProjectModal.tsx
 *
 * Neobrutalist Modal for Creating and Editing Projects:
 * - Fields:
 *   1. Project Name (required)
 *   2. Project Category / Mode (Lore & Story, Characters & Gameplay, Character Cosmetics)
 *   3. Project Logo Image (optional - if left optional, initials will do)
 *   4. Accent Color (preset swatches + hex input, e.g. HSR Lavender)
 * - Shared for both "Make New Project" and "Project Settings / Edit Project"
 */

import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getProjectTypePreset } from '../hooks/useProjects';
import { pickImageFromComputer } from '../native/FilePicker';
import {
  BORDER,
  CREAM,
  FONTS,
  INK,
  LAVENDER,
  ORANGE,
  RADIUS,
  SHADOW,
  TEAL,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Project, ProjectType } from '../types/models';
import BrutalButton from './brutal/BrutalButton';
import { BrutalTextInput } from './brutal/BrutalTextInput';
import { Icon, ICONS } from './Icon';
import { InitialsAvatar } from './InitialsAvatar';

export function getInitialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'PR';
  const words = trimmed.split(/[\s:_\-]+/).filter(Boolean);
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export const ACCENT_SWATCHES = [
  { label: 'HSR Lavender', hex: '#B59CDD' },
  { label: 'Deep Lavender', hex: '#9A7DD0' },
  { label: 'Monster Orange', hex: '#FF9F5A' },
  { label: 'Amber Orange', hex: '#D4832A' },
  { label: 'Arknights Teal', hex: '#4ECDC4' },
  { label: 'Golden Yellow', hex: '#FFD93D' },
  { label: 'Coral Red', hex: '#FF6B6B' },
  { label: 'Sky Blue', hex: '#4D96FF' },
  { label: 'Emerald Green', hex: '#6BCB77' },
  { label: 'Royal Violet', hex: '#6C5CE7' },
  { label: 'Rose Pink', hex: '#FF7597' },
  { label: 'Midnight Ink', hex: '#2D3436' },
];

export interface ProjectModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  project?: Project | null;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    name: string;
    type: ProjectType;
    logoUri: any | null;
    bannerUri?: any | null;
    accentColor: string;
  }) => void;
  onDelete?: (projectId: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  visible,
  mode,
  project,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('gameplay');
  const [logoUri, setLogoUri] = useState<any | null>(null);
  const [bannerUri, setBannerUri] = useState<any | null>(null);
  const [accentColor, setAccentColor] = useState('#B59CDD'); // Default HSR lavender
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsDeleting(false);
      if (mode === 'edit' && project) {
        setName(project.name);
        setProjectType(project.type);
        setLogoUri(project.avatar || null);
        setBannerUri(project.background || null);
        setAccentColor(project.accentColor || '#B59CDD');
      } else {
        setName('');
        setProjectType('lore');
        setLogoUri(null);
        setBannerUri(null);
        setAccentColor('#B59CDD');
      }
    }
  }, [visible, mode, project]);

  if (!visible) return null;

  const initials = getInitialsFromName(name);
  const selectedPreset = getProjectTypePreset(projectType);

  const handlePickLogo = async () => {
    try {
      const res = await pickImageFromComputer();
      if (res?.uri) {
        setLogoUri(res.uri);
      }
    } catch (err) {
      console.warn('Error picking project logo:', err);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUri(null);
  };

  const handlePickBanner = async () => {
    try {
      const res = await pickImageFromComputer();
      if (res?.uri) {
        setBannerUri(res.uri);
      }
    } catch (err) {
      console.warn('Error picking project banner:', err);
    }
  };

  const handleRemoveBanner = () => {
    setBannerUri(null);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      id: project?.id,
      name: trimmed,
      type: projectType,
      logoUri,
      bannerUri,
      accentColor,
    });
  };

  const CATEGORY_OPTIONS: { type: ProjectType; title: string; subtitle: string; icon: string }[] = [
    {
      type: 'lore',
      title: 'Lore & Story',
      subtitle: 'Worldbuilding, narrative chapters, places, factions & history',
      icon: ICONS.book,
    },
    {
      type: 'gameplay',
      title: 'Characters & Gameplay',
      subtitle: 'Combat kits, abilities, progression, elements & gameplay series',
      icon: ICONS.grid,
    },
    {
      type: 'cosmetics',
      title: 'Character Cosmetics',
      subtitle: 'Fashion lines, wardrobe splash arts, themes & visual catalog',
      icon: ICONS.star,
    },
  ];

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.card}>
        {/* Modal Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: RADIUS.small,
                borderWidth: 2,
                borderColor: INK,
                backgroundColor: YELLOW,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon glyph={mode === 'create' ? ICONS.add : ICONS.settings} size={18} color={INK} />
            </View>
            <View>
              <Text style={styles.titleText}>
                {mode === 'create' ? 'CREATE NEW PROJECT' : 'PROJECT SETTINGS'}
              </Text>
              <Text style={styles.subtitleText}>
                {mode === 'create'
                  ? 'Set up your world name, category, logo, and signature accent color.'
                  : `Customize settings for ${project?.name || 'this project'}.`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ maxHeight: 520 }}
          contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. PROJECT NAME ────────────────────────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.fieldLabel}>PROJECT NAME</Text>
            <BrutalTextInput
              size="md"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Honkai: Star Rail, Monster Strike, Genshin Impact"
              placeholderTextColor="#888888"
              style={{ fontSize: 14, fontWeight: '700' }}
            />
          </View>

          {/* ── 2. PROJECT CATEGORY (Type / Mode) ─────────────────────────── */}
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.fieldLabel}>CATEGORY / PROJECT TYPE</Text>
            <Text style={styles.fieldHint}>
              Select the workspace template and specialized tools for this project.
            </Text>

            <View style={{ gap: 8, marginTop: 6 }}>
              {CATEGORY_OPTIONS.map(opt => {
                const isSelected = projectType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    onPress={() => setProjectType(opt.type)}
                    activeOpacity={0.8}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected ? '#FFF9E6' : WHITE,
                        borderColor: INK,
                        borderWidth: isSelected ? 2.5 : 2,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View
                        style={[
                          styles.categoryIconBox,
                          { backgroundColor: isSelected ? YELLOW : CREAM },
                        ]}
                      >
                        <Icon glyph={opt.icon} size={16} color={INK} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.categoryTitle}>{opt.title}</Text>
                        <Text style={styles.categorySubtitle}>{opt.subtitle}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        {
                          backgroundColor: isSelected ? INK : WHITE,
                          borderColor: INK,
                        },
                      ]}
                    >
                      {isSelected && <Text style={{ color: YELLOW, fontSize: 10, fontWeight: '900' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── 3. PROJECT LOGO (Optional with Initials Fallback) ───────────── */}
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.fieldLabel}>PROJECT LOGO (OPTIONAL)</Text>
            <Text style={styles.fieldHint}>
              Upload a custom image as its logo. If left blank, initials on your accent color will be used.
            </Text>

            <View style={styles.logoRow}>
              {/* Live Avatar Preview */}
              <View style={styles.logoPreviewWrapper}>
                <InitialsAvatar
                  initials={initials}
                  color={accentColor}
                  size={58}
                  fontSize={20}
                  imageUri={logoUri}
                />
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={handlePickLogo}
                    activeOpacity={0.8}
                    style={styles.logoActionBtn}
                  >
                    <Text style={styles.logoActionBtnText}>
                      {logoUri ? 'CHANGE LOGO' : 'CHOOSE LOGO'}
                    </Text>
                  </TouchableOpacity>

                  {logoUri && (
                    <TouchableOpacity
                      onPress={handleRemoveLogo}
                      activeOpacity={0.8}
                      style={styles.logoRemoveBtn}
                    >
                      <Text style={styles.logoRemoveBtnText}>✕ REMOVE</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.logoStatusText}>
                  {logoUri
                    ? 'Custom logo image active'
                    : `Using initials "${initials}" with selected accent`}
                </Text>
              </View>
            </View>
          </View>

          {/* ── 4. PROJECT HERO BANNER (Optional for Home Dashboard) ──────── */}
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.fieldLabel}>PROJECT HERO BANNER (OPTIONAL)</Text>
            <Text style={styles.fieldHint}>
              Upload a wide hero banner image to appear at the top of your project card on the Home Dashboard.
            </Text>

            {bannerUri ? (
              <View style={{ marginBottom: 8 }}>
                <View
                  style={{
                    width: '100%',
                    height: 110,
                    borderRadius: RADIUS.button,
                    borderWidth: 2,
                    borderColor: INK,
                    overflow: 'hidden',
                    backgroundColor: '#e5e5e5',
                    marginBottom: 8,
                  }}
                >
                  <Image
                    source={typeof bannerUri === 'string' ? { uri: bannerUri } : bannerUri}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={handlePickBanner}
                    activeOpacity={0.8}
                    style={styles.logoActionBtn}
                  >
                    <Text style={styles.logoActionBtnText}>CHANGE BANNER</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleRemoveBanner}
                    activeOpacity={0.8}
                    style={styles.logoRemoveBtn}
                  >
                    <Text style={styles.logoRemoveBtnText}>✕ REMOVE BANNER</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={handlePickBanner}
                  activeOpacity={0.8}
                  style={styles.logoActionBtn}
                >
                  <Text style={styles.logoActionBtnText}>CHOOSE BANNER</Text>
                </TouchableOpacity>
                <Text style={styles.logoStatusText}>No banner chosen (card will display flat style)</Text>
              </View>
            )}
          </View>

          {/* ── 4. ACCENT COLOR (Swatches + Hex) ───────────────────────────── */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.fieldLabel}>ACCENT COLOR</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    borderWidth: 1.5,
                    borderColor: INK,
                    backgroundColor: accentColor,
                  }}
                />
                <Text style={{ fontFamily: FONTS.display, fontSize: 11, fontWeight: '800', color: INK }}>
                  {accentColor.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.fieldHint}>
              Choose the signature color for badges, active states, and buttons (like HSR is lavender).
            </Text>

            {/* Swatches Grid */}
            <View style={styles.swatchesGrid}>
              {ACCENT_SWATCHES.map(swatch => {
                const isSelected = accentColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <TouchableOpacity
                    key={swatch.hex}
                    onPress={() => setAccentColor(swatch.hex)}
                    activeOpacity={0.7}
                    style={[
                      styles.swatchBox,
                      {
                        backgroundColor: swatch.hex,
                        borderWidth: isSelected ? 3 : 1.5,
                        borderColor: isSelected ? INK : 'rgba(0,0,0,0.3)',
                      },
                    ]}
                  >
                    {isSelected && (
                      <View style={styles.swatchCheck}>
                        <Text style={{ color: WHITE, fontSize: 10, fontWeight: '900' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Hex Code Input */}
            <View style={styles.hexInputRow}>
              <Text style={{ fontFamily: FONTS.display, fontSize: 12, fontWeight: '900', color: INK }}>
                CUSTOM HEX: #
              </Text>
              <BrutalTextInput
                size="sm"
                value={accentColor.replace('#', '')}
                onChangeText={text => {
                  const clean = text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                  setAccentColor(`#${clean}`);
                }}
                maxLength={6}
                placeholder="B59CDD"
                placeholderTextColor="#888888"
                style={{
                  width: 110,
                  height: 30,
                  fontSize: 12,
                  fontFamily: FONTS.display,
                  fontWeight: '800',
                  paddingHorizontal: 8,
                }}
              />
            </View>
          </View>
        </ScrollView>

        {/* Modal Footer Actions */}
        <View style={styles.footer}>
          {mode === 'edit' && onDelete && (
            <View style={{ flex: 1 }}>
              {isDeleting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => project && onDelete(project.id)}
                    style={styles.confirmDeleteBtn}
                  >
                    <Text style={styles.confirmDeleteText}>CONFIRM DELETE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsDeleting(false)}
                    style={styles.cancelDeleteBtn}
                  >
                    <Text style={styles.cancelDeleteText}>NO</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsDeleting(true)}
                  style={styles.deleteBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteBtnText}>🗑 DELETE PROJECT</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', flex: mode === 'edit' ? 0 : 1 }}>
            <BrutalButton
              label="CANCEL"
              variant="secondary"
              size="sm"
              onPress={onClose}
            />

            <BrutalButton
              label={mode === 'create' ? '+ CREATE PROJECT' : '✓ SAVE SETTINGS'}
              variant="primary"
              accentColor={accentColor}
              size="sm"
              disabled={!name.trim()}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 16,
  },
  card: {
    width: 600,
    maxWidth: '96%',
    backgroundColor: CREAM,
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    shadowColor: INK,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: WHITE,
  },
  titleText: {
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.3,
  },
  subtitleText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    fontWeight: '900',
    color: INK,
  },
  fieldLabel: {
    fontFamily: FONTS.display,
    fontSize: 11,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldHint: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: '#666666',
    marginBottom: 6,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: RADIUS.button,
  },
  categoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.small,
    borderWidth: 1.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '800',
    color: INK,
  },
  categorySubtitle: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: '#666666',
    marginTop: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.button,
    backgroundColor: WHITE,
    marginTop: 4,
  },
  logoPreviewWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoActionBtn: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    backgroundColor: YELLOW,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoActionBtnText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },
  logoRemoveBtn: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    backgroundColor: CREAM,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logoRemoveBtnText: {
    fontFamily: FONTS.display,
    fontSize: 10,
    fontWeight: '900',
    color: '#C0392B',
  },
  logoStatusText: {
    fontFamily: FONTS.body,
    fontSize: 10,
    color: '#777777',
    fontStyle: 'italic',
  },
  swatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  swatchBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 2,
    borderTopColor: INK,
    backgroundColor: WHITE,
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  deleteBtnText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    fontWeight: '900',
    color: '#D63031',
  },
  confirmDeleteBtn: {
    backgroundColor: '#D63031',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  confirmDeleteText: {
    fontFamily: FONTS.display,
    fontSize: 10,
    fontWeight: '900',
    color: WHITE,
  },
  cancelDeleteBtn: {
    backgroundColor: CREAM,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelDeleteText: {
    fontFamily: FONTS.display,
    fontSize: 10,
    fontWeight: '900',
    color: INK,
  },
});

export default ProjectModal;
