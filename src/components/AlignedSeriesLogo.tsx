import React, { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, View, ViewStyle } from 'react-native';

interface AlignedSeriesLogoProps {
  source: ImageSourcePropType | string;
  maxHeight?: number;
  maxWidth?: number;
  tintColor?: string;
  style?: ViewStyle;
}

/**
 * AlignedSeriesLogo
 *
 * Renders a series logo constrained to maximum bounds while dynamically
 * calculating the exact bitmap aspect ratio via resolveAssetSource,
 * Image.getSize, and onLoad.
 *
 * By sizing the <Image /> to match its content's exact aspect ratio,
 * React Native's contain mode has no leftover lateral space, ensuring
 * the logo stays tightly flush to the LEFT without unwanted center-alignment.
 */
export const AlignedSeriesLogo: React.FC<AlignedSeriesLogoProps> = ({
  source,
  maxHeight = 135,
  maxWidth = 340,
  tintColor = 'black',
  style,
}) => {
  const imageSource: ImageSourcePropType =
    typeof source === 'string' ? { uri: source } : source;

  const [aspect, setAspect] = useState<number | null>(() => {
    try {
      const asset = Image.resolveAssetSource(imageSource);
      if (asset?.width && asset?.height && asset.height > 0) {
        return asset.width / asset.height;
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    const uri = typeof source === 'string' ? source : (source as any)?.uri;
    if (uri && typeof uri === 'string') {
      Image.getSize(
        uri,
        (w, h) => {
          if (w > 0 && h > 0) {
            setAspect(w / h);
          }
        },
        () => {}
      );
    }
  }, [source]);

  // If aspect ratio is still calculating, use a sensible default (1.5) so it doesn't blow out
  const effectiveAspect = aspect && aspect > 0 ? aspect : 1.5;
  const containerAspect = maxWidth / maxHeight;

  let renderWidth: number;
  let renderHeight: number;

  if (effectiveAspect > containerAspect) {
    // Wide banner logo: clamp to maxWidth, scale down height
    renderWidth = maxWidth;
    renderHeight = Math.max(20, Math.round(maxWidth / effectiveAspect));
  } else {
    // Square or tall logo: clamp to maxHeight, scale down width
    renderHeight = maxHeight;
    renderWidth = Math.max(20, Math.min(maxWidth, Math.round(maxHeight * effectiveAspect)));
  }

  return (
    <View style={[{ alignItems: 'flex-start', justifyContent: 'center' }, style]}>
      <Image
        source={imageSource}
        style={{
          width: renderWidth,
          height: renderHeight,
          tintColor,
        }}
        resizeMode="contain"
        onLoad={e => {
          const { width, height } = e.nativeEvent?.source || {};
          if (width > 0 && height > 0) {
            setAspect(width / height);
          }
        }}
      />
    </View>
  );
};

export default AlignedSeriesLogo;
