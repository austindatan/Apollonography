/**
 * src/components/WysiwygEditor/WysiwygFootnotes.tsx
 *
 * Footnotes and Margin Notes Panel:
 * - Collapsible drawer / panel managing inline footnote citations and annotations
 * - Auto-numbered references [1], [2], etc.
 * - Live footnote text editing synced with Markdown/Word exports
 */

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BORDER,
  CREAM,
  INK,
  WHITE,
  YELLOW,
} from '../../theme/brutal';
import BrutalBox from '../brutal/BrutalBox';
import BrutalButton from '../brutal/BrutalButton';
import BrutalPill from '../brutal/BrutalPill';
import { BrutalTextInput } from '../brutal/BrutalTextInput';
import type { EditorFootnote } from './types';

interface Props {
  visible: boolean;
  footnotes: EditorFootnote[];
  selectedFootnoteId?: string;
  onClose: () => void;
  onAddFootnote: () => void;
  onUpdateFootnote: (id: string, text: string) => void;
  onDeleteFootnote: (id: string) => void;
  onSelectFootnote: (id: string) => void;
}

export const WysiwygFootnotes: React.FC<Props> = ({
  visible,
  footnotes,
  selectedFootnoteId,
  onClose,
  onAddFootnote,
  onUpdateFootnote,
  onDeleteFootnote,
  onSelectFootnote,
}) => {
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>📑</Text>
            <Text style={styles.title}>FOOTNOTES & NOTES</Text>
            <BrutalPill
              label={`${footnotes.length}`}
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

        {/* Add Footnote Bar */}
        <View style={styles.actionBar}>
          <BrutalButton
            label="+ INSERT FOOTNOTE CITATION"
            variant="primary"
            size="sm"
            onPress={onAddFootnote}
          />
        </View>

        {/* Footnotes List */}
        <ScrollView style={styles.listContainer}>
          {footnotes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No footnotes added.</Text>
              <Text style={styles.emptySubtext}>
                Click "+ INSERT FOOTNOTE CITATION" or type /footnote in the editor to attach an annotation to your text.
              </Text>
            </View>
          ) : (
            footnotes.map(fn => {
              const isSelected = fn.id === selectedFootnoteId;
              return (
                <View
                  key={fn.id}
                  style={[
                    styles.fnCard,
                    isSelected && styles.fnCardSelected,
                  ]}
                >
                  <View style={styles.fnCardHeader}>
                    <TouchableOpacity
                      onPress={() => onSelectFootnote(fn.id)}
                      style={styles.badgeBtn}
                      activeOpacity={0.8}
                    >
                      <BrutalPill
                        label={`[${fn.number}]`}
                        fill={isSelected ? YELLOW : '#FCE7F3'}
                        size="sm"
                      />
                      <Text style={styles.locateText}>LOCATE IN TEXT ↗</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => onDeleteFootnote(fn.id)}
                      style={styles.deleteBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <BrutalTextInput
                    variant="multiline"
                    value={fn.text}
                    onChangeText={text => onUpdateFootnote(fn.id, text)}
                    placeholder="Enter citation source, translation, or lore margin note..."
                    placeholderTextColor="#888888"
                    fill={CREAM}
                    borderWidth={1.5}
                    style={{
                      borderRadius: 4,
                      fontSize: 11,
                      minHeight: 64,
                    }}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      </BrutalBox>
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
    zIndex: 95,
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
  actionBar: {
    padding: 10,
    borderBottomWidth: 2,
    borderBottomColor: INK,
    backgroundColor: WHITE,
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
  fnCard: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: WHITE,
  },
  fnCardSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  fnCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locateText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    fontWeight: '900',
    color: '#666666',
  },
  deleteBtn: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: INK,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 10,
    fontWeight: '900',
    color: INK,
  },
});

export default WysiwygFootnotes;
