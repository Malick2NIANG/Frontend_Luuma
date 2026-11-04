import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageBubble } from '@/components/MessageBubble';
import { EmptyState } from '@/components/ui/EmptyState';
import { ROLE_LABELS, RoleMark } from '@/components/ui/RoleMark';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useChatMessages, type ChatMessage } from '@/hooks/useChat';
import { useConversations } from '@/hooks/useDirectChat';
import { useUpload } from '@/hooks/useUpload';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useAppLanguage } from '@/lib/appLanguage';

/** En dessous, c'est un appui involontaire sur le bouton micro. */
const MIN_VOICE_DURATION_MS = 1000;

export default function ChatScreen() {
  const { t } = useAppLanguage();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/messages');
  const { user } = useAuth();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const {
    messages,
    isLoading,
    connected,
    someoneTyping,
    send,
    setTyping,
    markAsRead,
  } = useChatMessages(chatId);

  // L'en-tête réutilise la liste des conversations, déjà en cache quand on
  // arrive depuis l'onglet Messages : c'est la seule source qui sache si le
  // fil est une commande ou un tête-à-tête, et avec qui. Un endpoint dédié
  // pour une ligne de titre ne se justifierait pas.
  const { data: conversations } = useConversations();
  const conversation = conversations?.find((c) => c.id === chatId);

  const recorder = useVoiceRecorder();
  const { upload, isUploading } = useUpload();

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    markAsRead();
  }, [markAsRead, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleSendText = async () => {
    const content = draft.trim();
    if (!content) return;

    setDraft('');
    setTyping(false);
    try {
      await send({ type: 'TEXT', content });
    } catch {
      setSendError(t("Le message n'a pas pu être envoyé.", 'The message could not be sent.'));
      setDraft(content); // Ne pas perdre ce que l'utilisateur a écrit.
    }
  };

  const handleStartRecording = async () => {
    setSendError(null);
    const granted = await recorder.start();
    if (!granted) {
      setSendError(
        t("Autorisez l'accès au micro dans les réglages pour envoyer un vocal.", 'Allow microphone access in Settings to send a voice message.'),
      );
      return;
    }
    setTyping(false, true);
  };

  const handleStopRecording = async () => {
    setTyping(false, false);
    const recording = await recorder.stop();
    if (!recording) return;

    if (recording.durationMs < MIN_VOICE_DURATION_MS) {
      setSendError(t('Message trop court.', 'Message is too short.'));
      return;
    }

    const uploaded = await upload({
      uri: recording.uri,
      category: 'voice',
      // Expo enregistre en m4a sur iOS comme sur Android avec le préréglage
      // haute qualité.
      contentType: 'audio/m4a',
    });

    if (!uploaded) {
      setSendError(t("Le vocal n'a pas pu être envoyé.", 'Voice message could not be sent.'));
      return;
    }

    try {
      await send({
        type: 'VOICE',
        fileKey: uploaded.key,
        duration: Math.round(recording.durationMs / 1000),
      });
    } catch {
      setSendError(t("Le vocal n'a pas pu être envoyé.", 'Voice message could not be sent.'));
    }
  };

  const handleCancelRecording = async () => {
    await recorder.cancel();
    setTyping(false, false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-4 py-2">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('Retour', 'Back')}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              numberOfLines={1}
              className="shrink text-lg font-bold text-gray-900"
            >
              {conversation?.title ?? t('Conversation', 'Conversation')}
            </Text>
            {conversation?.counterpartRole && (
              <RoleMark type={conversation.counterpartRole} size={13} />
            )}
          </View>
          <Text className="text-xs text-gray-500">
            {someoneTyping
              ? t("En train d'écrire…", 'Typing…')
              : !connected
                ? t('Reconnexion…', 'Reconnecting…')
                : // « Client, commerçants et GP » ne vaut que pour un fil de
                  // commande. Sur une conversation directe, c'est faux : on est
                  // deux, et l'affirmer brouillait justement ce qu'on cherche
                  // à savoir — à qui on parle.
                  conversation?.kind === 'ORDER'
                  ? t('Client, commerçants et GP', 'Customer, shops, and personal shopper')
                  : (conversation?.counterpartRole
                      ? t(
                          ROLE_LABELS[conversation.counterpartRole],
                          conversation.counterpartRole === 'MERCHANT'
                            ? 'Shop'
                            : conversation.counterpartRole === 'GP'
                              ? 'Personal shopper'
                              : 'Customer',
                        )
                      : '')}
          </Text>
        </View>
        <View
          className={[
            'h-2 w-2 rounded-full',
            connected ? 'bg-accent' : 'bg-gray-300',
          ].join(' ')}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        className="flex-1"
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title={t('Aucun message', 'No messages yet')}
            description={t(
              'Posez vos questions au commerçant ou au GP — par écrit ou en vocal.',
              'Ask the shop or personal shopper questions by text or voice message.',
            )}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerClassName="px-4 py-3"
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                isOwn={item.senderId === user?.id}
                showSender={
                  index === 0 || messages[index - 1].senderId !== item.senderId
                }
              />
            )}
          />
        )}

        {sendError ? (
          <View className="mx-4 mb-2 flex-row items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
            <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
            <Text className="flex-1 text-xs text-red-700">{sendError}</Text>
            <Pressable onPress={() => setSendError(null)}>
              <Ionicons name="close" size={15} color="#DC2626" />
            </Pressable>
          </View>
        ) : null}

        {recorder.isRecording ? (
          <View className="flex-row items-center gap-3 border-t border-gray-100 px-4 py-3">
            <Pressable
              onPress={() => void handleCancelRecording()}
              className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
            >
              <Ionicons name="trash-outline" size={19} color="#DC2626" />
            </Pressable>

            <View className="flex-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <Text className="text-sm font-medium text-gray-900">
                {formatRecordingTime(recorder.durationMs)}
              </Text>
              <Text className="text-xs text-gray-500">{t('Enregistrement…', 'Recording…')}</Text>
            </View>

            <Pressable
              onPress={() => void handleStopRecording()}
              className="h-11 w-11 items-center justify-center rounded-full bg-primary"
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-end gap-2 border-t border-gray-100 px-4 py-2.5">
            <TextInput
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                setTyping(text.length > 0);
              }}
              onBlur={() => setTyping(false)}
              placeholder={t('Votre message…', 'Your message…')}
              placeholderTextColor="#9CA3AF"
              multiline
              className="max-h-28 flex-1 rounded-2xl bg-gray-100 px-4 py-2.5 text-base text-gray-900"
            />

            {draft.trim().length > 0 ? (
              <Pressable
                onPress={() => void handleSendText()}
                className="h-11 w-11 items-center justify-center rounded-full bg-primary"
              >
                <Ionicons name="send" size={18} color={colors.white} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void handleStartRecording()}
                disabled={isUploading}
                className={[
                  'h-11 w-11 items-center justify-center rounded-full',
                  isUploading ? 'bg-gray-200' : 'bg-primary',
                ].join(' ')}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="mic" size={20} color={colors.white} />
                )}
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatRecordingTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
