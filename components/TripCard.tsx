import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { daysUntil, formatDate, formatEur, formatWeight } from '@/lib/format';
import type { Trip } from '@/types/api.types';

export interface TripCardProps {
  trip: Trip;
  /** Poids du panier — sert à signaler si le GP ne peut pas tout prendre. */
  requiredWeight?: number;
  selected?: boolean;
  onPress?: () => void;
}

export function TripCard({
  trip,
  requiredWeight,
  selected = false,
  onPress,
}: TripCardProps) {
  const remaining =
    Math.round((trip.maxWeight - trip.usedWeight) * 1000) / 1000;
  const fitsCart = requiredWeight == null || remaining >= requiredWeight;
  const days = daysUntil(trip.departureDate);
  const shippingCost =
    requiredWeight != null ? requiredWeight * trip.pricePerKg : null;

  return (
    <Pressable
      onPress={fitsCart ? onPress : undefined}
      className={[
        'mb-3 rounded-2xl border bg-white p-4',
        selected ? 'border-primary bg-primary/5' : 'border-gray-100',
        // Un GP qui ne peut pas tout prendre reste visible mais grisé :
        // le masquer laisserait croire qu'aucun GP ne dessert la ville.
        fitsCart ? '' : 'opacity-50',
      ].join(' ')}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-base font-semibold text-gray-900">
            {trip.originCity}
          </Text>
          <Ionicons name="airplane" size={16} color={colors.accent} />
          <Text className="text-base font-semibold text-gray-900">
            {trip.destCity}
          </Text>
        </View>

        {selected && (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        )}
      </View>

      <Text className="mt-1 text-sm text-gray-500">
        Départ le {formatDate(trip.departureDate)}
        {days > 0 ? ` · dans ${days} j` : ''}
      </Text>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          <Ionicons name="cube-outline" size={15} color="#6B7280" />
          <Text className="text-sm text-gray-700">
            {formatWeight(remaining)} disponibles
          </Text>
        </View>

        <Text className="text-sm font-semibold text-primary">
          {formatEur(trip.pricePerKg)}/kg
        </Text>
      </View>

      {shippingCost != null && fitsCart && (
        <View className="mt-3 border-t border-gray-100 pt-3">
          <Text className="text-sm text-gray-600">
            Transport de votre panier :{' '}
            <Text className="font-semibold text-gray-900">
              {formatEur(shippingCost)}
            </Text>
          </Text>
        </View>
      )}

      {!fitsCart && (
        <View className="mt-3 flex-row items-center gap-1.5 border-t border-gray-100 pt-3">
          <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
          <Text className="flex-1 text-xs text-red-600">
            Capacité insuffisante pour votre panier ({formatWeight(remaining)}{' '}
            restants).
          </Text>
        </View>
      )}
    </Pressable>
  );
}
