import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/constants/colors';

export const BRAND = 'Luuma';
export const TAGLINE = 'Les produits du Sénégal, livrés jusqu’à vous.';

const LOGO_MAX_WIDTH = 148;
const LOGO_ASPECT_RATIO = 254 / 179;
const EXIT_MS = 360;

export interface WelcomeScreenProps {
  ready: boolean;
  onDismissed: () => void;
}

export function WelcomeScreen({ ready, onDismissed }: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.38, LOGO_MAX_WIDTH);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const opacity = useSharedValue(1);
  const logoEntrance = useSharedValue(0);
  const copyEntrance = useSharedValue(0);

  useEffect(() => {
    logoEntrance.value = withTiming(1, {
      duration: 680,
      easing: Easing.out(Easing.cubic),
    });
    copyEntrance.value = withDelay(
      150,
      withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [copyEntrance, logoEntrance]);

  useEffect(() => {
    if (!ready) return;

    opacity.value = withTiming(
      0,
      { duration: EXIT_MS, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(onDismissed)();
      },
    );
  }, [ready, opacity, onDismissed]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoEntrance.value,
    transform: [
      { translateY: (1 - logoEntrance.value) * 14 },
      { scale: 0.9 + logoEntrance.value * 0.1 },
    ],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: copyEntrance.value,
    transform: [{ translateY: (1 - copyEntrance.value) * 12 }],
  }));

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: colors.white,
        },
        screenStyle,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${BRAND}. ${TAGLINE}`}
    >
      <View
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          borderRadius: 140,
          top: -112,
          right: -118,
          backgroundColor: '#EAF6EE',
          pointerEvents: 'none',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: 110,
          bottom: -96,
          left: -88,
          backgroundColor: '#F8F4E6',
          pointerEvents: 'none',
        }}
      />

      <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
        <Animated.View style={logoStyle}>
          <BrandLogo width={logoWidth} height={logoHeight} />
        </Animated.View>

        <Animated.View
          style={[{ alignItems: 'center', marginTop: 16 }, copyStyle]}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: 38,
              fontWeight: '800',
              letterSpacing: -1.5,
              lineHeight: 46,
            }}
          >
            {BRAND}
          </Text>
          <Text
            style={{
              maxWidth: 280,
              marginTop: 8,
              color: '#59665E',
              fontSize: 16,
              lineHeight: 24,
              textAlign: 'center',
            }}
          >
            {TAGLINE}
          </Text>
        </Animated.View>

        <LoadingDots />
      </View>
    </Animated.View>
  );
}

function LoadingDots() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginTop: 34,
      }}
    >
      <LoadingDot delay={0} />
      <LoadingDot delay={140} />
      <LoadingDot delay={280} />
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 420,
            easing: Easing.inOut(Easing.quad),
          }),
          withTiming(0, {
            duration: 420,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
        -1,
      ),
    );
  }, [delay, progress]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.28 + progress.value * 0.72,
    transform: [{ translateY: progress.value * -3 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.primary,
        },
        dotStyle,
      ]}
    />
  );
}
