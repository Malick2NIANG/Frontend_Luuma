import { useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { View } from 'react-native';
import { useVideoSound } from '@/store/videoSound.store';

export interface VideoItemProps {
  uri: string;
  width: number;
  height: number;
  /** Lance la lecture dès l'affichage. Réservé au plein écran. */
  autoPlay?: boolean;
}

/**
 * Lecteur vidéo du plein écran, avec les contrôles natifs (avance, son).
 *
 * Dans le fil et sur la fiche, c'est InlineVideo qui lit les vidéos.
 */
export function VideoItem({
  uri,
  width,
  height,
  autoPlay = true,
}: VideoItemProps) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    // Même réglage du son que dans le fil : si la personne l'a activé sur une
    // vidéo, le plein écran ne la remet pas en sourdine. Les contrôles natifs
    // permettent de le changer ici aussi.
    instance.muted = useVideoSound.getState().muted;
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
