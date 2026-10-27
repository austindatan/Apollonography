/**
 * src/components/InitialsAvatar.tsx
 * Programmatic circular avatar with initials — no image needed.
 */
import React from 'react';
import { Image, Text, View } from 'react-native';

interface Props {
  initials: string;
  color: string;
  size?: number;
  fontSize?: number;
  imageUri?: any;
}

export const InitialsAvatar: React.FC<Props> = ({
  initials,
  color,
  size = 32,
  fontSize = 12,
  imageUri,
}) => {
  if (imageUri) {
    return (
      <View
        className="border-2 border-ink items-center justify-center rounded-full overflow-hidden bg-white"
        style={{
          width: size,
          height: size,
        }}
      >
        <Image
          source={typeof imageUri === 'string' ? { uri: imageUri } : imageUri}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      className="border-2 border-ink items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    >
      <Text
        className="font-sans font-bold text-white tracking-wider"
        style={{ fontSize }}
      >
        {initials}
      </Text>
    </View>
  );
};

export default InitialsAvatar;
