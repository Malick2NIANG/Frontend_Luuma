import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthPrompt } from '@/components/AuthPrompt';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { RoleMark } from '@/components/ui/RoleMark';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useDirectChat';
import { useAppLanguage } from '@/lib/appLanguage';
import type { Conversation } from '@/types/chat.types';

export default function MessagesScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useConversations();

  if (!isHydrated) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <AuthPrompt
          icon="chatbubbles-outline"
          title={t('Parlez à vos vendeurs et à vos GP', 'Talk to your sellers and travelers')}
          description={t(
            'Créez un compte pour poser vos questions avant de commander et suivre vos colis.',
            'Create an account to ask questions before ordering and track your packages.',
          )}
          returnTo="/(app)/(tabs)/messages"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center border-b border-gray-100 px-4 pb-2.5 pt-1">
        <Text className="text-lg font-bold text-gray-900">{t('Messages', 'Messages')}</Text>
      </View>

      {isLoading ? (
        <View>
          {[0, 1, 2, 3].map((i) => (
            <ConversationSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('Connexion impossible', 'Unable to connect')}
          actionLabel={t('Réessayer', 'Try again')}
          onAction={() => void refetch()}
        />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={t('Aucune conversation', 'No conversations')}
          description={t(
            'Écrivez à un GP depuis son profil, ou à une boutique depuis une publication.',
            'Message a traveler from their profile, or a shop from one of its posts.',
          )}
          actionLabel={t('Trouver un GP', 'Find a traveler')}
          onAction={() => router.push('/(app)/(tabs)/search')}
        />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: Conversation) => item.id}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          ListFooterComponent={
            <View className="mx-3 my-3 rounded-md border-l-[3px] border-amber-400 bg-amber-50 px-3 py-2.5">
              <Text className="text-[11px] leading-4 text-amber-900">
                {t(
                  'Les conversations liées à une commande réunissent client, commerçants et GP au même endroit.',
                  'Order conversations bring customers, sellers, and travelers together in one place.',
                )}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              onPress={() => router.push(`/(app)/chat/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: Conversation;
  onPress: () => void;
}) {
  const { language, t } = useAppLanguage();
  const isOrder = conversation.kind === 'ORDER';
  const preview = conversation.lastMessage;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 py-3"
    >
      {isOrder ? (
        // Un fil de commande n'a pas d'interlocuteur unique à représenter :
        // une icône de colis est plus juste que l'avatar de l'un des trois.
        <View className="h-11 w-11 items-center justify-center rounded-full bg-gray-100">
          <Ionicons name="cube-outline" size={20} color="#6B7280" />
        </View>
      ) : (
        <Avatar
          uri={conversation.avatar}
          name={conversation.title}
          size={44}
        />
      )}

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            className="shrink text-[13px] font-bold text-gray-900"
          >
            {conversation.title}
          </Text>
          {/* `shrink` sur le nom et pas sur la pastille : c'est le nom qu'on
              tronque quand la place manque, jamais l'indication de rôle. */}
          {conversation.counterpartRole && (
            <RoleMark type={conversation.counterpartRole} size={10} />
          )}
          <Text className="ml-auto text-[10px] text-gray-400">
            {formatConversationTime(conversation.updatedAt, language, t)}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          className={[
            'mt-0.5 text-[11px]',
            conversation.unreadCount > 0
              ? 'font-semibold text-gray-900'
              : 'text-gray-500',
          ].join(' ')}
        >
          {preview
            ? `${preview.isMine ? 'Vous : ' : ''}${preview.preview}`
            : t('Aucun message', 'No messages')}
        </Text>
      </View>

      {conversation.unreadCount > 0 && (
        <View className="h-2 w-2 rounded-full bg-primary" />
      )}
    </Pressable>
  );
}

function formatConversationTime(
  iso: string,
  language: 'fr' | 'en',
  t: (french: string, english: string) => string,
): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return t("À l'instant", 'Just now');
  if (diffMin < 60) return t(`Il y a ${diffMin} min`, `${diffMin} min ago`);

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t(`Il y a ${diffH} h`, `${diffH} hr ago`);

  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return t('Hier', 'Yesterday');
  if (diffDays < 7) return t(`Il y a ${diffDays} jours`, `${diffDays} days ago`);

  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}
