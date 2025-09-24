// src/utils/responsive.js
import { Dimensions, PixelRatio } from 'react-native';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const guidelineBaseWidth = 360;
const guidelineBaseHeight = 760;

export const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
export const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export const normalizeFont = (size) =>
  Math.round(PixelRatio.roundToNearestPixel(scale(size)));
