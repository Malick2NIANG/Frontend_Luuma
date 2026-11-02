import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useFollowing } from '@/hooks/useFollow';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function FollowingScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/profile');
  const { isReady } = useRequireAuth('/(app)/following');
  const { data, isLoading, isError, refetch } = useFollowing(isReady);

  if (!isReady || isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const merchants = data?.merchants ?? [];
  const gps = data?.gps ?? [];
  const isEmpty = merchants.length === 0 && gps.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">Mes abonnements</Text>
      </View>

      {isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Connexion impossible"
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      ) : isEmpty ? (
        <EmptyState
          icon="heart-outline"
          title="Aucun abonnement"
          description="Suivez des boutiques et des GP pour retrouver leurs publications dans votre fil."
          actionLabel="Découvrir"
          onAction={() => router.replace('/(app)/(tabs)')}
        />
      ) : (
        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-6">
          {merchants.length > 0 && (
            <>
              <Text className="mb-2 mt-2 text-sm font-semibold text-gray-900">
                Boutiques ({merchants.length})
              </Text>
              {merchants.map((m) => (
                <FollowRow
                  key={m.id}
                  name={m.shopName}
                  avatar={m.user.avatar}
                  subtitle={`${m.city} · ${m._count.products} produit${m._count.products > 1 ? 's' : ''}`}
                  rating={m.rating}
                  totalReviews={m.totalReviews}
                  followers={m._count.followers}
                  icon="storefront"
                  onPress={() => router.push(`/(app)/merchants/${m.id}`)}
                />
              ))}
            </>
          )}

          {gps.length > 0 && (
            <>
              <Text className="mb-2 mt-4 text-sm font-semibold text-gray-900">
                GP ({gps.length})
              </Text>
              {gps.map((g) => (
                <FollowRow
                  key={g.id}
                  name={g.user.name}
                  avatar={g.user.avatar}
                  subtitle={`${g.totalTrips} voyage${g.totalTrips > 1 ? 's' : ''} · ${g._count.trips} annonce${g._count.trips > 1 ? 's' : ''}`}
                  rating={g.rating}
                  totalReviews={g.totalReviews}
                  followers={g._count.followers}
                  icon="airplane"
                  onPress={() => router.push(`/(app)/gps/${g.id}`)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FollowRow({
  name,
  avatar,
  subtitle,
  rating,
  totalReviews,
  followers,
  icon,
  onPress,
}: {
  name: string;
  avatar: string | null;
  subtitle: string;
  rating: number;
  totalReviews: number;
  followers: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-100 p-3"
    >
      <Avatar uri={avatar} name={name} size={44} />

      <View className="flex-1">
        <View className="flex-row items-center gap-1">
          <Text numberOfLines={1} className="text-sm font-semibold text-gray-900">
            {name}
          </Text>
          <Ionicons name={icon} size={11} color={colors.accent} />
        </View>
        <Text className="text-xs text-gray-500">{subtitle}</Text>
        <View className="mt-0.5 flex-row items-center gap-1.5">
          {totalReviews > 0 ? (
            <>
              <Ionicons name="star" size={10} color={colors.gold} />
              <Text className="text-xs text-gray-500">{rating.toFixed(1)}</Text>
              <Text className="text-xs text-gray-300">·</Text>
            </>
          ) : null}
          <Text className="text-xs text-gray-500">
            {followers} abonné{followers > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={17} color="#9CA3AF" />
    </Pressable>
  );
}
