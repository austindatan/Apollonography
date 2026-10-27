/**
 * src/components/ImageLightbox.tsx
 *
 * Fullscreen Neobrutalist Image Lightbox for Apollonography.
 * - Backdrop: full-window overlay, solid black at 50% opacity (rgba(0,0,0,0.5))
 * - Image fits window at 100% zoom with 2px ink border, no cropping (original full image)
 * - Zoom range 100% to 400%:
 *   - Mouse wheel zooms in/out
 *   - Bottom toolbar: [-] [zoom %] [+] [Fit/Reset]
 *   - Double-click toggles between 100% and 200%
 *   - Keyboard: +/= and - zoom, 0 resets, Esc closes
 * - When zoomed in, mouse drag pans the image with boundary clamping
 * - Fade animation (~120ms)
 * - Top-right neobrutalist close button (bordered square, 'X')
 * - Graceful fallback placeholder on missing / error image files
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { BORDER, CREAM, FONTS, INK, RADIUS, SHADOW, WHITE, YELLOW } from '../theme/brutal';
import { resolveImageSource } from '../types/images';
import { getCloudinaryUrl } from '../utils/cloudinary';
import { getCachedImagePath } from '../services/imageCacheService';

interface ImageLightboxProps {
  visible: boolean;
  source: any;
  title?: string;
  onClose: () => void;
}

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  visible,
  source,
  title,
  onClose,
}) => {
  const windowDims = useWindowDimensions();
  const [layoutDims, setLayoutDims] = useState<{ width: number; height: number } | null>(null);

  // Measure true screen dimensions, protecting against Windows console 80x25 default
  const win = Dimensions.get('window');
  const scr = Dimensions.get('screen');
  const screenWidth = Math.max(
    layoutDims?.width || 0,
    windowDims.width > 200 ? windowDims.width : 0,
    win.width > 200 ? win.width : 0,
    scr.width > 200 ? scr.width : 0,
    1100
  );
  const screenHeight = Math.max(
    layoutDims?.height || 0,
    windowDims.height > 200 ? windowDims.height : 0,
    win.height > 200 ? win.height : 0,
    scr.height > 200 ? scr.height : 0,
    700
  );

  const screenWidthRef = useRef(screenWidth);
  const screenHeightRef = useRef(screenHeight);
  screenWidthRef.current = screenWidth;
  screenHeightRef.current = screenHeight;

  const [hasError, setHasError] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [cachedUri, setCachedUri] = useState<string | null>(null);

  // Animation values for zoom & pan (using single transform)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Mutable refs to track current transform without triggering re-render setState loops
  const currentScale = useRef(1.0);
  const currentTranslate = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const containerRef = useRef<View>(null);

  useEffect(() => {
    let active = true;
    if (!source) return;
    const s = resolveImageSource(source);
    if (s.kind === 'cloudinary') {
      const imgId = s.asset?.public_id || (s.asset as any)?.id || (s as any).publicId || (s as any).id;
      if (imgId) {
        getCachedImagePath(imgId).then(localPath => {
          if (active && localPath) {
            const formatted = localPath.startsWith('file:///')
              ? localPath
              : `file:///${localPath.replace(/\\/g, '/')}`;
            setCachedUri(formatted);
          }
        }).catch(() => {});
      }
    }
    return () => { active = false; };
  }, [source]);

  const resolvedSource = useMemo(() => {
    if (!source) return null;
    if (cachedUri) return { uri: cachedUri };

    const s = resolveImageSource(source);
    if (s.kind === 'bundled') return s.asset;
    if (s.kind === 'local') return { uri: s.uri };
    if (s.kind === 'cloudinary') {
      if ((s as any).uri) return { uri: (s as any).uri };
      if (s.asset) return { uri: getCloudinaryUrl(s.asset, { width: 1800 }) };
    }
    return source;
  }, [source, cachedUri]);

  // Reset zoom and pan state
  const resetTransform = useCallback(() => {
    currentScale.current = 1.0;
    currentTranslate.current = { x: 0, y: 0 };
    setZoomPercent(100);

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, translateX, translateY]);

  // Set specific zoom level with boundary clamping
  const applyZoom = useCallback((targetScale: number) => {
    const clampedScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetScale));
    currentScale.current = clampedScale;
    setZoomPercent(Math.round(clampedScale * 100));

    // Clamp pan when zooming
    const maxPanX = ((clampedScale - 1) * screenWidthRef.current) / 2;
    const maxPanY = ((clampedScale - 1) * screenHeightRef.current) / 2;

    let nextX = currentTranslate.current.x;
    let nextY = currentTranslate.current.y;
    if (clampedScale <= 1.0) {
      nextX = 0;
      nextY = 0;
    } else {
      nextX = Math.max(-maxPanX, Math.min(maxPanX, nextX));
      nextY = Math.max(-maxPanY, Math.min(maxPanY, nextY));
    }
    currentTranslate.current = { x: nextX, y: nextY };

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: clampedScale,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(translateX, {
        toValue: nextX,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: nextY,
        duration: 120,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, translateX, translateY]);

  // Double click handler: toggles between 100% and 200%
  const handleDoubleTap = useCallback(() => {
    if (currentScale.current > 1.05) {
      resetTransform();
    } else {
      applyZoom(2.0);
    }
  }, [resetTransform, applyZoom]);

  // Keyboard handler for react-native-windows / desktop
  const handleKeyDown = useCallback((e: any) => {
    const key = e.nativeEvent?.key || e.key;
    if (key === 'Escape') {
      onClose();
    } else if (key === '+' || key === '=') {
      applyZoom(currentScale.current + ZOOM_STEP);
    } else if (key === '-' || key === '_') {
      applyZoom(currentScale.current - ZOOM_STEP);
    } else if (key === '0') {
      resetTransform();
    }
  }, [onClose, applyZoom, resetTransform]);

  // Mouse wheel zoom handler
  const handleWheel = useCallback((e: any) => {
    const deltaY = e.nativeEvent?.deltaY ?? (e as any).deltaY ?? 0;
    if (deltaY < 0) {
      // Zoom in
      applyZoom(currentScale.current + ZOOM_STEP);
    } else if (deltaY > 0) {
      // Zoom out
      applyZoom(currentScale.current - ZOOM_STEP);
    }
  }, [applyZoom]);

  // Reset state whenever new image opens or visibility changes
  useEffect(() => {
    if (visible) {
      setHasError(false);
      currentScale.current = 1.0;
      currentTranslate.current = { x: 0, y: 0 };
      setZoomPercent(100);
      scaleAnim.setValue(1.0);
      translateX.setValue(0);
      translateY.setValue(0);

      // Short fade-in animation (~120ms)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: false,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, source, fadeAnim, scaleAnim, translateX, translateY]);

  // PanResponder for dragging image when zoomed in
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return currentScale.current > 1.0 && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
      },
      onPanResponderGrant: () => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          handleDoubleTap();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;

        panStart.current = {
          x: currentTranslate.current.x,
          y: currentTranslate.current.y,
        };
      },
      onPanResponderMove: (_, gestureState) => {
        if (currentScale.current <= 1.0) return;

        const maxPanX = ((currentScale.current - 0.5) * screenWidthRef.current) / 2;
        const maxPanY = ((currentScale.current - 0.5) * screenHeightRef.current) / 2;

        const rawX = panStart.current.x + gestureState.dx;
        const rawY = panStart.current.y + gestureState.dy;

        const clampedX = Math.max(-maxPanX, Math.min(maxPanX, rawX));
        const clampedY = Math.max(-maxPanY, Math.min(maxPanY, rawY));

        currentTranslate.current = { x: clampedX, y: clampedY };
        translateX.setValue(clampedX);
        translateY.setValue(clampedY);
      },
      onPanResponderRelease: () => {
        // Panning finished
      },
    })
  ).current;

  if (!visible) return null;

  const maxImgWidth = Math.round(screenWidth * 0.88);
  const maxImgHeight = Math.round(screenHeight * 0.82);

  return (
    <Animated.View
      style={[
        styles.fullOverlay,
        { opacity: fadeAnim },
      ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 200 && height > 200) {
          if (!layoutDims || Math.abs(layoutDims.width - width) > 5 || Math.abs(layoutDims.height - height) > 5) {
            setLayoutDims({ width, height });
          }
        }
      }}
      // Windows keyboard event listener
      focusable={true}
      // @ts-ignore RNW keyboard support
      onKeyDown={handleKeyDown}
      // @ts-ignore mouse wheel
      onWheel={handleWheel}
      ref={containerRef}
    >
      {/* 50% Black Backdrop (rgba(0,0,0,0.5)) - Click backdrop closes */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Close lightbox"
      />

      {/* Top Bar: Title & Neobrutalist Close Button */}
      <View style={styles.topBar} pointerEvents="box-none">
        {title ? (
          <View style={styles.titleBadge}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
          </View>
        ) : <View />}

        {/* Neobrutalist Close Button (bordered square, 'X') */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Centered Image Container with PanResponder */}
      <View
        style={styles.centerContainer}
        pointerEvents="box-none"
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.imageWrapper,
            {
              width: maxImgWidth,
              height: maxImgHeight,
              transform: [
                { translateX: translateX },
                { translateY: translateY },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {(!resolvedSource || hasError) ? (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderIcon}>✕</Text>
              <Text style={styles.placeholderLabel}>
                {title ? title.toUpperCase() : 'IMAGE NOT FOUND'}
              </Text>
            </View>
          ) : (
            <Image
              source={resolvedSource}
              onError={() => setHasError(true)}
              style={styles.image}
              resizeMode="contain"
            />
          )}
        </Animated.View>
      </View>

      {/* Bottom Neobrutalist Toolbar: [-] [zoom %] [+] [Fit/Reset] */}
      <View style={styles.bottomToolbarContainer} pointerEvents="box-none">
        <View style={styles.bottomToolbar}>
          {/* Zoom Out Button */}
          <TouchableOpacity
            style={[styles.toolbarButton, zoomPercent <= 100 && styles.toolbarButtonDisabled]}
            disabled={zoomPercent <= 100}
            onPress={() => applyZoom(currentScale.current - ZOOM_STEP)}
            activeOpacity={0.7}
          >
            <Text style={styles.toolbarButtonText}>−</Text>
          </TouchableOpacity>

          {/* Zoom Percent Indicator */}
          <View style={styles.zoomIndicator}>
            <Text style={styles.zoomIndicatorText}>{zoomPercent}%</Text>
          </View>

          {/* Zoom In Button */}
          <TouchableOpacity
            style={[styles.toolbarButton, zoomPercent >= 400 && styles.toolbarButtonDisabled]}
            disabled={zoomPercent >= 400}
            onPress={() => applyZoom(currentScale.current + ZOOM_STEP)}
            activeOpacity={0.7}
          >
            <Text style={styles.toolbarButtonText}>+</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.toolbarDivider} />

          {/* Fit / Reset Button */}
          <TouchableOpacity
            style={styles.fitButton}
            onPress={resetTransform}
            activeOpacity={0.7}
          >
            <Text style={styles.fitButtonText}>FIT / RESET</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100001,
  },
  titleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    shadowColor: INK,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    maxWidth: '70%',
  },
  titleText: {
    fontFamily: FONTS.display,
    fontSize: 12,
    fontWeight: '800',
    color: INK,
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  closeButtonText: {
    fontFamily: FONTS.display,
    fontSize: 16,
    fontWeight: '900',
    color: INK,
  },
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100000,
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  placeholderBox: {
    width: 280,
    height: 280,
    backgroundColor: '#E5E5E5',
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    shadowColor: INK,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  placeholderIcon: {
    fontFamily: FONTS.display,
    fontSize: 24,
    fontWeight: '900',
    color: INK,
    opacity: 0.7,
    marginBottom: 6,
  },
  placeholderLabel: {
    fontFamily: FONTS.display,
    fontSize: 11,
    fontWeight: '800',
    color: INK,
    opacity: 0.7,
    letterSpacing: 1,
    textAlign: 'center',
  },
  bottomToolbarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100001,
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.button,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    shadowColor: INK,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  toolbarButton: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    backgroundColor: CREAM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonDisabled: {
    opacity: 0.35,
    backgroundColor: '#F3F4F6',
  },
  toolbarButtonText: {
    fontFamily: FONTS.display,
    fontSize: 18,
    fontWeight: '900',
    color: INK,
    marginTop: -2,
  },
  zoomIndicator: {
    minWidth: 54,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  zoomIndicatorText: {
    fontFamily: FONTS.display,
    fontSize: 13,
    fontWeight: '800',
    color: INK,
    letterSpacing: 0.5,
  },
  toolbarDivider: {
    width: 2,
    height: 22,
    backgroundColor: INK,
    marginHorizontal: 2,
  },
  fitButton: {
    paddingHorizontal: 10,
    height: 32,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: RADIUS.small,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitButtonText: {
    fontFamily: FONTS.display,
    fontSize: 11,
    fontWeight: '800',
    color: INK,
    letterSpacing: 0.5,
  },
});

export default ImageLightbox;
