import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { formatRelative } from '@/lib/format';
import { useGoBack } from '@/hooks/useGoBack';
import { useMarkStorySeen, useStoryFeed } from '@/hooks/useStories';
import type { Story } from '@/types/story.types';

/** Durée d'affichage d'une story, en millisecondes. */
const STORY_DURATION = 5000;
/** Pas de rafraîchissement de la barre de progression. */
const TICK = 50;

/**
 * Lecteur plein écran, un compte à la fois.
 *
 * Les stories sont lues depuis le cache du bandeau plutôt que rechargées :
 * l'utilisateur vient de le voir à l'écran, une seconde requête ne ferait
 * qu'insérer un temps de chargement entre l'appui et l'image.
 */
export default function StoryViewerScreen() {
  const { authorId } = useLocalSearchParams<{ authorId: string }>();
  const router = useRouter();

  const { data: groups, isLoading } = useStoryFeed();
  const { mutate: markSeen } = useMarkStorySeen();

  const group = groups?.find((g) => g.author.id === authorId);
  const stories = group?.stories ?? [];

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const current: Story | undefined = stories[index];

  // Le lecteur est le SEUL écran qui se ferme tout seul, à la fin de la
  // dernière story, depuis un effet. C'est ce qui rendait son garde-fou
  // critique — et c'est justement celui que j'avais laissé sur l'ancienne
  // version, qui ne consultait que `router.canGoBack()`.
  const close = useGoBack('/(app)/(tabs)');

  // La décision se prend AVANT le setState, jamais dans la fonction de mise à
  // jour : React peut la rejouer (mode strict), et fermer l'écran s'y
  // exécuterait deux fois.
  const goNext = useCallback(() => {
    if (index + 1 >= stories.length) {
      close();
      return;
    }
    setProgress(0);
    setIndex(index + 1);
  }, [index, stories.length, close]);

  const goPrevious = useCallback(() => {
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Marquage à l'affichage, pas à la fermeture : quelqu'un qui quitte en
  // cours de route a bien vu la story, l'anneau doit s'éteindre.
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!current || seenRef.current.has(current.id) || current.seen) return;
    seenRef.current.add(current.id);
    markSeen(current.id);
  }, [current, markSeen]);

  useEffect(() => {
    if (!current || paused) return;

    const timer = setInterval(() => {
      // Plafonné à 1 : le passage à la story suivante est déclenché par
      // l'effet qui observe `progress`, pas d'ici — enchaîner deux mises à
      // jour d'état depuis une fonction de réduction n'est pas permis.
      setProgress((p) => Math.min(1, p + TICK / STORY_DURATION));
    }, TICK);

    return () => clearInterval(timer);
  }, [current, paused, index]);

  useEffect(() => {
    if (progress >= 1) goNext();
  }, [progress, goNext]);

  if (isLoading) {
    return <View className="flex-1 bg-black" />;
  }

  if (!group || !current) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <EmptyState
          icon="time-outline"
          title="Story expirée"
          description="Elle n'est plus disponible : les stories disparaissent au bout de 24 heures."
          actionLabel="Retour"
          onAction={close}
        />
      </SafeAreaView>
    );
  }

  const background = current.background ?? colors.primary;

  return (
    <View className="flex-1 bg-black">
      {current.mediaType === 'TEXT' ? (
        <View
          className="absolute inset-0 items-center justify-center px-8"
          style={{ backgroundColor: background }}
        >
          <Text className="text-center text-2xl font-bold leading-9 text-white">
            {current.text}
          </Text>
        </View>
      ) : current.mediaUrl ? (
        <Image
          source={{ uri: current.mediaUrl }}
          contentFit="cover"
          transition={120}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Une barre par story : c'est ce qui indique combien il en reste,
            information sans laquelle on ne sait jamais quand ça s'arrête. */}
        <View className="flex-row gap-1 px-2.5 pt-2.5">
          {stories.map((story, i) => (
            <View
              key={story.id}
              className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <View
                className="h-full bg-white"
                style={{
                  width: `${
                    i < index ? 100 : i === index ? progress * 100 : 0
                  }%`,
                }}
              />
            </View>
          ))}
        </View>

        <View className="flex-row items-center gap-2 px-3 py-3">
          <Avatar
            uri={group.author.avatar}
            name={group.author.name}
            size={32}
          />
          <View className="flex-1">
            <Text className="text-[13px] font-semibold text-white">
              {group.author.name}
            </Text>
            <Text className="text-[11px] text-white/70">
              {formatRelative(current.createdAt)}
            </Text>
          </View>
          <Pressable onPress={close} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
        </View>

        {/* Zones de navigation invisibles, façon Instagram : un appui à
            gauche revient, à droite avance, un appui long met en pause. */}
        <View className="flex-1 flex-row">
          <Pressable
            className="flex-1"
            onPress={goPrevious}
            onLongPress={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            delayLongPress={200}
          />
          <Pressable
            className="flex-[2]"
            onPress={goNext}
            onLongPress={() => setPaused(true)}
            onPressOut={() => setPaused(false)}
            delayLongPress={200}
          />
        </View>

        {current.text && current.mediaType !== 'TEXT' ? (
          <View className="mx-3.5 rounded-2xl bg-black/55 p-3.5">
            <Text className="text-sm leading-5 text-white">{current.text}</Text>
          </View>
        ) : null}

        {/* Une story qui pointe vers un produit ou un trajet doit y mener :
            sans ce lien, elle ne serait qu'une image de plus. */}
        {current.productId ? (
          <StoryLink
            label="Voir le produit"
            onPress={() => router.push(`/(app)/products/${current.productId}`)}
          />
        ) : current.tripId ? (
          <StoryLink
            label="Voir le trajet"
            onPress={() => router.push(`/(app)/trips/${current.tripId}`)}
          />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function StoryLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-3.5 mb-3 mt-2.5 flex-row items-center justify-center gap-1.5 rounded-full bg-white/90 py-3"
    >
      <Text className="text-[13px] font-bold text-gray-900">{label}</Text>
      <Ionicons name="chevron-up" size={15} color={colors.text} />
    </Pressable>
  );
}
