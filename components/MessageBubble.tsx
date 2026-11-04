import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { VoiceMessagePlayer } from '@/components/ui/VoiceMessagePlayer';
import type { ChatMessage } from '@/hooks/useChat';
import { useAppLanguage } from '@/lib/appLanguage';
import { formatTime } from '@/lib/format';

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  /** Masque le nom quand l'expéditeur est le même que le message précédent. */
  showSender: boolean;
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  const { t } = useAppLanguage();

  return (
    <View className={['mb-2 max-w-[82%]', isOwn ? 'self-end' : 'self-start'].join(' ')}>
      {showSender && !isOwn ? (
        <Text className="mb-0.5 ml-1 text-xs font-medium text-gray-500">
          {message.sender.name}
        </Text>
      ) : null}

      <View
        className={[
          'rounded-2xl px-3 py-2',
          isOwn ? 'bg-primary' : 'bg-gray-100',
          // Coin rabattu du côté de l'expéditeur : repère visuel classique
          // qui évite d'avoir à lire le nom pour savoir qui parle.
          isOwn ? 'rounded-br-md' : 'rounded-bl-md',
        ].join(' ')}
      >
        {message.type === 'TEXT' ? (
          <Text className={isOwn ? 'text-base text-white' : 'text-base text-gray-900'}>
            {message.content}
          </Text>
        ) : message.type === 'VOICE' ? (
          <VoiceMessagePlayer uri={message.playbackUrl ?? null} />
        ) : message.type === 'IMAGE' && message.playbackUrl ? (
          <Image
            source={{ uri: message.playbackUrl }}
            contentFit="cover"
            transition={150}
            style={{ width: 200, height: 200, borderRadius: 12 }}
          />
        ) : (
          <Text className={isOwn ? 'text-sm text-white' : 'text-sm text-gray-900'}>
            {t('Pièce jointe', 'Attachment')}
          </Text>
        )}

        <Text
          className={[
            'mt-1 text-[10px]',
            isOwn ? 'text-white/70' : 'text-gray-500',
          ].join(' ')}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}
