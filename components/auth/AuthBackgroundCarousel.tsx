import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const BACKGROUND_IMAGES = [
  require('@/assets/Luuma pics/2.jpg'),
  require('@/assets/Luuma pics/8.jpg'),
  require('@/assets/Luuma pics/9.jpg'),
  require('@/assets/Luuma pics/5.jpg'),
  require('@/assets/Luuma pics/7.jpg'),
];

/** Temps pendant lequel une image reste pleinement visible. */
const HOLD_MS = 4200;
/** Durée du fondu d'une image vers la suivante. */
const FADE_MS = 1600;
/** Amplitude du lent rapprochement. Au-delà, le mouvement se remarque. */
const ZOOM_TO = 1.07;

/**
 * Fond photographique des écrans d'authentification.
 *
 * DEUX CALQUES, et c'est le cœur du sujet. La version précédente n'avait
 * qu'une seule `<Image>` dont on changeait la source, en comptant sur la
 * transition intégrée d'`expo-image`. Tant que l'image suivante était déjà
 * décodée, le fondu était propre ; sinon le composant affichait l'ancienne
 * jusqu'au dernier moment puis basculait d'un coup — un à-coup visible, et
 * d'autant plus probable au premier passage, quand aucune image n'est encore
 * en cache.
 *
 * Ici le calque du dessous porte l'image affichée, celui du dessus l'image à
 * venir, montée et décodée AVANT que son opacité ne commence à monter. Le
 * fondu est donc toujours un fondu, jamais un remplacement.
 *
 * Le lent rapprochement n'est pas un ornement : une photo parfaitement
 * immobile pendant quatre secondes a l'air d'un écran figé, et l'œil le lit
 * comme un chargement bloqué. Un mouvement de 7 % suffit à donner vie sans
 * qu'on puisse le nommer. Il tourne sur le fil de l'interface graphique via
 * Reanimated, sans réveiller JavaScript à chaque image.
 */
export function AuthBackgroundCarousel({
  voile = 'fort',
  onChange,
}: {
  /**
   * Appelé au début de chaque fondu avec le numéro de la vue qui arrive
   * (0, 1, 2…, sans fin) — pour synchroniser un texte posé sur les photos.
   */
  onChange?: (vue: number) => void;
  /**
   * `fort` : du texte blanc est posé sur les photos (téléphone, tablette).
   * `leger` : les photos sont seules, à côté du formulaire (ordinateur) —
   * un voile épais les éteindrait sans rien rendre lisible.
   */
  voile?: 'fort' | 'leger';
} = {}) {
  const [frontIndex, setFrontIndex] = useState(0);
  const [backIndex, setBackIndex] = useState(1);

  const fade = useSharedValue(0);
  const zoom = useSharedValue(1);

  /**
   * Le rythme est tenu par des références, pas par de l'état.
   *
   * Avec `frontIsVisible` en dépendance de l'effet, chaque bascule détruisait
   * et recréait l'intervalle : le minuteur repartait de zéro à mi-course et
   * les images défilaient à contretemps. Ces trois références changent sans
   * provoquer de rendu, donc l'intervalle n'est monté qu'une seule fois.
   */
  const frontVisible = useRef(true);
  const vue = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const frontIndexRef = useRef(0);
  const backIndexRef = useRef(1);

  // Le rapprochement est continu et indépendant des fondus : il repart en
  // sens inverse plutôt que de sauter à son point de départ, ce qui se
  // verrait à chaque cycle.
  useEffect(() => {
    zoom.value = withRepeat(
      withTiming(ZOOM_TO, {
        duration: HOLD_MS + FADE_MS,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(zoom);
  }, [zoom]);

  useEffect(() => {
    const total = BACKGROUND_IMAGES.length;
    // Un seul délai peut être en vol à la fois : la permutation survient
    // 1 660 ms après le début d'un fondu, et le suivant n'arrive qu'à
    // 5 800 ms. Une référence unique suffit donc, là où un tableau aurait
    // grossi d'une entrée toutes les six secondes sans jamais se vider.
    let swap: ReturnType<typeof setTimeout> | undefined;

    const timer = setInterval(() => {
      // L'opacité va de 0 vers 1 — ou l'inverse — selon le calque qui porte
      // l'image à venir. Jamais de remise à zéro brutale : les rôles
      // s'échangent, et le calque libéré reçoit l'image suivante une fois
      // qu'il est devenu invisible. Rien n'est démonté, donc rien n'a à être
      // redécodé dans l'urgence.
      const revealBack = frontVisible.current;
      vue.current += 1;
      onChangeRef.current?.(vue.current);

      fade.value = withTiming(revealBack ? 1 : 0, {
        duration: FADE_MS,
        easing: Easing.inOut(Easing.cubic),
      });
      frontVisible.current = !revealBack;

      // Léger délai après la fin du fondu : changer la source d'un calque
      // encore partiellement visible laisserait voir le remplacement.
      swap = setTimeout(() => {
        if (revealBack) {
          frontIndexRef.current = (backIndexRef.current + 1) % total;
          setFrontIndex(frontIndexRef.current);
        } else {
          backIndexRef.current = (frontIndexRef.current + 1) % total;
          setBackIndex(backIndexRef.current);
        }
      }, FADE_MS + 60);
    }, HOLD_MS + FADE_MS);

    return () => {
      clearInterval(timer);
      // Sans cela, un changement de source pourrait survenir sur un composant
      // démonté — l'écran quitté au moment précis d'une transition.
      if (swap) clearTimeout(swap);
    };
  }, [fade]);

  const backStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { zIndex: 0, overflow: 'hidden' }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, zoomStyle]}>
        <Image
          source={BACKGROUND_IMAGES[frontIndex]}
          contentFit="cover"
          // La transition d'expo-image est désactivée : le fondu est piloté
          // ici. Laisser les deux actives les ferait se superposer.
          transition={0}
          priority="high"
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
          <Image
            source={BACKGROUND_IMAGES[backIndex]}
            contentFit="cover"
            transition={0}
            priority="high"
            cachePolicy="memory-disk"
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </Animated.View>
      </Animated.View>

      {voile === 'leger' ? (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8, 48, 28, 0.12)' }]}
        />
      ) : (
        <>
      {/* Deux voiles superposés plutôt qu'un seul uniforme.
          Le texte de ces écrans est entièrement blanc : sa lisibilité
          dépendait donc de la photo affichée, et une image claire — ciel,
          tissu blanc, mur chaulé — faisait passer le contraste sous le seuil
          lisible. Un voile uniforme plus opaque aurait réglé le problème en
          éteignant les photos ; le dégradé renforce le bas, où se trouvent
          les champs et les boutons, et laisse le haut respirer. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(11, 70, 40, 0.58)' },
        ]}
      />
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="authVeil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#08301C" stopOpacity="0.1" />
            <Stop offset="0.55" stopColor="#08301C" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#08301C" stopOpacity="0.62" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#authVeil)" />
      </Svg>
        </>
      )}
    </View>
  );
}
