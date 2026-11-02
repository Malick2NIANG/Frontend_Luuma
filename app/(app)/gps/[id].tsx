import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useGp } from '@/hooks/useCatalog';
import { useToggleFollow } from '@/hooks/useFollow';
import { daysUntil, formatDate, formatEur, formatWeight } from '@/lib/format';

export default function GpProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/search');
  const { data: gp, isLoading, isError, refetch } = useGp(id);
  const { toggle, isPending } = useToggleFollow();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !gp) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon="person-outline"
          title="GP introuvable"
          description="Ce profil n'est plus disponible."
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

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
        <Text numberOfLines={1} className="flex-1 text-xl font-bold text-gray-900">
          {gp.user.name}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-6">
        <View className="items-center py-4">
          <Avatar uri={gp.user.avatar} name={gp.user.name} size={80} />
          <Text className="mt-3 text-lg font-bold text-gray-900">
            {gp.user.name}
          </Text>

          <View className="mt-1 flex-row items-center gap-2">
            {gp.totalReviews > 0 ? (
              <>
                <Ionicons name="star" size={14} color={colors.gold} />
                <Text className="text-sm text-gray-700">
                  {gp.rating.toFixed(1)} · {gp.totalReviews} avis
                </Text>
              </>
            ) : (
              <Text className="text-sm text-gray-500">Pas encore noté</Text>
            )}
          </View>

          <View className="mt-4 flex-row gap-6">
            <Stat value={gp.totalTrips} label="voyages" />
            <Stat value={gp.followersCount} label="abonnés" />
            <Stat value={gp.trips.length} label="à venir" />
          </View>

          <Pressable
            disabled={isPending}
            onPress={() =>
              toggle({
                target: 'gp',
                targetId: gp.id,
                isFollowing: gp.isFollowedByMe,
              })
            }
            className={[
              'mt-5 rounded-full px-8 py-2.5',
              gp.isFollowedByMe
                ? 'border border-gray-200 bg-white'
                : 'bg-primary',
              isPending ? 'opacity-50' : '',
            ].join(' ')}
          >
            <Text
              className={[
                'text-sm font-semibold',
                gp.isFollowedByMe ? 'text-gray-700' : 'text-white',
              ].join(' ')}
            >
              {gp.isFollowedByMe ? 'Abonné' : "S'abonner"}
            </Text>
          </Pressable>
        </View>

        <Text className="mb-3 mt-2 text-sm font-semibold text-gray-900">
          Prochains voyages
        </Text>

        {gp.trips.length === 0 ? (
          <EmptyState
            icon="airplane-outline"
            title="Aucun voyage prévu"
            description="Abonnez-vous pour être averti de son prochain départ."
          />
        ) : (
          gp.trips.map((trip) => {
            const remaining =
              Math.round((trip.maxWeight - trip.usedWeight) * 1000) / 1000;
            const days = daysUntil(trip.departureDate);

            return (
              <Pressable
                key={trip.id}
                onPress={() => router.push(`/(app)/trips/${trip.id}`)}
                className="mb-3 rounded-2xl border border-gray-100 p-4"
              >
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-gray-900">
                    {trip.originCity}
                  </Text>
                  <Ionicons name="airplane" size={15} color={colors.accent} />
                  <Text className="text-base font-semibold text-gray-900">
                    {trip.destCity}
                  </Text>
                </View>
                <Text className="mt-1 text-sm text-gray-500">
                  {formatDate(trip.departureDate)}
                  {days > 0 ? ` · dans ${days} j` : ''}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-700">
                    {formatWeight(remaining)} disponibles
                  </Text>
                  <Text className="text-sm font-semibold text-primary">
                    {formatEur(trip.pricePerKg)}/kg
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="items-center">
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}
