/**
 * src/components/EntryListCard.tsx
 *
 * Neobrutalist Entry List Card:
 *  - BrutalBox container with 2px ink border and hard offset shadow
 *  - Thumbnail framed with 2px ink border
 *  - Title in display font (Space Grotesk / DM Sans Bold)
 *  - Colored tag pills
 *  - Selected state highlighted with accent badge or fill
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BORDER, CREAM, FONTS, INK, RADIUS, SHADOW, SPACE, TYPE, WHITE } from '../theme/brutal';
import type { Entry } from '../types/models';
import BrutalBox from './brutal/BrutalBox';
import { TagPill } from './TagPill';
import { ImageFrame } from './ImageFrame';
import { toPlainText } from '../utils/richText';

interface Props {
  entry: Entry;
  selected: boolean;
  accentColor: string;
  onPress: () => void;
  hideThumbnail?: boolean;
}

export const EntryListCard: React.FC<Props> = ({
  entry,
  selected,
  accentColor,
  onPress,
  hideThumbnail = false,
}) => {
  return (
    <View className="mb-2">
      <BrutalBox
        fill={selected ? WHITE : CREAM}
        borderColor={INK}
        borderWidth={selected ? BORDER.widthHeavy : BORDER.width}
        radius={RADIUS.card}
        shadowOffset={selected ? SHADOW.offsetHeavy : SHADOW.offsetSmall}
        onPress={onPress}
        style={{ padding: 8 }}
      >
        <View className="flex-row gap-2.5 items-center">
          {/* Framed Thumbnail with 2px ink border (hidden for Lore & Story) */}
          {!hideThumbnail && (
            <View
              className="rounded-small border-2 border-ink overflow-hidden bg-neutral-200"
              style={styles.thumbWrapper}
            >
              <ImageFrame
                kind="panel"
                source={entry.thumbnail}
                placeholderLabel={entry.title}
                style={styles.thumbInner}
                imageStyle={styles.thumbInner}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Details */}
          <View className="flex-1 justify-center">
            <View className="flex-row items-center justify-between mb-0.5">
              <Text
                className="font-display text-[13px] font-extrabold text-ink tracking-tight"
                numberOfLines={1}
              >
                {entry.title}
              </Text>
              {selected && (
                <View
                  className="w-2.5 h-2.5 rounded-full border-[1.5px] border-ink"
                  style={{ backgroundColor: accentColor }}
                />
              )}
            </View>

            <Text className="font-body text-[11px] text-neutral-600 leading-4 mb-1" numberOfLines={2}>
              {toPlainText(entry.summary)}
            </Text>

            {/* Tags: Strictly 1 line */}
            <View className="flex-row items-center pt-0.5 overflow-hidden" style={{ flexWrap: 'nowrap', maxHeight: 24 }}>
              {entry.tags.map(tag => (
                <TagPill key={tag.id} tag={tag} small />
              ))}
            </View>
          </View>
        </View>
      </BrutalBox>
    </View>
  );
};

const styles = StyleSheet.create({
  thumbWrapper: {
    width: 82,
    height: 82,
  },
  thumbInner: {
    width: 78,
    height: 78,
  },
});

export default EntryListCard;
