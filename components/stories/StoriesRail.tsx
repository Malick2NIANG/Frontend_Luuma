import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { RoleMark } from '@/components/ui/RoleMark';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useStoryFeed } from '@/hooks/useStories';
import type { StoryGroup } from '@/types/story.types';

const RING_SIZE = 58;
const AVATAR_SIZE = 48;

/**
 * Le bandeau de stories en tête du fil.
 *
 * Absent pour un visiteur : les stories ne sont visibles que des abonnés et
 * des partenaires d'une commande en cours, donc un compte non connecté n'a
 * personne à voir. Afficher un bandeau vide donnerait l'impression d'un écran
 * cassé plutôt que d'une fonctionnalité qui demande un compte.
 */
export function StoriesRail() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { data: groups } = useStoryFeed();

  if (!isAuthenticated) return null;

  // On garde « Votre story » même sans aucun groupe à afficher : c'est
  // l'unique point d'entrée pour publier, et le supprimer rendrait la
  // fonctionnalité introuvable tant que personne n'a rien posté.
  const hasGroups = (groups?.length ?? 0) > 0;

  return (
    <View className="border-b border-gray-100 bg-white">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 11, gap: 12 }}
      >
        <MyStoryBubble
          name={user?.name}
          avatar={user?.avatar ?? null}
          onPress={() => router.push('/(app)/stories/create')}
        />

        {hasGroups
          ? groups?.map((group) => (
              <StoryBubble
                key={group.author.id}
                group={group}
                onPress={() =>
                  router.push(`/(app)/stories/${group.author.id}`)
                }
              />
            ))
          : null}
      </ScrollView>
    </View>
  );
}

function MyStoryBubble({
  name,
  avatar,
  onPress,
}: {
  name?: string;
  avatar: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: 62 }} className="items-center">
      <View
        style={{ width: RING_SIZE, height: RING_SIZE }}
        className="items-center justify-center"
      >
        <Avatar uri={avatar} name={name} size={AVATAR_SIZE} />
        <View
          className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-full border-2 border-white"
          style={{ backgroundColor: colors.primary }}
        >
          <Ionicons name="add" size={12} color={colors.white} />
        </View>
      </View>
      <Text numberOfLines={1} className="mt-1 text-[9.5px] text-gray-700">
        Votre story
      </Text>
    </Pressable>
  );
}

function StoryBubble({
  group,
  onPress,
}: {
  group: StoryGroup;
  onPress: () => void;
}) {
  // Anneau plein plutôt que dégradé : le dégradé demanderait une dépendance
  // supplémentaire pour un gain purement décoratif. Vu / non vu reste lisible.
  const ringColor = group.hasUnseen ? colors.accent : '#DDDDDD';

  return (
    <Pressable onPress={onPress} style={{ width: 62 }} className="items-center">
      <View
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          borderWidth: 2.5,
          borderColor: ringColor,
        }}
        className="items-center justify-center"
      >
        <Avatar
          uri={group.author.avatar}
          name={group.author.name}
          size={AVATAR_SIZE}
        />

        {/* Un GP et un commerçant ne se lisent pas de la même façon : l'avion
            dit qu'on peut lui confier un colis, la boutique qu'on peut lui
            acheter quelque chose. Le rôle est celui choisi à la publication,
            pas celui du compte — un même compte peut porter les deux. */}
        <View className="absolute -left-0.5 -top-0.5 h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-white">
          <RoleMark
            type={group.authorRole === 'GP' ? 'gp' : 'merchant'}
            size={10}
          />
        </View>
      </View>

      <Text numberOfLines={1} className="mt-1 text-[9.5px] text-gray-700">
        {group.author.name}
      </Text>
    </Pressable>
  );
}
