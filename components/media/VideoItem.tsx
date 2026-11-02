import { useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { View } from 'react-native';

export interface VideoItemProps {
  uri: string;
  width: number;
  height: number;
  /** Lance la lecture dès l'affichage. Réservé au plein écran. */
  autoPlay?: boolean;
}

/**
 * Lecteur vidéo, utilisé UNIQUEMENT en plein écran.
 *
 * Le carrousel, lui, n'affiche qu'une vignette sombre avec un bouton de
 * lecture : charger la vidéo dans le fil ou sur la fiche coûterait plusieurs
 * mégaoctets à quelqu'un qui ne fera peut-être que passer. Sur une connexion
 * sénégalaise ou en itinérance depuis l'Europe, ce n'est pas un détail — c'est
 * du forfait dépensé sans qu'on l'ait demandé.
 *
 * Les octets ne partent donc que lorsque l'utilisateur ouvre la visionneuse,
 * c'est-à-dire quand il a explicitement voulu voir.
 */
export function VideoItem({
  uri,
  width,
  height,
  autoPlay = true,
}: VideoItemProps) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    // En sourdine au départ : une vidéo qui démarre à plein volume dans un
    // lieu public est la première raison de refermer une application.
    // Les contrôles natifs permettent de rétablir le son.
    instance.muted = true;
  });

  useEffect(() => {
    if (autoPlay) player.play();
    return () => player.pause();
  }, [player, autoPlay]);

  return (
    <View style={{ width, height }}>
      <VideoView
        player={player}
        style={{ width, height }}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: false }}
      />
    </View>
  );
}
