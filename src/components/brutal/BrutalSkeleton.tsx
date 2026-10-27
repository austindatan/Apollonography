/**
 * src/components/brutal/BrutalSkeleton.tsx
 *
 * Neobrutalist Skeleton Loader Primitive:
 * - Flat block with 2px ink border
 * - Gentle opacity pulse (0.5 to 1.0, 900ms loop)
 * - Driven by ONE shared animation value so multiple skeletons share a single timer
 * - Built-in 150ms delay guard to prevent flashing on fast data loads
 * - FadeInView helper for 120ms content arrival transitions
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BORDER, INK, RADIUS } from '../../theme/brutal';

// Single shared pulse animation for ALL skeletons across the application
const sharedPulse = new Animated.Value(0.5);

let isPulseLoopRunning = false;
let activeSkeletonCount = 0;
let pulseAnimation: Animated.CompositeAnimation | null = null;

function startSharedPulse() {
  if (isPulseLoopRunning) return;
  isPulseLoopRunning = true;
  pulseAnimation = Animated.loop(
    Animated.sequence([
      Animated.timing(sharedPulse, {
        toValue: 1.0,
        duration: 450,
        useNativeDriver: false,
      }),
      Animated.timing(sharedPulse, {
        toValue: 0.5,
        duration: 450,
        useNativeDriver: false,
      }),
    ])
  );
  pulseAnimation.start();
}

function stopSharedPulse() {
  if (pulseAnimation) {
    pulseAnimation.stop();
    pulseAnimation = null;
  }
  isPulseLoopRunning = false;
  sharedPulse.setValue(0.5);
}

export interface BrutalSkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
  fill?: string;
  delayMs?: number;
}

export const BrutalSkeleton: React.FC<BrutalSkeletonProps> = ({
  width = '100%',
  height = 20,
  radius = RADIUS.card,
  style,
  borderWidth = BORDER.width,
  borderColor = INK,
  fill = '#E7E3DC',
  delayMs = 150,
}) => {
  const [readyToShow, setReadyToShow] = useState(delayMs <= 0);

  useEffect(() => {
    activeSkeletonCount++;
    if (activeSkeletonCount === 1) {
      startSharedPulse();
    }

    let timer: any = null;
    if (delayMs > 0) {
      timer = setTimeout(() => {
        setReadyToShow(true);
      }, delayMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
      activeSkeletonCount = Math.max(0, activeSkeletonCount - 1);
      if (activeSkeletonCount === 0) {
        stopSharedPulse();
      }
    };
  }, [delayMs]);

  if (!readyToShow) {
    return <View style={[{ width: width as any, height: height as any, opacity: 0 }, style]} />;
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius: radius,
          borderWidth,
          borderColor,
          backgroundColor: fill,
          opacity: sharedPulse,
        },
        style,
      ]}
    />
  );
};

export interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  duration = 120,
  style,
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
  }, [duration, opacityAnim]);

  return (
    <Animated.View style={[{ opacity: opacityAnim }, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
});
