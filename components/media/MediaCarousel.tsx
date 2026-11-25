import { useRef, useState, type ComponentRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { InlineVideo } from '@/components/media/InlineVideo';
import { MediaViewer } from '@/components/media/MediaViewer';
import { colors } from '@/constants/colors';
import { useContentWidth } from '@/hooks/useContentWidth';
import { toMediaItems } from '@/lib/media';
import { useAppLanguage } from '@/lib/appLanguage';

const MAX_MEDIA_WIDTH = 960;

/** L'appareil a un pointeur précis qui survole : une souris ou un pavé tactile. */
const SOURIS =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

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
  /**
   * La publication est-elle regardée en ce moment ? Dans le fil : visible à
   * l'écran ET onglet actif. Une vidéo ne joue que si c'est le cas.
   * Vrai par défaut — sur la fiche produit, le carrousel est toujours vu.
   */
  active?: boolean;
}

/**
 * Carrousel paginé mêlant photos et vidéos, à la manière d'Instagram.
 *
 * Un `ScrollView` avec `pagingEnabled` plutôt qu'une liste virtualisée : une
 * publication compte rarement plus de dix médias, et la virtualisation
 * introduirait des blancs au défilement rapide pour aucun gain réel.
 *
 * VIDÉOS : celle de la diapositive affichée se lance seule, sans le son,
 * quand la publication est regardée (`active`), et s'arrête dès qu'on glisse
 * vers la suivante ou que la publication sort de l'écran. Seule cette vidéo-là
 * est chargée : les autres restent des vignettes. Toucher une vidéo active ou
 * coupe le son ; sur la fiche, un bouton dédié ouvre le plein écran.
 */
export function MediaCarousel({
  media,
  aspectRatio = 1.2,
  horizontalInset = 0,
  openOnPress = false,
  active = true,
}: MediaCarouselProps) {
  const { t } = useAppLanguage();
  const contentWidth = useContentWidth();
  const width = Math.min(contentWidth, MAX_MEDIA_WIDTH) - horizontalInset;
  const height = width / aspectRatio;

  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const items = toMediaItems(media);
  const rounded = horizontalInset > 0 ? 'rounded-2xl' : '';

  if (items.length === 0) {
    return (
      <View
        style={{ width, height: height * 0.6 }}
        className={[
          'self-center items-center justify-center bg-gray-100',
          rounded,
        ].join(' ')}
      >
        <Ionicons name="image-outline" size={36} color="#9CA3AF" />
      </View>
    );
  }

  /**
   * Suivi de la diapositive affichée PENDANT le défilement.
   *
   * `onMomentumScrollEnd` n'existe pas sur le web : le compteur restait figé
   * à « 1/2 » et la vidéo ne démarrait jamais. `onScroll` fonctionne partout ;
   * on ne met l'état à jour que lorsque la diapositive change réellement.
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < items.length) setIndex(next);
  };

  const allerA = (cible: number) => {
    const borne = Math.max(0, Math.min(items.length - 1, cible));
    scrollRef.current?.scrollTo({ x: borne * width, animated: true });
    setIndex(borne);
  };

  /**
   * Flèches ‹ › : seulement avec une souris, qui ne sait pas glisser.
   *
   * Pas sur le web en général : dans le navigateur d'un téléphone, on glisse
   * au doigt, et des flèches y encombreraient la photo pour rien.
   */
  const fleches = SOURIS && items.length > 1;

  return (
    <View
      style={{ width, height, alignSelf: 'center' }}
      className={['overflow-hidden', rounded].join(' ')}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        {items.map((item, position) => (
          <Pressable
            key={item.uri}
            // Sur une vidéo, le toucher règle le son (InlineVideo) : il ne
            // doit pas aussi ouvrir le plein écran.
            onPress={
              openOnPress && item.kind === 'image'
                ? () => {
                    setIndex(position);
                    setViewerOpen(true);
                  }
                : undefined
            }
            disabled={item.kind === 'video'}
            accessibilityRole={openOnPress && item.kind === 'image' ? 'button' : undefined}
            accessibilityLabel={
              openOnPress && item.kind === 'image'
                ? t('Agrandir la photo', 'Enlarge photo')
                : undefined
            }
            style={{ width, height }}
          >
            {item.kind === 'video' ? (
              active && position === index ? (
                <InlineVideo
                  uri={item.uri}
                  width={width}
                  height={height}
                  playing={active && !viewerOpen}
                />
              ) : (
                // Fond neutre, sans bouton de lecture : comme sur Instagram,
                // la vidéo démarre d'elle-même dès qu'on arrive dessus. Rien
                // n'est téléchargé tant qu'elle est hors champ.
                <View style={{ width, height }} className="bg-gray-900" />
              )
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

      {fleches && index > 0 ? (
        <Pressable
          onPress={() => allerA(index - 1)}
          accessibilityRole="button"
          accessibilityLabel={t('Précédent', 'Previous')}
          className="absolute left-2 top-1/2 -mt-4 h-8 w-8 items-center justify-center rounded-full bg-white/85"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
      ) : null}
      {fleches && index < items.length - 1 ? (
        <Pressable
          onPress={() => allerA(index + 1)}
          accessibilityRole="button"
          accessibilityLabel={t('Suivant', 'Next')}
          className="absolute right-2 top-1/2 -mt-4 h-8 w-8 items-center justify-center rounded-full bg-white/85"
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      ) : null}

      {/* Loupe discrète : sans elle, rien n'indique que l'image s'agrandit. */}
      {openOnPress && items[index]?.kind === 'image' ? (
        <View className="absolute bottom-3 right-3 h-8 w-8 items-center justify-center rounded-full bg-black/45">
          <Ionicons name="expand-outline" size={16} color={colors.white} />
        </View>
      ) : null}

      {/* Sur la fiche, une vidéo s'ouvre en plein écran par un bouton à part
          (en haut à gauche) : le toucher sur la vidéo est pris par le son. */}
      {openOnPress && items[index]?.kind === 'video' ? (
        <Pressable
          onPress={() => setViewerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('Voir en plein écran', 'View full screen')}
          hitSlop={8}
          className="absolute left-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-black/60"
        >
          <Ionicons name="expand-outline" size={16} color={colors.white} />
        </Pressable>
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
