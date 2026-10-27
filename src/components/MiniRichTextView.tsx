/**
 * src/components/MiniRichTextView.tsx
 *
 * Ultra-fast native React Native renderer for short inline rich text:
 * - Parses bold, italic, underline, strike, inline code, highlights, and text colors.
 * - Renders directly in native text layout trees (60fps, zero WebViews needed for reading).
 * - Adheres strictly to the Apollonography Neobrutalist typography.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { INK, RADIUS, YELLOW } from '../theme/brutal';
import { parseRichTextSegments } from '../utils/richText';

interface MiniRichTextViewProps {
  content?: string | null;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  numberOfLines?: number;
}

export const MiniRichTextView: React.FC<MiniRichTextViewProps> = ({
  content,
  style,
  containerStyle,
  numberOfLines,
}) => {
  const segments = useMemo(() => {
    let cleanContent = content || '';
    while (
      cleanContent.includes('&lt;p&gt;') ||
      cleanContent.includes('&lt;strong&gt;') ||
      cleanContent.includes('&lt;mark') ||
      cleanContent.includes('&lt;em&gt;')
    ) {
      cleanContent = cleanContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
    return parseRichTextSegments(cleanContent);
  }, [content]);

  if (!content || segments.length === 0) {
    return (
      <Text style={[styles.defaultText, style]} numberOfLines={numberOfLines}>
        —
      </Text>
    );
  }

  return (
    <Text style={[styles.defaultText, style]} numberOfLines={numberOfLines}>
      {segments.map((seg, idx) => {
        const textStyles: TextStyle[] = [];

        if (seg.bold) {
          textStyles.push(styles.bold);
        }
        if (seg.italic) {
          textStyles.push(styles.italic);
        }
        if (seg.underline) {
          textStyles.push(styles.underline);
        }
        if (seg.strike) {
          textStyles.push(styles.strike);
        }
        if (seg.color) {
          textStyles.push({ color: seg.color });
        } else if (seg.highlight) {
          textStyles.push({
            color: seg.highlight === '#FEF08A' ? '#D97706' : seg.highlight,
          });
        }
        if (seg.code) {
          textStyles.push(styles.code);
        }

        return (
          <Text key={idx} style={textStyles}>
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: INK,
    lineHeight: 21,
  },
  bold: {
    fontWeight: '800',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  code: {
    fontFamily: 'Consolas',
    fontSize: 12,
    backgroundColor: '#F3F4F6',
    color: '#9333EA',
    fontWeight: '700',
  },
});

export default MiniRichTextView;
