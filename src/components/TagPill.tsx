/**
 * src/components/TagPill.tsx
 *
 * Neobrutalist sticker-style Tag Pill shown on entry cards and editor canvas.
 * 2px ink border, flat color fill, bold typography.
 */
import { Text, TouchableOpacity, View } from 'react-native';
import { INK } from '../theme/brutal';
import type { Tag } from '../types/models';
import BrutalPill from './brutal/BrutalPill';

interface Props {
  tag: Tag;
  small?: boolean;
  onRemove?: () => void;
}

export const TagPill: React.FC<Props> = ({ tag, small, onRemove }) => (
  <View className="flex-row items-center mr-1.5 mb-1">
    <BrutalPill
      label={tag.name}
      fill={tag.color}
      textColor={INK}
      size={small ? 'sm' : 'md'}
    />
    {onRemove && (
      <TouchableOpacity
        onPress={onRemove}
        activeOpacity={0.7}
        className="-ml-2 bg-ink rounded-full w-4 h-4 items-center justify-center z-10"
      >
        <Text className="text-white text-[10px] font-black leading-[11px]">✕</Text>
      </TouchableOpacity>
    )}
  </View>
);

export default TagPill;
