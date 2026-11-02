import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type DimensionValue } from 'react-native';

export interface SkeletonProps {
  width?: DimensionValue;
  /** Accepte aussi un pourcentage : une vignette de grille remplit sa case. */
  height?: DimensionValue;
  radius?: number;
  /** Marge basse, pour empiler des lignes sans multiplier les conteneurs. */
  mb?: number;
}

/**
 * Bloc gris pulsé, en attendant le contenu réel.
 *
 * Une pulsation d'opacité plutôt qu'un reflet balayant : le reflet demande un
 * dégradé animé, donc une dépendance de plus, pour un effet qui attire
 * l'attention sur l'attente au lieu de la faire oublier.
 *
 * La pulsation reste volontairement discrète — de 1 à 0,45. Un contraste plus
 * marqué transforme l'écran en clignotant, et donne l'impression que quelque
 * chose ne va pas.
 */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  mb = 0,
}: SkeletonProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    // Arrêt explicite au démontage : une boucle laissée en vie continuerait
    // de réveiller le fil d'animation après le remplacement par le contenu.
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        opacity: pulse,
        width,
        height,
        borderRadius: radius,
        marginBottom: mb,
        backgroundColor: '#EDEFF2',
      }}
    />
  );
}

/** Rond, pour les avatars et les anneaux de story. */
export function SkeletonCircle({ size = 34 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius={size / 2} />;
}

/**
 * Une publication du fil.
 *
 * Reproduit la vraie disposition — avatar, deux lignes d'en-tête, image en
 * 4:3, prix, titre — parce que c'est là tout l'intérêt : l'œil se place où le
 * contenu apparaîtra, et l'arrivée des données ne provoque aucun saut.
 */
export function FeedPostSkeleton() {
  return (
    <View className="border-b border-gray-100 px-3 pb-3 pt-2.5">
      <View className="flex-row items-center gap-2.5">
        <SkeletonCircle size={34} />
        <View className="flex-1">
          <Skeleton width="45%" height={12} mb={6} />
          <Skeleton width="30%" height={10} />
        </View>
        <Skeleton width={78} height={28} radius={14} />
      </View>

      <View className="mt-2.5">
        <Skeleton height={240} radius={0} />
      </View>

      <View className="mt-3">
        <Skeleton width="35%" height={18} mb={8} />
        <Skeleton width="80%" height={13} mb={10} />
        <Skeleton height={38} radius={8} />
      </View>
    </View>
  );
}

/** Le bandeau de stories, en tête du fil. */
export function StoriesRailSkeleton() {
  return (
    <View className="flex-row gap-3 border-b border-gray-100 px-3 py-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} className="items-center gap-1.5">
          <SkeletonCircle size={58} />
          <Skeleton width={44} height={9} />
        </View>
      ))}
    </View>
  );
}

/** Une vignette de la grille de résultats. */
export function ProductCellSkeleton({ width }: { width: number }) {
  return (
    <View style={{ width }} className="mb-2">
      <Skeleton width={width} height={width * 1.15} radius={10} mb={8} />
      <Skeleton width="55%" height={13} mb={6} />
      <Skeleton width="85%" height={11} mb={6} />
      <Skeleton width="40%" height={9} />
    </View>
  );
}

/** Une ligne de la liste des conversations. */
export function ConversationSkeleton() {
  return (
    <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 py-3">
      <SkeletonCircle size={44} />
      <View className="flex-1">
        <Skeleton width="40%" height={13} mb={7} />
        <Skeleton width="70%" height={11} />
      </View>
    </View>
  );
}

/** La fiche produit : image, titre, prix, blocs de choix. */
export function ProductDetailSkeleton() {
  return (
    <View>
      <Skeleton height={280} radius={0} />
      <View className="px-4 pt-4">
        <Skeleton width="75%" height={20} mb={12} />
        <Skeleton width="40%" height={13} mb={18} />
        <Skeleton width="35%" height={26} mb={16} />
        <Skeleton height={44} radius={12} mb={20} />
        <Skeleton width="30%" height={13} mb={10} />
        <View className="flex-row gap-2">
          <Skeleton width={56} height={40} radius={8} />
          <Skeleton width={56} height={40} radius={8} />
          <Skeleton width={56} height={40} radius={8} />
        </View>
      </View>
    </View>
  );
}
