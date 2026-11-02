import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useTrip } from '@/hooks/useCatalog';
import { daysUntil, formatDate, formatEur, formatWeight } from '@/lib/format';
import { cartTotalWeight, useCartStore } from '@/store/cart.store';

/** Au-delà, le GP a fait ses preuves ; en deçà, il est encore en rodage. */
const EXPERIENCED_TRIP_COUNT = 5;

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/trips');

  const { data: trip, isLoading, isError, refetch } = useTrip(id);
  const items = useCartStore((s) => s.items);
  const requiredWeight = cartTotalWeight(items);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !trip) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon="airplane-outline"
          title="Trajet introuvable"
          description="Ce trajet n'est plus disponible."
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const remaining = Math.round((trip.maxWeight - trip.usedWeight) * 1000) / 1000;
  const fits = remaining >= requiredWeight;
  const shippingCost = requiredWeight * trip.pricePerKg;
  const isExperienced = trip.gp.totalTrips >= EXPERIENCED_TRIP_COUNT;

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
        <Text className="text-xl font-bold text-gray-900">Ce GP</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-6">
        {/* Le profil du porteur passe avant les détails du trajet : c'est à
            lui que le client confie ses achats. */}
        <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-gray-100 p-4">
          {trip.gp.user.avatar ? (
            <Image
              source={{ uri: trip.gp.user.avatar }}
              contentFit="cover"
              style={{ width: 56, height: 56, borderRadius: 28 }}
            />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Text className="text-xl font-bold text-primary">
                {trip.gp.user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {trip.gp.user.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text className="text-sm text-gray-700">
                {trip.gp.rating > 0
                  ? trip.gp.rating.toFixed(1)
                  : 'Pas encore noté'}
              </Text>
              <Text className="text-sm text-gray-400">·</Text>
              <Text className="text-sm text-gray-600">
                {trip.gp.totalTrips} voyage{trip.gp.totalTrips > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {!isExperienced && (
          <View className="mb-4 flex-row items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
            <Ionicons name="information-circle-outline" size={17} color="#B45309" />
            <Text className="flex-1 text-xs text-amber-800">
              GP en début d'activité. Sa capacité est volontairement limitée
              tant qu'il n'a pas mené plusieurs voyages à terme. Votre paiement
              reste sous séquestre jusqu'à la livraison.
            </Text>
          </View>
        )}

        <View className="mb-4 rounded-2xl border border-gray-100 p-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-semibold text-gray-900">
              {trip.originCity}
            </Text>
            <Ionicons name="airplane" size={17} color={colors.accent} />
            <Text className="text-lg font-semibold text-gray-900">
              {trip.destCity}
            </Text>
          </View>

          <View className="mt-3 gap-2">
            <DetailRow
              icon="calendar-outline"
              label="Départ"
              value={`${formatDate(trip.departureDate)} · dans ${daysUntil(trip.departureDate)} j`}
            />
            {trip.arrivalDate ? (
              <DetailRow
                icon="flag-outline"
                label="Arrivée"
                value={formatDate(trip.arrivalDate)}
              />
            ) : null}
            <DetailRow
              icon="cube-outline"
              label="Place restante"
              value={formatWeight(remaining)}
            />
            <DetailRow
              icon="pricetag-outline"
              label="Tarif"
              value={`${formatEur(trip.pricePerKg)} / kg`}
            />
          </View>
        </View>

        {items.length > 0 && (
          <View className="rounded-2xl bg-gray-50 p-4">
            <Text className="mb-2 text-sm font-semibold text-gray-900">
              Votre panier
            </Text>
            <View className="flex-row justify-between py-0.5">
              <Text className="text-sm text-gray-700">Poids</Text>
              <Text className="text-sm font-medium text-gray-900">
                {formatWeight(requiredWeight)}
              </Text>
            </View>
            <View className="flex-row justify-between py-0.5">
              <Text className="text-sm text-gray-700">Transport</Text>
              <Text className="text-sm font-medium text-gray-900">
                {formatEur(shippingCost)}
              </Text>
            </View>

            {!fits && (
              <View className="mt-2 flex-row items-start gap-1.5 border-t border-gray-200 pt-2">
                <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                <Text className="flex-1 text-xs text-red-600">
                  Ce GP ne peut pas transporter tout votre panier. Retirez des
                  articles ou choisissez un autre GP.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View className="border-t border-gray-100 px-4 pt-3">
        <Button
          fullWidth
          disabled={!fits || items.length === 0}
          onPress={() => router.push(`/(app)/checkout?tripId=${trip.id}`)}
        >
          {items.length === 0 ? 'Votre panier est vide' : 'Choisir ce GP'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={15} color="#6B7280" />
      <Text className="text-sm text-gray-600">{label}</Text>
      <Text className="ml-auto text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}
