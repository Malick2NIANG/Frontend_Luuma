import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { RoleMark } from '@/components/ui/RoleMark';
import { useToggleFollow } from '@/hooks/useFollow';
import { formatRelative } from '@/lib/format';
import type { FeedAuthor } from '@/types/feed.types';

/**
 * En-tête d'une publication : qui publie, d'où, quand.
 *
 * Partagé entre produits et trajets. Sur une place de marché entre inconnus,
 * l'identité du vendeur pèse autant que l'article : elle occupe donc la
 * première ligne, pas une mention en pied de carte.
 */
export function PostHeader({
  author,
  publishedAt,
}: {
  author: FeedAuthor;
  publishedAt: string;
}) {
  const router = useRouter();
  const { toggle } = useToggleFollow();

  const profilePath =
    author.type === 'merchant'
      ? `/(app)/merchants/${author.id}`
      : `/(app)/gps/${author.id}`;

  return (
    <View className="flex-row items-center gap-2.5 px-3 py-2.5">
      <Pressable onPress={() => router.push(profilePath)}>
        <Avatar uri={author.avatar} name={author.name} size={34} />
      </Pressable>

      <Pressable className="flex-1" onPress={() => router.push(profilePath)}>
        <View className="flex-row items-center gap-1">
          <Text numberOfLines={1} className="text-[13px] font-semibold text-gray-900">
            {author.name}
          </Text>
          {/* Affiché pour les DEUX rôles : ne marquer que le GP laissait
              deviner « boutique » par défaut, ce qui n'a rien d'évident quand
              le fil mélange annonces de produits et annonces de trajets. */}
          <RoleMark type={author.type} />
        </View>
        <Text className="text-[11px] text-gray-500">
          {author.city ? `${author.city} · ` : ''}
          {formatRelative(publishedAt)}
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          toggle({
            target: author.type,
            targetId: author.id,
            isFollowing: author.isFollowedByMe,
          })
        }
        className={[
          'flex-row items-center gap-1 rounded-full px-3 py-1.5',
          author.isFollowedByMe ? 'border border-gray-200 bg-white' : 'bg-primary',
        ].join(' ')}
      >
        <Text
          className={[
            'text-[11px] font-bold',
            author.isFollowedByMe ? 'text-gray-500' : 'text-white',
          ].join(' ')}
        >
          {author.isFollowedByMe ? 'Abonné' : "S'abonner"}
        </Text>
        {author.isFollowedByMe && (
          // La cloche rappelle que l'abonnement notifie les nouveautés —
          // c'est ce qu'il apporte de plus qu'un simple favori.
          <Ionicons name="notifications" size={11} color="#6B7280" />
        )}
      </Pressable>
    </View>
  );
}
