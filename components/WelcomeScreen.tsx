import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/constants/colors';
import { useAppLanguage } from '@/lib/appLanguage';

export const BRAND = 'Luuma';
export const TAGLINE = 'Les produits du Sénégal, livrés jusqu’à vous.';

const LOGO_MAX_WIDTH = 148;
const LOGO_ASPECT_RATIO = 254 / 179;
const ENTRANCE_MS = 420;
const EXIT_MS = 450;

export interface WelcomeScreenProps {
  ready: boolean;
  onDismissed: () => void;
}

export function WelcomeScreen({ ready, onDismissed }: WelcomeScreenProps) {
  const { t } = useAppLanguage();
  const { width, height } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.38, LOGO_MAX_WIDTH);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
  const opacity = useSharedValue(0);
  const brandEntrance = useSharedValue(0);
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [brandEntranceComplete, setBrandEntranceComplete] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: ENTRANCE_MS,
      easing: Easing.out(Easing.quad),
    });
  }, [opacity]);

  useEffect(() => {
    if (!brandLoaded) return;

    brandEntrance.value = withTiming(
      1,
      {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) runOnJS(setBrandEntranceComplete)(true);
      },
    );
  }, [brandEntrance, brandLoaded]);

  useEffect(() => {
    if (!ready || !brandEntranceComplete) return;

    opacity.value = withTiming(
      0,
      { duration: EXIT_MS, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(onDismissed)();
      },
    );
  }, [ready, brandEntranceComplete, opacity, onDismissed]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandEntrance.value,
    transform: [{ translateY: (1 - brandEntrance.value) * 12 }],
  }));
  const versionStyle = useAnimatedStyle(() => ({
    opacity: brandEntrance.value,
  }));
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: colors.white,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <AfricanLineArtBackground width={width} height={height} />
      </View>

      <Animated.View
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          },
          screenStyle,
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${BRAND}. ${t(
          TAGLINE,
          'Products from Senegal, delivered to you.',
        )}`}
      >
        <Animated.View
          style={[{ alignItems: 'center', paddingHorizontal: 32 }, brandStyle]}
        >
          <BrandLogo
            width={logoWidth}
            height={logoHeight}
            onLoad={() => setBrandLoaded(true)}
          />
          <View style={{ alignItems: 'center', marginTop: 16 }}>
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
              {t(TAGLINE, 'Products from Senegal, delivered to you.')}
            </Text>
          </View>
        </Animated.View>
        <Animated.View
          style={[
            {
              position: 'absolute',
              right: 0,
              bottom: 20,
              left: 0,
              alignItems: 'center',
            },
            versionStyle,
          ]}
        >
          <Text style={{ color: '#9CA3AF', fontSize: 11 }}>
            v{appVersion}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function AfricanLineArtBackground({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const spacing = 52;
  const diamonds: string[] = [];
  const crosshatch: string[] = [];

  for (let row = -1; row * spacing < height + spacing; row += 1) {
    for (let column = -1; column * spacing < width + spacing; column += 1) {
      const centerX = column * spacing + (row % 2 === 0 ? 0 : spacing / 2);
      const centerY = row * spacing + spacing / 2;
      diamonds.push(
        `M${centerX} ${centerY - 16}l16 16-16 16-16-16z`,
        `M${centerX} ${centerY - 8}l8 8-8 8-8-8z`,
      );
      crosshatch.push(
        `M${centerX - 16} ${centerY}h-10m52 0h-10`,
        `M${centerX} ${centerY - 16}v-10m0 52v-10`,
      );
    }
  }

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ opacity: 0.12 }}
    >
      <Defs>
        <LinearGradient id="lineArtFade" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <Stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <Stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.38" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </LinearGradient>
        <Mask
          id="lineArtMask"
          x="0"
          y="0"
          width={width}
          height={height}
          maskUnits="userSpaceOnUse"
        >
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="url(#lineArtFade)"
          />
        </Mask>
      </Defs>
      <G mask="url(#lineArtMask)">
        <Path
          d={diamonds.join('')}
          fill="none"
          stroke={colors.primary}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <Path
          d={crosshatch.join('')}
          fill="none"
          stroke={colors.primary}
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <Path
          d="M0 111l20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <Path
          d="M0 207l20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20 20 20 20-20"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {Array.from({ length: 9 }, (_, index) => {
          const x = index * 48 + 24;
          return (
            <Path
              key={`diamond-${index}`}
              d={`M${x} 120l20 20-20 20-20-20 20-20zm0 7 13 13-13 13-13-13 13-13z`}
              fill="none"
              stroke={colors.primary}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          );
        })}
        <Path
          d="M0 178h390M0 188l10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10 10 10-10"
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {Array.from({ length: 13 }, (_, index) => (
          <Path
            key={`stitch-${index}`}
            d={`M${index * 32 + 5} 237v8`}
            fill="none"
            stroke={colors.primary}
            strokeWidth="1"
          />
        ))}
      </G>
    </Svg>
  );
}
