/**
 * src/components/WysiwygEditor/WysiwygHistory.tsx
 *
 * Version History & Document Snapshots Drawer:
 * - Chronological list of snapshots with word count deltas (+/-)
 * - Auto-snapshot every N minutes and manual "Save Snapshot"
 * - Live snapshot preview and 1-click version restore
 */

import React, { useState } from 'react';
import {
  Alert,
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
import type { EditorSnapshot, TipTapDoc } from './types';

interface Props {
  visible: boolean;
  snapshots: EditorSnapshot[];
  currentWordCount: number;
  onClose: () => void;
  onSaveSnapshot: (label: string) => void;
  onRestoreSnapshot: (snapshot: EditorSnapshot) => void;
}

export const WysiwygHistory: React.FC<Props> = ({
  visible,
  snapshots,
  currentWordCount,
  onClose,
  onSaveSnapshot,
  onRestoreSnapshot,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [previewSnapshot, setPreviewSnapshot] = useState<EditorSnapshot | null>(null);

  const handleCreate = () => {
    const label = newLabel.trim() || 'Manual Snapshot';
    onSaveSnapshot(label);
    setNewLabel('');
  };

  const handleRestore = (snap: EditorSnapshot) => {
    // Confirm restore
    onRestoreSnapshot(snap);
    setPreviewSnapshot(null);
    onClose();
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = Date.now();
    const diffMins = Math.round((now - ts) / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
  };

  const extractPlainText = (doc: TipTapDoc): string => {
    function getTexts(node: any): string {
      if (node.text) return node.text;
      if (node.content) return node.content.map(getTexts).join(' ');
      return '';
    }
    return getTexts(doc);
  };

  if (!visible) return null;

  return (
    <View style={styles.drawerContainer}>
      <BrutalBox
        fill={WHITE}
        borderColor={INK}
        borderWidth={BORDER.width}
        radius={0}
        shadowOffset={0}
        style={styles.drawerBox}
      >
        {/* Drawer Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>⏱</Text>
            <Text style={styles.title}>VERSION HISTORY</Text>
            <BrutalPill
              label={`${snapshots.length}`}
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

        {/* Create Snapshot Input Bar */}
        <View style={styles.createBar}>
          <BrutalTextInput
            size="sm"
            fill={CREAM}
            placeholder="Label (e.g. Before battle rewrite)..."
            placeholderTextColor="#888888"
            value={newLabel}
            onChangeText={setNewLabel}
            style={{
              flex: 1,
              borderRadius: 4,
              fontSize: 11,
              height: 32,
            }}
          />
          <BrutalButton
            label="SAVE"
            variant="primary"
            size="sm"
            onPress={handleCreate}
          />
        </View>

        {/* Snapshots List */}
        <ScrollView style={styles.listContainer}>
          {snapshots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No snapshots recorded yet.</Text>
              <Text style={styles.emptySubtext}>
                Apollonography creates automatic checkpoints every 5 minutes, or you can save one above.
              </Text>
            </View>
          ) : (
            snapshots.map((snap, idx) => {
              const delta = snap.wordDelta ?? 0;
              const deltaText = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0';
              const deltaColor = delta > 0 ? '#15803D' : delta < 0 ? '#DC2626' : '#666666';

              return (
                <View key={snap.id} style={styles.snapshotCard}>
                  <View style={styles.snapRowTop}>
                    <Text style={styles.snapLabel} numberOfLines={1}>
                      {snap.label}
                    </Text>
                    <Text style={styles.snapTime}>{formatTime(snap.timestamp)}</Text>
                  </View>

                  <View style={styles.snapRowMiddle}>
                    <Text style={styles.snapWords}>
                      {snap.wordCount} words{' '}
                      <Text style={{ color: deltaColor, fontWeight: 'bold' }}>
                        ({deltaText})
                      </Text>
                    </Text>

                    {idx === 0 && (
                      <BrutalPill
                        label="LATEST"
                        fill={YELLOW}
                        size="sm"
                      />
                    )}
                  </View>

                  <View style={styles.snapActions}>
                    <TouchableOpacity
                      onPress={() => setPreviewSnapshot(snap)}
                      style={styles.previewBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.previewBtnText}>👁 PREVIEW</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRestore(snap)}
                      style={styles.restoreBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.restoreBtnText}>RESTORE</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </BrutalBox>

      {/* Snapshot Preview Modal */}
      {previewSnapshot && (
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPreviewSnapshot(null)}
          />
          <BrutalBox
              fill={WHITE}
              borderColor={INK}
              borderWidth={BORDER.width}
              radius={RADIUS.card}
              shadowOffset={6}
              style={styles.previewModalBox}
            >
              <View style={styles.previewHeader}>
                <View>
                  <Text style={styles.previewTitle}>
                    {previewSnapshot.label}
                  </Text>
                  <Text style={styles.previewSubtitle}>
                    {formatTime(previewSnapshot.timestamp)} • {previewSnapshot.wordCount} words
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPreviewSnapshot(null)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.previewBody}>
                <Text style={styles.previewContentText}>
                  {extractPlainText(previewSnapshot.doc) || '(Empty document)'}
                </Text>
              </ScrollView>

              <View style={styles.previewFooter}>
                <BrutalButton
                  label="CANCEL"
                  variant="secondary"
                  size="sm"
                  onPress={() => setPreviewSnapshot(null)}
                />
                <BrutalButton
                  label="RESTORE THIS VERSION"
                  variant="primary"
                  size="sm"
                  onPress={() => handleRestore(previewSnapshot)}
                />
              </View>
            </BrutalBox>
          </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    width: 320,
    height: '100%',
    borderLeftWidth: 2,
    borderLeftColor: INK,
    backgroundColor: WHITE,
    zIndex: 100,
  },
  drawerBox: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: CREAM,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 14,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: WHITE,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },
  createBar: {
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: INK,
  },
  listContainer: {
    flex: 1,
    padding: 10,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '800',
    color: INK,
    marginBottom: 6,
  },
  emptySubtext: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 16,
  },
  snapshotCard: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: WHITE,
  },
  snapRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  snapLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '800',
    color: INK,
    flex: 1,
    marginRight: 8,
  },
  snapTime: {
    fontFamily: 'DM Sans',
    fontSize: 10,
    color: '#666666',
  },
  snapRowMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  snapWords: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: INK,
  },
  snapActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
  },
  previewBtn: {
    flex: 1,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: CREAM,
    alignItems: 'center',
  },
  previewBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '800',
    color: INK,
  },
  restoreBtn: {
    flex: 1,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: YELLOW,
    alignItems: 'center',
  },
  restoreBtnText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '900',
    color: INK,
  },
  previewBackdrop: {
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
  previewModalBox: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '80%',
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
  previewTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 14,
    fontWeight: '900',
    color: INK,
  },
  previewSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: '#666666',
    marginTop: 2,
  },
  previewBody: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FAFAF9',
  },
  previewContentText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    lineHeight: 20,
    color: INK,
  },
  previewFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: INK,
    backgroundColor: CREAM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

export default WysiwygHistory;
