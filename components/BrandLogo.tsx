import { Image } from 'expo-image';
import { View } from 'react-native';

export interface BrandLogoProps {
  width: number;
  height: number;
}

/**
 * La marque, partout où elle apparaît.
 *
 * Une seule image (`logo-mark.png`) sur tous les écrans : le fichier
 * `Icon.png` est un carré de 500 px dont le dessin n'occupe que 254×179, et
 * ses coins arrondis faisaient « raccourci d'application » posés sur du blanc.
 *
 * Le rapport 254:179 doit être respecté par chaque appelant, sinon l'image se
 * déforme — `contentFit="contain"` protège du pire mais laisse des marges.
 */
export function BrandLogo({ width, height }: BrandLogoProps) {
  return (
    <View>
      <Image
        source={require('@/assets/logo-mark.png')}
        contentFit="contain"
        style={{ width, height }}
      />
    </View>
  );
}
