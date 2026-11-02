import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ZoomableImage } from '@/components/media/ZoomableImage';
import { VideoItem } from '@/components/media/VideoItem';
import { colors } from '@/constants/colors';
import { toMediaItems } from '@/lib/media';

export interface MediaViewerProps {
  visible: boolean;
  uris: string[];
  /** Média sur lequel ouvrir — celui qu'on vient de toucher. */
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Visionneuse plein écran, fond noir.
 *
 * Les images s'agrandissent au pincement ou au double appui, les vidéos se
 * lisent. On se déplace d'un média à l'autre par glissement horizontal — sauf
 * pendant un zoom, où le glissement sert à parcourir l'image agrandie : sans
 * cette exclusion, écarter une photo zoomée ferait sauter au média suivant.
 */
export function MediaViewer({
  visible,
  uris,
  initialIndex = 0,
  onClose,
}: MediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const items = toMediaItems(uris);

  // Ouverture sur le bon média : la visionneuse reste montée entre deux
  // ouvertures, sa position de défilement doit donc être repositionnée.
  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    setZoomed(false);
    // Sans délai, le ScrollView n'a pas encore sa largeur et l'offset est ignoré.
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * width, animated: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, initialIndex, width]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      // Plein écran réel : une visionneuse qui laisse voir la fiche derrière
      // n'immerge pas, et le fond noir sert justement à faire ressortir le
      // média.
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
        >
          {items.map((item) => (
            <View
              key={item.uri}
              style={{ width, height }}
              className="items-center justify-center"
            >
              {item.kind === 'video' ? (
                <VideoItem uri={item.uri} width={width} height={height * 0.7} />
              ) : (
                <ZoomableImage
                  uri={item.uri}
                  width={width}
                  height={height * 0.8}
                  onZoomChange={setZoomed}
                />
              )}
            </View>
          ))}
        </ScrollView>

        <SafeAreaView
          className="absolute left-0 right-0 top-0"
          edges={['top']}
          pointerEvents="box-none"
        >
          <View className="flex-row items-center justify-between px-4 pt-2">
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              className="h-9 w-9 items-center justify-center rounded-full bg-black/50"
            >
              <Ionicons name="close" size={22} color={colors.white} />
            </Pressable>

            {items.length > 1 ? (
              <View className="rounded-full bg-black/50 px-3 py-1">
                <Text className="text-xs font-medium text-white">
                  {index + 1} / {items.length}
                </Text>
              </View>
            ) : null}

            {/* Réserve la largeur du bouton pour que le compteur reste centré. */}
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>

        {items[index]?.kind === 'image' && !zoomed ? (
          <SafeAreaView
            className="absolute bottom-0 left-0 right-0"
            edges={['bottom']}
            pointerEvents="none"
          >
            <Text className="pb-4 text-center text-[11px] text-white/50">
              Pincez ou touchez deux fois pour agrandir
            </Text>
          </SafeAreaView>
        ) : null}
      </View>
    </Modal>
  );
}
