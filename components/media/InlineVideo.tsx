import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { colors } from '@/constants/colors';
import { useAppLanguage } from '@/lib/appLanguage';
import { useVideoSound } from '@/store/videoSound.store';

export interface InlineVideoProps {
  uri: string;
  width: number;
  height: number;
  /** Lire maintenant : publication à l'écran, diapositive affichée, écran actif. */
  playing: boolean;
}

/**
 * Vidéo dans une publication, à la manière d'Instagram.
 *
 * Elle se lance seule et SANS LE SON dès que la publication est à l'écran,
 * tourne en boucle, et s'arrête dès qu'elle n'est plus regardée. Toucher la
 * vidéo — ou le bouton en bas à droite — active ou coupe le son, pour toutes
 * les vidéos à la fois (voir useVideoSound).
 *
 * Ce composant n'est monté QUE pour la vidéo affichée d'une publication
 * visible : le carrousel montre une vignette pour les autres. Un lecteur par
 * vidéo du fil chargerait des dizaines de mégaoctets et autant de décodeurs
 * pour des vidéos que personne ne regarde.
 */
export function InlineVideo({ uri, width, height, playing }: InlineVideoProps) {
  const { t } = useAppLanguage();
  const muted = useVideoSound((s) => s.muted);
  const toggle = useVideoSound((s) => s.toggle);

  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={
        muted ? t('Activer le son', 'Turn sound on') : t('Couper le son', 'Mute')
      }
      style={{ width, height }}
      className="bg-black"
    >
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        // Sur le web, un `<video>` capte sinon le clic et le geste de
        // glissement du carrousel.
        pointerEvents="none"
      />

      {status === 'loading' ? (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator color={colors.white} />
        </View>
      ) : null}

      <View
        className="absolute bottom-3 right-3 h-8 w-8 items-center justify-center rounded-full bg-black/60"
        pointerEvents="none"
      >
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={16}
          color={colors.white}
        />
      </View>
    </Pressable>
  );
}
