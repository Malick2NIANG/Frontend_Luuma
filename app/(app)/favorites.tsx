import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthPrompt } from '@/components/AuthPrompt';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites, useToggleFavorite, type FavoriteEntry } from '@/hooks/useFavorites';
import { formatEur, formatWeight, formatXof } from '@/lib/format';
import { useAppLanguage } from '@/lib/appLanguage';

export default function FavoritesScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/profile');
  const { isAuthenticated, isHydrated } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useFavorites();

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
        <Header onBack={goBack} />
        <AuthPrompt
          icon="heart-outline"
          title={t('Gardez vos coups de cœur', 'Save your favorites')}
          description={t(
            'Créez un compte pour retrouver les produits qui vous plaisent, sur tous vos appareils.',
            'Create an account to find the products you love on all your devices.',
          )}
          returnTo="/(app)/favorites"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Header onBack={goBack} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('Connexion impossible', 'Connection failed')}
          actionLabel={t('Réessayer', 'Try again')}
          onAction={() => void refetch()}
        />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="heart-outline"
          title={t('Aucun favori', 'No favorites yet')}
          description={t(
            "Touchez le cœur d'une publication pour la retrouver ici.",
            'Tap the heart on a post to find it here.',
          )}
          actionLabel={t('Parcourir le fil', 'Browse the feed')}
          onAction={() => router.push('/(app)/(tabs)')}
        />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: FavoriteEntry) => item.product.id}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => <FavoriteRow entry={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const { t } = useAppLanguage();
  return (
    <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
      <Pressable onPress={onBack} hitSlop={10}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text className="text-lg font-bold text-gray-900">{t('Mes favoris', 'My favorites')}</Text>
    </View>
  );
}

function FavoriteRow({ entry }: { entry: FavoriteEntry }) {
  const { t } = useAppLanguage();
  const router = useRouter();
  const { toggle } = useToggleFavorite();
  const { product, merchant } = entry;

  const cover = product.images[0];

  return (
    <Pressable
      onPress={() => router.push(`/(app)/products/${product.id}`)}
      className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 py-3"
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          contentFit="cover"
          style={{ width: 62, height: 62, borderRadius: 10 }}
        />
      ) : (
        <View className="h-[62px] w-[62px] items-center justify-center rounded-[10px] bg-gray-100">
          <Ionicons name="image-outline" size={20} color="#9CA3AF" />
        </View>
      )}

      <View className="flex-1">
        <Text numberOfLines={2} className="text-[13px] text-gray-800">
          {product.name}
        </Text>

        <View className="mt-1 flex-row items-baseline gap-1.5">
          <Text className="text-sm font-extrabold text-primary">
            {formatXof(product.price)}
          </Text>
          {product.priceEur != null && (
            <Text className="text-[10px] text-gray-400">
              ≈ {formatEur(product.priceEur)}
            </Text>
          )}
        </View>

        <View className="mt-1 flex-row items-center gap-1.5">
          <Avatar uri={merchant.avatar} name={merchant.name} size={15} />
          <Text numberOfLines={1} className="flex-1 text-[10px] text-gray-500">
            {merchant.name} · {formatWeight(product.weight)}
          </Text>
        </View>

        {/* Un produit retiré de la vente reste listé, mais signalé : le faire
            disparaître sans un mot donnerait l'impression d'une perte. */}
        {!product.isAvailable && (
          <Text className="mt-1 text-[10px] font-semibold text-amber-700">
            {t("Ce produit n'est plus disponible", 'This product is no longer available')}
          </Text>
        )}
      </View>

      <Pressable
        hitSlop={10}
        onPress={() => toggle({ productId: product.id, isFavorited: true })}
      >
        <Ionicons name="heart" size={21} color="#DC2626" />
      </Pressable>
    </Pressable>
  );
}
