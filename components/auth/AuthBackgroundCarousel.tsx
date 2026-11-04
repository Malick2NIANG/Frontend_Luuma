import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

const BACKGROUND_IMAGES = [
  require('@/assets/Luuma pics/2.jpg'),
  require('@/assets/Luuma pics/8.jpg'),
  require('@/assets/Luuma pics/9.jpg'),
  require('@/assets/Luuma pics/5.jpg'),
  require('@/assets/Luuma pics/7.jpg'),
];

export function AuthBackgroundCarousel() {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndex((current) => (current + 1) % BACKGROUND_IMAGES.length);
    }, 4900);

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
    >
      <Image
        source={BACKGROUND_IMAGES[imageIndex]}
        contentFit="cover"
        transition={{
          duration: 1400,
          effect: 'cross-dissolve',
          timing: 'ease-in-out',
        }}
        priority="high"
        loading="eager"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(11, 70, 40, 0.5)' },
        ]}
      />
    </View>
  );
}
