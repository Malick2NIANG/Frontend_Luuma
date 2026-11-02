import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/BrandLogo';
import { ProductPost } from '@/components/feed/ProductPost';
import { TripPost } from '@/components/feed/TripPost';
import { StoriesRail } from '@/components/stories/StoriesRail';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FeedPostSkeleton,
  StoriesRailSkeleton,
} from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { useConversations } from '@/hooks/useDirectChat';
import { useFeed } from '@/hooks/useFeed';
import { cartItemCount, useCartStore } from '@/store/cart.store';
import type { FeedItem } from '@/types/feed.types';

/**
 * L'accueil : un fil vertical d'annonces, une par écran ou presque.
 *
 * Aucune barre de filtres. Elle avait été reprise de la version en grille
 * abandonnée, alors que la maquette validée passe du logo directement aux
 * stories. Filtrer par type (produits, voyages) est le travail de l'onglet
 * Recherche : le faire aussi ici obligerait à se demander, à chaque fois,
 * lequel des deux on est censé utiliser.
 *
 * Pas de champ de recherche non plus, pour la même raison.
 */
export default function FeedScreen() {
  const router = useRouter();

  // Le logo ramène en haut du fil, comme sur Instagram — c'est le geste
  // attendu après avoir descendu trente publications.
  const listRef = useRef<React.ComponentRef<typeof FlashList<FeedItem>>>(null);

  const badgeCount = cartItemCount(useCartStore((s) => s.items));

  const { data: conversations } = useConversations();
  const unreadCount =
    conversations?.reduce((total, c) => total + c.unreadCount, 0) ?? 0;


  const {
    items,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFeed();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="bg-white">
        <View className="flex-row items-center justify-between px-3.5 pb-2 pt-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Revenir en haut du fil"
            onPress={() =>
              listRef.current?.scrollToOffset({ offset: 0, animated: true })
            }
          >
            <BrandLogo width={54} height={38} />
          </Pressable>

          <View className="flex-row items-center gap-2">
            {/* Pas de raccourci pro ici : les espaces commerçant et GP sont
                des onglets de la barre du bas, visibles selon les casquettes
                du compte. */}
            <HeaderButton
              icon="notifications-outline"
              label="Notifications"
              badge={unreadCount}
              onPress={() => router.push('/(app)/(tabs)/messages')}
            />
            <HeaderButton
              icon="heart-outline"
              label="Mes favoris"
              onPress={() => router.push('/(app)/favorites')}
            />
            <HeaderButton
              icon="cart-outline"
              label="Mon panier"
              badge={badgeCount}
              onPress={() => router.push('/(app)/cart')}
            />
          </View>
        </View>
      </View>

      {isLoading ? (
        // Squelette et non tourniquet : l'accueil a une forme connue d'avance,
        // donc l'œil peut se placer où le contenu apparaîtra. Un tourniquet
        // centré, lui, ne dit rien de ce qui arrive et fait sauter la page au
        // moment du remplacement.
        <ScrollView showsVerticalScrollIndicator={false}>
          <StoriesRailSkeleton />
          <FeedPostSkeleton />
          <FeedPostSkeleton />
        </ScrollView>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Connexion impossible"
          description="Impossible de charger le fil. Vérifiez votre connexion."
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      ) : (
        <FlashList
          ref={listRef}
          data={items}
          keyExtractor={(item: FeedItem) => item.id}
          // Le bandeau de stories fait partie du contenu défilant, comme sur
          // Instagram : figé en tête, il volerait une hauteur de vignette à
          // chaque publication lue.
          ListHeaderComponent={<StoriesRail />}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              title="Le fil est encore vide"
              description="Aucun commerçant ni GP n'a encore publié."
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-6">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View className="h-4" />
            )
          }
          renderItem={({ item }) =>
            item.kind === 'product' ? (
              <ProductPost
                product={item.product}
                author={item.author}
                publishedAt={item.publishedAt}
              />
            ) : (
              <TripPost
                trip={item.trip}
                author={item.author}
                publishedAt={item.publishedAt}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function HeaderButton({
  icon,
  label,
  badge = 0,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Obligatoire : le bouton n'a pas de texte, l'icône seule ne se lit pas. */
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        badge > 0 ? `${label} (${badge} en attente)` : label
      }
      className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      {badge > 0 && (
        <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
          <Text className="text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
