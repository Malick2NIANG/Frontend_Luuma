import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

export interface VoiceMessagePlayerProps {
  uri?: string | null;
  className?: string;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function VoiceMessagePlayer({ uri = null, className }: VoiceMessagePlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const togglePlayback = () => {
    if (!uri) return;

    if (status.playing) {
      player.pause();
      return;
    }

    if (status.duration > 0 && status.currentTime >= status.duration) {
      void player.seekTo(0);
    }
    player.play();
  };

  const remaining = status.duration > 0 ? status.duration - status.currentTime : 0;
  const displaySeconds = status.playing ? remaining : status.duration;

  return (
    <View
      className={[
        'flex-row items-center gap-3 self-start rounded-full bg-gray-100 px-4 py-2',
        className ?? '',
      ].join(' ')}
    >
      <Pressable
        onPress={togglePlayback}
        disabled={!uri}
        className="h-9 w-9 items-center justify-center rounded-full bg-primary"
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={colors.white} />
      </Pressable>
      <Text className="text-sm font-medium text-gray-700">{formatDuration(displaySeconds)}</Text>
    </View>
  );
}
