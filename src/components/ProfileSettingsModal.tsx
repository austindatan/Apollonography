/**
 * src/components/ProfileSettingsModal.tsx
 *
 * Full-featured Neobrutalist Profile & Settings Modal:
 * - Tabs:
 *   1. 👤 Profile (Display Name, Username, Bio, Avatar / Initials color, Photo upload)
 *   2. 🎨 Appearance (Theme selection, Workspace Accent Color, Border style)
 *   3. ⚙️ Preferences (Auto-save toggle, Default project view, Deletion confirmation)
 *   4. 💾 Storage & About (Workspace statistics, Backup export, App version & engine info)
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { pickImageFromComputer } from '../native/FilePicker';
import {
  BORDER,
  CREAM,
  INK,
  LAVENDER,
  ORANGE,
  RADIUS,
  SHADOW,
  TEAL,
  WHITE,
  YELLOW,
} from '../theme/brutal';
import type { Project, UserProfile } from '../types/models';
import BrutalBox from './brutal/BrutalBox';
import BrutalButton from './brutal/BrutalButton';
import BrutalPill from './brutal/BrutalPill';
import { BrutalTextInput } from './brutal/BrutalTextInput';
import { Icon, ICONS } from './Icon';
import { InitialsAvatar } from './InitialsAvatar';
import { exportWorkspaceArchive } from '../services/exportService';
import { clearCache, getCacheStats } from '../services/imageCacheService';
import { getFs, joinPaths } from '../utils/nodeFs';

export const AVATAR_COLOR_SWATCHES = [
  { label: 'Lavender', hex: '#B59CDD' },
  { label: 'Teal', hex: '#4ECDC4' },
  { label: 'Orange', hex: '#FF9F5A' },
  { label: 'Yellow', hex: '#FFD93D' },
  { label: 'Coral', hex: '#FF6B6B' },
  { label: 'Sky Blue', hex: '#4D96FF' },
  { label: 'Emerald', hex: '#6BCB77' },
  { label: 'Midnight', hex: '#2D3436' },
];

export const THEME_OPTIONS = [
  { id: 'cream', name: 'Cream Paper', desc: 'Warm Neobrutalist classic', color: '#FAF9F5' },
  { id: 'light', name: 'Clean White', desc: 'Minimalist high-clarity', color: '#FFFFFF' },
  { id: 'dark', name: 'Midnight Ink', desc: 'Sleek dark mode', color: '#18181B' },
];

export const DEFAULT_VIEW_OPTIONS = [
  { id: 'editor', name: 'EDITOR', icon: ICONS.article, desc: 'Direct article read & edit' },
  { id: 'gallery', name: 'GALLERY', icon: ICONS.grid, desc: 'Visual card grid showcase' },
  { id: 'series', name: 'SERIES', icon: ICONS.book, desc: 'Grouped multi-unit series' },
];

export interface ProfileSettingsModalProps {
  visible: boolean;
  profile: UserProfile;
  projects?: Project[];
  totalArticles?: number;
  onClose: () => void;
  onSave: (updatedProfile: UserProfile) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  visible,
  profile,
  projects = [],
  totalArticles = 0,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'preferences' | 'about'>('profile');

  // Form State
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username || '@austindatan');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarColor, setAvatarColor] = useState(profile.avatarColor || '#B59CDD');
  const [avatarUri, setAvatarUri] = useState<any>(profile.avatarUri || null);
  const [theme, setTheme] = useState<'cream' | 'light' | 'dark'>(profile.theme || 'cream');
  const [accentColor, setAccentColor] = useState(profile.accentColor || '#B59CDD');
  const [autoSave, setAutoSave] = useState<boolean>(profile.autoSave ?? true);
  const [defaultView, setDefaultView] = useState<'editor' | 'gallery' | 'series'>(profile.defaultView || 'editor');
  const [confirmDeletions, setConfirmDeletions] = useState<boolean>(profile.confirmDeletions ?? true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(profile.name);
      setUsername(profile.username || '@austindatan');
      setBio(profile.bio || '');
      setAvatarColor(profile.avatarColor || '#B59CDD');
      setAvatarUri(profile.avatarUri || null);
      setTheme(profile.theme || 'cream');
      setAccentColor(profile.accentColor || '#B59CDD');
      setAutoSave(profile.autoSave ?? true);
      setDefaultView(profile.defaultView || 'editor');
      setConfirmDeletions(profile.confirmDeletions ?? true);
      setActiveTab('profile');
      setToastMessage(null);
    }
  }, [visible, profile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handlePickAvatar = async () => {
    try {
      const res = await pickImageFromComputer();
      if (res && res.uri) {
        setAvatarUri(res.uri);
      }
    } catch (e) {
      console.warn('[ProfileSettingsModal] Image pick error:', e);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const jsonStr = await exportWorkspaceArchive();
      const fs = getFs();
      const proc = (globalThis as any).process;
      if (fs) {
        const homeDir = proc?.env?.USERPROFILE || proc?.env?.HOME || '.';
        const downloadsDir = joinPaths(homeDir, 'Downloads');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `Apollonography_Workspace_Archive_${timestamp}.json`;
        let targetPath = joinPaths(downloadsDir, fileName);
        try {
          fs.writeFileSync(targetPath, jsonStr, 'utf-8');
          showToast(`Archive exported to Downloads\\${fileName}`);
        } catch {
          const localAppData = proc?.env?.LOCALAPPDATA || '.';
          const backupsDir = joinPaths(localAppData, 'Apollonography', 'Backups');
          if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
          }
          targetPath = joinPaths(backupsDir, fileName);
          fs.writeFileSync(targetPath, jsonStr, 'utf-8');
          showToast(`Archive exported to Backups\\${fileName}`);
        }
      } else {
        showToast('Archive generated successfully.');
      }
    } catch (err: any) {
      console.warn('[ProfileSettingsModal] Export error:', err);
      showToast('Export failed. Please check storage permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const statsBefore = await getCacheStats();
      await clearCache();
      const freedMb = ((statsBefore.totalBytes || 0) / (1024 * 1024)).toFixed(1);
      showToast(`Cache pruned: ${statsBefore.count} files (${freedMb} MB freed).`);
    } catch (err: any) {
      console.warn('[ProfileSettingsModal] Clear cache error:', err);
      showToast('Failed to clear media cache.');
    } finally {
      setIsClearingCache(false);
    }
  };

  const computeInitials = (fullName: string): string => {
    const trimmed = fullName.trim();
    if (!trimmed) return 'AD';
    const words = trimmed.split(/[\s:_\-]+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  };

  const handleSave = () => {
    const updated: UserProfile = {
      ...profile,
      name: name.trim() || profile.name,
      initials: computeInitials(name),
      username: username.trim(),
      bio: bio.trim(),
      avatarColor,
      avatarUri,
      theme,
      accentColor,
      autoSave,
      defaultView,
      confirmDeletions,
    };
    onSave(updated);
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={styles.card}>
        {/* ── Modal Header ────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconBox, { backgroundColor: YELLOW }]}>
              <Icon glyph={ICONS.settings} size={18} color={INK} />
            </View>
            <View>
              <Text style={styles.headerTitle}>PROFILE &amp; SETTINGS</Text>
              <Text style={styles.headerSubtitle}>APOLLONOGRAPHY WORKSPACE PREFERENCES</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <BrutalPill
              label={profile.role || 'WORKSPACE OWNER'}
              fill={TEAL}
              size="sm"
            />
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tab Bar Navigation ──────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { id: 'profile', label: 'PROFILE' },
            { id: 'appearance', label: 'APPEARANCE' },
            { id: 'preferences', label: 'PREFERENCES' },
            { id: 'about', label: 'STORAGE & ABOUT' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive,
                  isActive && { borderBottomColor: INK },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Scrollable Tab Content ──────────────────────────────── */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Toast Banner */}
          {toastMessage && (
            <View style={styles.toastBanner}>
              <Text style={styles.toastText}>✓ {toastMessage}</Text>
            </View>
          )}

          {/* ── TAB 1: PROFILE ───────────────────────────────────── */}
          {activeTab === 'profile' && (
            <View style={styles.sectionContainer}>
              {/* Avatar & Photo Section */}
              <View style={styles.avatarCard}>
                <View style={styles.avatarWrapper}>
                  <InitialsAvatar
                    initials={computeInitials(name)}
                    color={avatarColor}
                    size={68}
                    fontSize={22}
                    imageUri={avatarUri}
                  />
                </View>

                <View style={styles.avatarActions}>
                  <Text style={styles.sectionLabel}>PROFILE AVATAR</Text>
                  <Text style={styles.sectionHint}>
                    Displayed in the bottom sidebar and article revisions.
                  </Text>

                  <View style={styles.avatarBtnRow}>
                    <BrutalButton
                      label="UPLOAD PHOTO"
                      variant="secondary"
                      size="sm"
                      onPress={handlePickAvatar}
                    />
                    {avatarUri ? (
                      <BrutalButton
                        label="REMOVE"
                        variant="secondary"
                        size="sm"
                        onPress={() => setAvatarUri(null)}
                      />
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Initials Color Palette */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>AVATAR BADGE COLOR:</Text>
                <View style={styles.swatchRow}>
                  {AVATAR_COLOR_SWATCHES.map(sw => {
                    const isSelected = avatarColor === sw.hex;
                    return (
                      <TouchableOpacity
                        key={sw.hex}
                        onPress={() => setAvatarColor(sw.hex)}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: sw.hex },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                        activeOpacity={0.8}
                      >
                        {isSelected && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Display Name */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>DISPLAY NAME:</Text>
                <BrutalTextInput
                  variant="single"
                  size="md"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name..."
                  borderWidth={2}
                />
                <Text style={styles.fieldHint}>
                  Used in the Home Dashboard greeting ("WELCOME BACK, {name.toUpperCase()}").
                </Text>
              </View>

              {/* Username / Handle */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>WORKSPACE HANDLE / USERNAME:</Text>
                <BrutalTextInput
                  variant="single"
                  size="md"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="@username"
                  borderWidth={2}
                />
              </View>

              {/* Bio / Title */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>BIO &amp; CREATOR TITLE:</Text>
                <BrutalTextInput
                  variant="multiline"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Share a short bio or chronicle focus..."
                  borderWidth={2}
                  minHeight={64}
                />
              </View>
            </View>
          )}

          {/* ── TAB 2: APPEARANCE ────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <View style={styles.sectionContainer}>
              {/* Theme Mode Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>THEME &amp; CANVAS PALETTE:</Text>
                <View style={styles.themeGrid}>
                  {THEME_OPTIONS.map(opt => {
                    const isSelected = theme === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => setTheme(opt.id as any)}
                        style={[
                          styles.themeOptionCard,
                          { backgroundColor: opt.color },
                          isSelected && styles.themeOptionCardSelected,
                        ]}
                        activeOpacity={0.85}
                      >
                        <View style={styles.themeCardHeader}>
                          <Text
                            style={[
                              styles.themeName,
                              { color: opt.id === 'dark' ? '#FFFFFF' : INK },
                            ]}
                          >
                            {opt.name}
                          </Text>
                          {isSelected && (
                            <View style={styles.themeActiveBadge}>
                              <Text style={styles.themeActiveText}>ACTIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.themeDesc,
                            { color: opt.id === 'dark' ? '#A1A1AA' : '#666666' },
                          ]}
                        >
                          {opt.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Workspace Accent Color */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>PRIMARY ACCENT COLOR:</Text>
                <View style={styles.swatchRow}>
                  {AVATAR_COLOR_SWATCHES.map(sw => {
                    const isSelected = accentColor === sw.hex;
                    return (
                      <TouchableOpacity
                        key={sw.hex}
                        onPress={() => setAccentColor(sw.hex)}
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: sw.hex },
                          isSelected && styles.colorSwatchSelected,
                        ]}
                        activeOpacity={0.8}
                      >
                        {isSelected && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.fieldHint}>
                  Used for primary action highlights, pills, and active badges.
                </Text>
              </View>

              {/* Neobrutalist Design Features Card */}
              <View style={styles.designNoticeBox}>
                <View style={styles.designNoticeHeader}>
                  <Text style={styles.designNoticeTitle}>⚡ NEOBRUTALIST STYLING TOKENS</Text>
                  <BrutalPill label="2PX INK" fill={YELLOW} size="sm" />
                </View>
                <Text style={styles.designNoticeBody}>
                  Apollonography runs on authentic 2px hard ink borders, 90-degree offset drop shadows, and high-contrast editorial typography.
                </Text>
              </View>
            </View>
          )}

          {/* ── TAB 3: PREFERENCES ───────────────────────────────── */}
          {activeTab === 'preferences' && (
            <View style={styles.sectionContainer}>
              {/* Default Project View Mode */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>DEFAULT PROJECT LANDING VIEW:</Text>
                <View style={styles.viewModeRow}>
                  {DEFAULT_VIEW_OPTIONS.map(v => {
                    const isSelected = defaultView === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => setDefaultView(v.id as any)}
                        style={[
                          styles.viewModeCard,
                          isSelected && styles.viewModeCardSelected,
                        ]}
                        activeOpacity={0.85}
                      >
                        <Icon glyph={v.icon} size={18} color={INK} />
                        <Text style={styles.viewModeName}>{v.name}</Text>
                        <Text style={styles.viewModeDesc}>{v.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Toggles */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>AUTO-SAVE ARTICLES</Text>
                    <Text style={styles.toggleSubtitle}>
                      Automatically save changes to draft storage every 30 seconds while editing.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setAutoSave(!autoSave)}
                    style={[
                      styles.switchContainer,
                      autoSave ? styles.switchActive : styles.switchInactive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        autoSave ? styles.switchThumbActive : styles.switchThumbInactive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>CONFIRM BEFORE DELETING</Text>
                    <Text style={styles.toggleSubtitle}>
                      Prompt with a warning dialog before permanently removing an article or ability.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setConfirmDeletions(!confirmDeletions)}
                    style={[
                      styles.switchContainer,
                      confirmDeletions ? styles.switchActive : styles.switchInactive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        confirmDeletions ? styles.switchThumbActive : styles.switchThumbInactive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ── TAB 4: STORAGE & ABOUT ───────────────────────────── */}
          {activeTab === 'about' && (
            <View style={styles.sectionContainer}>
              {/* Workspace Statistics Grid */}
              <Text style={styles.fieldLabel}>WORKSPACE OVERVIEW &amp; HEALTH:</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{projects.length}</Text>
                  <Text style={styles.statLabel}>PROJECTS ACTIVE</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{totalArticles}</Text>
                  <Text style={styles.statLabel}>UNITS / ARTICLES</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>100%</Text>
                  <Text style={styles.statLabel}>OFFLINE READY</Text>
                </View>
              </View>

              {/* Data & Backup Actions */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>DATA MANAGEMENT &amp; EXPORT:</Text>
                <View style={styles.dataActionRow}>
                  <BrutalButton
                    label={isExporting ? 'EXPORTING...' : 'EXPORT JSON BACKUP'}
                    variant="secondary"
                    onPress={handleExportBackup}
                  />
                  <BrutalButton
                    label={isClearingCache ? 'PRUNING...' : 'CLEAR MEDIA CACHE'}
                    variant="secondary"
                    onPress={handleClearCache}
                  />
                </View>
              </View>

              {/* System & Build Specs */}
              <View style={styles.aboutCard}>
                <View style={styles.aboutHeader}>
                  <View style={[styles.headerIconBox, { backgroundColor: TEAL }]}>
                    <Icon glyph={ICONS.article} size={16} color={INK} />
                  </View>
                  <View>
                    <Text style={styles.aboutAppTitle}>APOLLONOGRAPHY v0.84.0</Text>
                    <Text style={styles.aboutAppSubtitle}>Windows Native WinUI 3 (x64 Release)</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.specsRow}>
                  <Text style={styles.specKey}>RUNTIME ENGINE:</Text>
                  <Text style={styles.specVal}>React Native Windows 0.84 (C++)</Text>
                </View>
                <View style={styles.specsRow}>
                  <Text style={styles.specKey}>EDITOR CORE:</Text>
                  <Text style={styles.specVal}>TipTap v3 + WebView2 Edge Runtime</Text>
                </View>
                <View style={styles.specsRow}>
                  <Text style={styles.specKey}>DATA STORAGE:</Text>
                  <Text style={styles.specVal}>Local File System (Zero Cloud Lag)</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Modal Footer ────────────────────────────────────────── */}
        <View style={styles.footer}>
          <BrutalButton
            label="CANCEL"
            variant="secondary"
            onPress={onClose}
          />
          <BrutalButton
            label="SAVE CHANGES"
            variant="primary"
            onPress={handleSave}
          />
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
    width: 660,
    maxWidth: '96%',
    height: 560,
    backgroundColor: WHITE,
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    shadowColor: INK,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: BORDER.width,
    borderBottomColor: INK,
    backgroundColor: CREAM,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.small,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit',
    fontSize: 16,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.small,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '900',
    color: INK,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: '#FAF9F5',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: WHITE,
  },
  tabText: {
    fontFamily: 'Outfit',
    fontSize: 11,
    fontWeight: '800',
    color: '#777777',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: INK,
    fontWeight: '900',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: WHITE,
  },
  scrollContent: {
    padding: 20,
  },
  toastBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  toastText: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  sectionContainer: {
    gap: 16,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 14,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 999,
  },
  avatarActions: {
    flex: 1,
  },
  sectionLabel: {
    fontFamily: 'Outfit',
    fontSize: 13,
    fontWeight: '900',
    color: INK,
  },
  sectionHint: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
    marginBottom: 8,
  },
  avatarBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: 'Outfit',
    fontSize: 11,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.5,
  },
  fieldHint: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#777777',
    marginTop: 2,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.small,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    transform: [{ scale: 1.12 }],
    borderWidth: 2.5,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '900',
    color: WHITE,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 2,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  themeOptionCard: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.button,
    borderWidth: 2,
    borderColor: INK,
  },
  themeOptionCardSelected: {
    borderWidth: 2.5,
    backgroundColor: '#FFFBEB',
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  themeName: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '900',
  },
  themeActiveBadge: {
    backgroundColor: YELLOW,
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  themeActiveText: {
    fontFamily: 'DM Sans',
    fontSize: 8,
    fontWeight: '900',
    color: INK,
  },
  themeDesc: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    lineHeight: 14,
  },
  designNoticeBox: {
    padding: 12,
    borderRadius: RADIUS.small,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: '#FAF5FF',
    gap: 4,
  },
  designNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  designNoticeTitle: {
    fontFamily: 'Outfit',
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },
  designNoticeBody: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#444444',
    lineHeight: 16,
  },
  viewModeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  viewModeCard: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.button,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    alignItems: 'center',
    gap: 4,
  },
  viewModeCardSelected: {
    backgroundColor: '#FFF4D6',
    borderWidth: 2.5,
  },
  viewModeName: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '900',
    color: INK,
  },
  viewModeDesc: {
    fontFamily: 'DM Sans',
    fontSize: 9,
    color: '#666666',
    textAlign: 'center',
  },
  toggleCard: {
    padding: 14,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
    gap: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleTitle: {
    fontFamily: 'Outfit',
    fontSize: 12,
    fontWeight: '900',
    color: INK,
  },
  toggleSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  switchContainer: {
    width: 48,
    height: 26,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: INK,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: TEAL,
  },
  switchInactive: {
    backgroundColor: '#E5E7EB',
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: WHITE,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchThumbInactive: {
    alignSelf: 'flex-start',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.button,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontFamily: 'Outfit',
    fontSize: 22,
    fontWeight: '900',
    color: INK,
  },
  statLabel: {
    fontFamily: 'DM Sans',
    fontSize: 9,
    fontWeight: '800',
    color: '#555555',
  },
  dataActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aboutCard: {
    padding: 14,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    gap: 8,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutAppTitle: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '900',
    color: INK,
  },
  aboutAppSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#666666',
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specKey: {
    fontFamily: 'Outfit',
    fontSize: 10,
    fontWeight: '800',
    color: '#666666',
  },
  specVal: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    fontWeight: '700',
    color: INK,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: BORDER.width,
    borderTopColor: INK,
    backgroundColor: CREAM,
  },
});

export default ProfileSettingsModal;
