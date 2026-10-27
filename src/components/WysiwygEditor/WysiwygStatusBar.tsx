/**
 * src/components/WysiwygEditor/WysiwygStatusBar.tsx
 *
 * Neobrutalist status bar for WYSIWYG Editor:
 * - Word count, character count, selection word count
 * - Estimated reading time
 * - Live autosave status indicator (SAVED / SAVING...)
 * - Chapter Target Milestone (Not a hard cap! Unlimited words allowed)
 * - Supports targets up to 30,000+, 50,000+, or Free Write mode
 */

import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BORDER, CREAM, INK, RADIUS, TEAL, WHITE, YELLOW } from '../../theme/brutal';
import BrutalBox from '../brutal/BrutalBox';
import BrutalButton from '../brutal/BrutalButton';
import BrutalPill from '../brutal/BrutalPill';
import { BrutalTextInput } from '../brutal/BrutalTextInput';

interface Props {
  wordCount: number;
  characterCount: number;
  selectionWordCount?: number;
  isSaving?: boolean;
  wordGoal?: number;
  onUpdateWordGoal?: (newGoal: number) => void;
  onOpenGoalModal?: () => void;
}

export const WysiwygStatusBar: React.FC<Props> = ({
  wordCount,
  characterCount,
  selectionWordCount = 0,
  isSaving = false,
  wordGoal = 3000,
  onUpdateWordGoal,
  onOpenGoalModal,
}) => {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(wordGoal > 0 ? wordGoal : ''));

  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const hasGoal = typeof wordGoal === 'number' && wordGoal > 0;
  const rawPercent = hasGoal ? Math.round((wordCount / wordGoal) * 100) : 0;
  const barWidthPercent = Math.min(100, Math.max(0, rawPercent));
  const isGoalReached = hasGoal && wordCount >= wordGoal;

  const handleSaveGoal = () => {
    const trimmed = goalInput.trim();
    if (!trimmed || trimmed === '0') {
      onUpdateWordGoal?.(0);
    } else {
      const parsed = parseInt(trimmed, 10);
      if (!isNaN(parsed) && parsed > 0) {
        onUpdateWordGoal?.(parsed);
      }
    }
    setShowGoalModal(false);
  };

  const PRESETS = [
    { label: 'Free Write (No Cap)', val: 0 },
    { label: '1,000 Words', val: 1000 },
    { label: '3,000 Words', val: 3000 },
    { label: '5,000 Words', val: 5000 },
    { label: '10,000 Words', val: 10000 },
    { label: '30,000 Words (Novella)', val: 30000 },
    { label: '50,000 Words (Novel)', val: 50000 },
  ];

  return (
    <View style={styles.container}>
      {/* Left stats: Words, Chars, Selection, Read Time */}
      <View style={styles.leftGroup}>
        <BrutalPill
          label={`${wordCount.toLocaleString()} WORDS`}
          fill="#FFFFFF"
          size="sm"
        />

        <BrutalPill
          label={`${characterCount.toLocaleString()} CHARS`}
          fill="#FFFFFF"
          size="sm"
        />

        {selectionWordCount > 0 && (
          <BrutalPill
            label={`SEL: ${selectionWordCount.toLocaleString()}`}
            fill={YELLOW}
            size="sm"
          />
        )}

        <BrutalPill
          label={`${readTimeMinutes} MIN READ`}
          fill={TEAL}
          size="sm"
        />

        {/* Word Target Milestone (Clickable) */}
        <TouchableOpacity
          onPress={() => {
            if (onOpenGoalModal) {
              onOpenGoalModal();
            } else {
              setGoalInput(String(wordGoal > 0 ? wordGoal : ''));
              setShowGoalModal(true);
            }
          }}
          activeOpacity={0.8}
          style={styles.goalButton}
        >
          {hasGoal ? (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${barWidthPercent}%`,
                      backgroundColor: isGoalReached ? '#10B981' : YELLOW,
                    },
                  ]}
                />
              </View>
              <Text style={styles.goalLabel}>
                {isGoalReached
                  ? `✓ TARGET MET: ${wordCount.toLocaleString()} / ${wordGoal.toLocaleString()} (${rawPercent}%)`
                  : `TARGET: ${wordCount.toLocaleString()} / ${wordGoal.toLocaleString()} (${rawPercent}%)`}
              </Text>
            </>
          ) : (
            <BrutalPill
              label="FREE WRITE (UNLIMITED WORDS)"
              fill={CREAM}
              size="sm"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Right side: Save indicator */}
      <View style={styles.rightGroup}>
        <View
          style={[
            styles.saveDot,
            { backgroundColor: isSaving ? '#F59E0B' : '#10B981' },
          ]}
        />
        <Text style={styles.saveText}>
          {isSaving ? 'SAVING...' : 'SAVED'}
        </Text>
      </View>

      {/* Target Modal */}
      {showGoalModal && (
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowGoalModal(false)}
          />
          <BrutalBox
            fill={WHITE}
            borderColor={INK}
            borderWidth={BORDER.width}
            radius={RADIUS.card}
            shadowOffset={5}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                CHAPTER WORD MILESTONE TARGET
              </Text>
              <TouchableOpacity
                onPress={() => setShowGoalModal(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Explanatory Banner */}
            <View style={styles.bannerBox}>
              <Text style={styles.bannerBold}>
                💡 NO HARD CAP:
              </Text>
              <Text style={styles.bannerText}>
                This milestone is only a visual writing motivation goal. Apollonography does NOT limit your chapter size—you can write 30,000+ words per chapter!
              </Text>
            </View>

            <Text style={styles.inputLabel}>
              Target Words for this Chapter:
            </Text>
            <BrutalTextInput
              size="md"
              fill={CREAM}
              keyboardType="numeric"
              placeholder="e.g. 5000 or 30000 (0 for Free Write)"
              placeholderTextColor="#888"
              value={goalInput}
              onChangeText={setGoalInput}
              autoFocus
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                borderRadius: 6,
                marginBottom: 12,
              }}
            />

            <Text style={styles.presetsLabel}>
              Quick Target Presets:
            </Text>
            <View style={styles.presetsGrid}>
              {PRESETS.map(p => (
                <TouchableOpacity
                  key={p.val}
                  onPress={() => setGoalInput(String(p.val === 0 ? '' : p.val))}
                  style={[
                    styles.presetChip,
                    (String(p.val) === goalInput || (p.val === 0 && !goalInput)) && styles.presetChipActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <BrutalButton
                label="CANCEL"
                variant="secondary"
                size="sm"
                onPress={() => setShowGoalModal(false)}
              />
              <BrutalButton
                label="SET TARGET"
                variant="primary"
                size="sm"
                onPress={handleSaveGoal}
              />
            </View>
          </BrutalBox>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 38,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CREAM,
    borderTopWidth: 2,
    borderTopColor: INK,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 4,
  },
  progressTrack: {
    width: 80,
    height: 10,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 999,
    backgroundColor: WHITE,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  goalLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '900',
    color: INK,
  },
  saveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: INK,
  },
  saveText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    padding: 18,
    backgroundColor: WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CREAM,
  },
  closeBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: INK,
  },
  bannerBox: {
    backgroundColor: '#FEF9C3',
    borderWidth: 1.5,
    borderColor: '#CA8A04',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  bannerBold: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '900',
    color: '#854D0E',
    marginBottom: 2,
  },
  bannerText: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    lineHeight: 15,
    color: '#713F12',
  },
  inputLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '800',
    color: INK,
    marginBottom: 4,
  },
  numberInput: {
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: 'bold',
    color: INK,
    borderRadius: 6,
    marginBottom: 12,
  },
  presetsLabel: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '800',
    color: INK,
    marginBottom: 6,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: INK,
    borderRadius: 4,
    backgroundColor: CREAM,
  },
  presetChipActive: {
    backgroundColor: YELLOW,
  },
  presetChipText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '800',
    color: INK,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

export default WysiwygStatusBar;
