import { Image } from 'expo-image';
import { Platform, Text } from 'react-native';
import { flagOf } from '@/constants/countries';

export interface FlagProps {
  iso: string;
  /** Hauteur du drapeau. La largeur suit le rapport 4:3. */
  size?: number;
}

/**
 * Drapeau d'un pays.
 *
 * Deux rendus selon la plateforme, et ce n'est pas un caprice.
 *
 * Sur TÉLÉPHONE, l'emoji drapeau composé depuis le code ISO : rien à
 * télécharger, rien à embarquer, fonctionne hors ligne, et c'est le dessin que
 * l'utilisateur reconnaît puisque c'est celui de son clavier.
 *
 * Sur le WEB, une image. Windows ne fournit aucune police contenant les
 * drapeaux : l'emoji s'y affiche en deux lettres — « SN » au lieu du drapeau
 * sénégalais. Ce n'est pas contournable côté code, c'est la police système.
 *
 * L'image vient de flagcdn.com : gratuit, sans clé, sans quota. La dépendance
 * réseau ne concerne donc QUE le navigateur, jamais l'application installée.
 * Si un jour le web devient une cible de production, il faudra embarquer la
 * soixantaine de PNG plutôt que dépendre d'un service tiers.
 */
export function Flag({ iso, size = 18 }: FlagProps) {
  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri: `https://flagcdn.com/w40/${iso.toLowerCase()}.png` }}
        style={{ width: Math.round((size * 4) / 3), height: size, borderRadius: 2 }}
        contentFit="cover"
        // Décrit par le libellé voisin dans tous les usages actuels : le
        // répéter ferait lire « Sénégal Sénégal » à un lecteur d'écran.
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  }

  return <Text style={{ fontSize: size }}>{flagOf(iso)}</Text>;
}
