import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

export interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  /**
   * Prévient le parent qu'un zoom est actif : le carrousel doit alors cesser
   * de capter le glissement horizontal, sinon déplacer une image agrandie
   * ferait défiler vers le média suivant.
   */
  onZoomChange?: (zoomed: boolean) => void;
}

/**
 * Image agrandissable au pincement, avec double appui.
 *
 * Construite sur gesture-handler et reanimated, tous deux déjà présents — la
 * lecture vidéo, elle, demandera une dépendance. Les gestes tournent sur le
 * fil d'interface (`worklet`), donc le zoom reste fluide même pendant que la
 * liste charge des images en arrière-plan.
 */
export function ZoomableImage({
  uri,
  width,
  height,
  onZoomChange,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const notify = (zoomed: boolean) => onZoomChange?.(zoomed);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(notify)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      // Bornes : en dessous de 1 l'image rétrécit dans le vide, au-delà de 4
      // elle devient une bouillie de pixels.
      scale.value = Math.min(
        MAX_SCALE,
        Math.max(1, savedScale.value * event.scale),
      );
    })
    .onEnd(() => {
      if (scale.value <= 1.02) reset();
      else {
        savedScale.value = scale.value;
        runOnJS(notify)(true);
      }
    });

  // Le déplacement n'est actif QUE zoomé : sinon il volerait le glissement
  // horizontal du carrousel, et on ne pourrait plus changer de média.
  const pan = Gesture.Pan()
    .enabled(true)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      runOnJS(notify)(true);
    });

  // `Simultaneous` pour pincer et déplacer d'un même mouvement à deux doigts ;
  // le double appui reste exclusif, sinon il se déclencherait pendant un
  // pincement rapide.
  const gesture = Gesture.Exclusive(
    doubleTap,
    Gesture.Simultaneous(pinch, pan),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, animatedStyle]}>
        <Image
          source={{ uri }}
          contentFit="contain"
          transition={150}
          style={{ width, height }}
        />
      </Animated.View>
    </GestureDetector>
  );
}
