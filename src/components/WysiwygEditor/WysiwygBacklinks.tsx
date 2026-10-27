/**
 * src/components/WysiwygEditor/WysiwygBacklinks.tsx
 *
 * Backlinks ("Linked From") Drawer:
 * - Scans project entries and chapters for references to the current document
 * - Displays referencing chapters/entries with context excerpts
 * - Allows 1-click navigation to the linking source
 */

import React from 'react';
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
import BrutalPill from '../brutal/BrutalPill';
import type { EditorBacklink } from './types';

interface Props {
  visible: boolean;
  backlinks: EditorBacklink[];
  onClose: () => void;
  onOpenSource: (sourceId: string, sourceType: string) => void;
}

export const WysiwygBacklinks: React.FC<Props> = ({
  visible,
  backlinks,
  onClose,
  onOpenSource,
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
            <Text style={styles.headerIcon}>🔗</Text>
            <Text style={styles.title}>LINKED FROM</Text>
            <BrutalPill
              label={`${backlinks.length}`}
              fill={YELLOW}
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

        {/* Backlinks List */}
        <ScrollView style={styles.listContainer}>
          {backlinks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No inbound links found.</Text>
              <Text style={styles.emptySubtext}>
                When other chapters or entries mention this chronicle using [[Wiki Links]] or @Mentions, they will appear here.
              </Text>
            </View>
          ) : (
            backlinks.map(link => (
              <TouchableOpacity
                key={link.sourceId}
                onPress={() => onOpenSource(link.sourceId, link.sourceType)}
                style={styles.card}
                activeOpacity={0.8}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.sourceTitle} numberOfLines={1}>
                    {link.sourceTitle}
                  </Text>
                  <BrutalPill
                    label={link.sourceType.toUpperCase()}
                    fill={CREAM}
                    size="sm"
                  />
                </View>

                {link.excerpt ? (
                  <Text style={styles.excerpt} numberOfLines={3}>
                    "{link.excerpt}"
                  </Text>
                ) : null}

                <View style={styles.cardBottom}>
                  <Text style={styles.jumpText}>VIEW SOURCE →</Text>
                </View>
              </TouchableOpacity>
            ))
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
    zIndex: 90,
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
  card: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: WHITE,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sourceTitle: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '900',
    color: INK,
    flex: 1,
    marginRight: 6,
  },
  excerpt: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    lineHeight: 16,
    color: '#555555',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 6,
  },
  jumpText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    fontWeight: '900',
    color: INK,
  },
});

export default WysiwygBacklinks;
