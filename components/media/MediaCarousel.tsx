import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { MediaViewer } from '@/components/media/MediaViewer';
import { colors } from '@/constants/colors';
import { useContentWidth } from '@/hooks/useContentWidth';
import { toMediaItems } from '@/lib/media';

export interface MediaCarouselProps {
  /** Photos et vidéos mélangées, dans l'ordre choisi par le commerçant. */
  media: string[];
  /** Rapport largeur/hauteur. 1 = carré, 1.33 = paysage doux. */
  aspectRatio?: number;
  /** Marge horizontale à déduire. 0 = bord à bord, comme dans un fil. */
  horizontalInset?: number;
  /**
   * Ouvre la visionneuse plein écran au toucher. Vrai sur la fiche produit,
   * faux dans le fil où le toucher doit mener à la fiche.
   */
  openOnPress?: boolean;
}

/**
 * Carrousel paginé mêlant photos et vidéos.
 *
 * Un `ScrollView` avec `pagingEnabled` plutôt qu'une liste virtualisée : une
 * publication compte rarement plus de dix médias, et la virtualisation
 * introduirait des blancs au défilement rapide pour aucun gain réel.
 *
 * Les vidéos ne sont PAS chargées ici : elles s'affichent en vignette sombre
 * avec un bouton de lecture, et ne se téléchargent qu'à l'ouverture du plein
 * écran. Précharger plusieurs mégaoctets pour quelqu'un qui fait défiler son
 * fil consommerait son forfait sans qu'il l'ait demandé.
 */
export function MediaCarousel({
  media,
  aspectRatio = 1.2,
  horizontalInset = 0,
  openOnPress = false,
}: MediaCarouselProps) {
  const contentWidth = useContentWidth();
  const width = contentWidth - horizontalInset;
  const height = width / aspectRatio;

  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const items = toMediaItems(media);
  const rounded = horizontalInset > 0 ? 'rounded-2xl' : '';

  if (items.length === 0) {
    return (
      <View
        style={{ width, height: height * 0.6 }}
        className={['items-center justify-center bg-gray-100', rounded].join(' ')}
      >
        <Ionicons name="image-outline" size={36} color="#9CA3AF" />
      </View>
    );
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  return (
    <View style={{ width, height }} className={['overflow-hidden', rounded].join(' ')}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {items.map((item, position) => (
          <Pressable
            key={item.uri}
            onPress={
              openOnPress
                ? () => {
                    setIndex(position);
                    setViewerOpen(true);
                  }
                : undefined
            }
            accessibilityRole={openOnPress ? 'button' : undefined}
            accessibilityLabel={
              openOnPress
                ? item.kind === 'video'
                  ? 'Lire la vidéo en plein écran'
                  : 'Agrandir la photo'
                : undefined
            }
            style={{ width, height }}
          >
            {item.kind === 'video' ? (
              // Vignette et non lecteur : voir le commentaire d'en-tête.
              <View
                style={{ width, height }}
                className="items-center justify-center bg-gray-900"
              >
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
                  <Ionicons name="play" size={30} color={colors.white} />
                </View>
                <Text className="mt-2.5 text-[11px] text-white/70">
                  Vidéo · touchez pour lire
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: item.uri }}
                contentFit="cover"
                transition={180}
                style={{ width, height }}
              />
            )}
          </Pressable>
        ))}
      </ScrollView>

      {items.length > 1 && (
        <>
          {/* Compteur en surimpression, comme sur Instagram : il indique la
              profondeur du carrousel même sans faire défiler. */}
          <View className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1">
            <Text className="text-xs font-medium text-white">
              {index + 1}/{items.length}
            </Text>
          </View>

          <View className="absolute bottom-3 w-full flex-row items-center justify-center gap-1.5">
            {items.map((item, position) => (
              <View
                key={item.uri}
                className={[
                  'h-1.5 rounded-full',
                  position === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60',
                ].join(' ')}
              />
            ))}
          </View>
        </>
      )}

      {/* Loupe discrète : sans elle, rien n'indique que l'image s'agrandit. */}
      {openOnPress && items[index]?.kind === 'image' ? (
        <View className="absolute bottom-3 right-3 h-8 w-8 items-center justify-center rounded-full bg-black/45">
          <Ionicons name="expand-outline" size={16} color={colors.white} />
        </View>
      ) : null}

      <MediaViewer
        visible={viewerOpen}
        uris={media}
        initialIndex={index}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}
