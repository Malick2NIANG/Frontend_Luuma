import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Redirect, useIsFocused, useRouter } from 'expo-router';
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
import { FeedAside } from '@/components/feed/FeedAside';
import {
  ECART_COLONNE_DROITE,
  LARGEUR_COLONNE_DROITE,
  useMiseEnPage,
} from '@/hooks/useContentWidth';
import { useFeed } from '@/hooks/useFeed';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { useAuthGate } from '@/hooks/useRequireAuth';
import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';
import { useAppLanguage } from '@/lib/appLanguage';
import { attendreFinDuSplash } from '@/lib/splash';
import { cartItemCount, useCartStore } from '@/store/cart.store';
import {
  useOnboardingHydrated,
  useOnboardingStore,
} from '@/store/onboarding.store';
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
  const hydrated = useOnboardingHydrated();
  const termine = useOnboardingStore((s) => s.termine);

  /**
   * Premier lancement : « Sénégal ou étranger ? » avant le fil.
   *
   * La garde est posée sur l'ACCUEIL seulement. Quelqu'un qui arrive par un
   * lien de produit partagé voit le produit tout de suite ; la question lui
   * sera posée la première fois qu'il passera par le fil.
   */
  if (!hydrated) return <View className="flex-1 bg-white" />;
  if (!termine) return <Redirect href="/onboarding" />;

  return <FeedContent />;
}

function FeedContent() {
  const { t } = useAppLanguage();
  const router = useRouter();

  // Le logo ramène en haut du fil, comme sur Instagram — c'est le geste
  // attendu après avoir descendu trente publications.
  const listRef = useRef<React.ComponentRef<typeof FlashList<FeedItem>>>(null);

  const badgeCount = cartItemCount(useCartStore((s) => s.items));

  /**
   * La cloche ne compte que les notifications. Les messages ont leur onglet
   * et leur propre badge : les compter ici aussi gonflait les deux chiffres.
   */
  const { data: unreadCount = 0 } = useUnreadNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  /**
   * Publications réellement regardées — celles dont les vidéos jouent.
   *
   * Seuil à 60 % : une publication qui dépasse à peine du bas de l'écran ne
   * doit pas se mettre à jouer. Et rien ne joue quand l'onglet n'est plus
   * affiché (fiche produit ouverte, autre onglet) : `useIsFocused`.
   */
  const isFocused = useIsFocused();

  // Le fil est monté derrière l'écran de démarrage : sans cette attente, la
  // première vidéo se chargerait et se décoderait PENDANT l'animation, et la
  // ferait saccader. Elle démarre une fois l'écran parti.
  const [splashFini, setSplashFini] = useState(false);
  useEffect(() => {
    let actif = true;
    void attendreFinDuSplash().then(() => actif && setSplashFini(true));
    return () => {
      actif = false;
    };
  }, []);
  const [visibles, setVisibles] = useState<Set<string>>(() => new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: FeedItem; isViewable: boolean }[] }) => {
      setVisibles(
        new Set(viewableItems.filter((v) => v.isViewable).map((v) => v.item.id)),
      );
    },
    [],
  );
  const { requireAuth } = useAuthGate();
  const mise = useMiseEnPage();
  // Sur tablette et ordinateur, la marque est déjà dans la barre latérale.
  const surOrdinateur = mise.barreLaterale;


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
      {/* Le fil, et sur grand écran sa colonne de droite, centrés ensemble
          dans l'espace laissé par la barre latérale — comme Instagram. */}
      <View className="flex-1 flex-row justify-center">
      <View
        className="flex-1"
        style={surOrdinateur ? { maxWidth: mise.largeurContenu } : undefined}
      >
      <View className="bg-white">
        <View className="flex-row items-center justify-between px-3.5 pb-2 pt-1">
          {surOrdinateur ? (
            <Text className="text-lg font-bold text-gray-900">
              {t('Accueil', 'Home')}
            </Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Revenir en haut du fil', 'Back to top of feed')}
              onPress={() =>
                listRef.current?.scrollToOffset({ offset: 0, animated: true })
              }
            >
              <BrandLogo width={54} height={38} />
            </Pressable>
          )}

          <View className="flex-row items-center gap-2">
            {/* Pas de raccourci pro ici : les espaces commerçant et GP sont
                des onglets de la barre du bas, visibles selon les casquettes
                du compte. */}
            <HeaderButton
              icon="notifications-outline"
              label={t('Notifications', 'Notifications')}
              badge={unreadCount}
              badgeTone="alert"
              onPress={() => {
                if (requireAuth('/(app)/(tabs)')) setNotificationsOpen(true);
              }}
            />
            <HeaderButton
              icon="heart-outline"
              label={t('Mes favoris', 'My favorites')}
              onPress={() => router.push('/(app)/favorites')}
            />
            <HeaderButton
              icon="cart-outline"
              label={t('Mon panier', 'My cart')}
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
          title={t('Connexion impossible', 'Unable to connect')}
          description={t(
            'Impossible de charger le fil. Vérifiez votre connexion.',
            'Unable to load the feed. Check your connection.',
          )}
          actionLabel={t('Réessayer', 'Try again')}
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
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          // Sans cela, FlashList ne redessine pas les cartes quand la
          // visibilité change, et une vidéo sortie de l'écran continuerait.
          extraData={{ visibles, isFocused, notificationsOpen, splashFini }}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              title={t('Le fil est encore vide', 'Your feed is empty')}
              description={t(
                "Aucun commerçant ni GP n'a encore publié.",
                'No sellers or travelers have posted yet.',
              )}
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
                raison={item.raison}
                active={
                  splashFini && isFocused && !notificationsOpen && visibles.has(item.id)
                }
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

      </View>
      {mise.colonneDroite ? (
        <View
          style={{ width: LARGEUR_COLONNE_DROITE, marginLeft: ECART_COLONNE_DROITE }}
        >
          <FeedAside />
        </View>
      ) : null}
      </View>

      <NotificationsSheet
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </SafeAreaView>
  );
}

function HeaderButton({
  icon,
  label,
  badge = 0,
  badgeTone = 'brand',
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Obligatoire : le bouton n'a pas de texte, l'icône seule ne se lit pas. */
  label: string;
  badge?: number;
  /** `alert` : rouge, pour ce qui demande l'attention (notifications). */
  badgeTone?: 'brand' | 'alert';
  onPress: () => void;
}) {
  const { t } = useAppLanguage();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        badge > 0
          ? t(`${label} (${badge} en attente)`, `${label} (${badge} pending)`)
          : label
      }
      className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      {badge > 0 && (
        <View
          className={[
            'absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full px-1',
            badgeTone === 'alert' ? 'bg-red-500' : 'bg-primary',
          ].join(' ')}
        >
          <Text className="text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
