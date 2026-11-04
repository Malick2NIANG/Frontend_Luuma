import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TripCard } from '@/components/TripCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useTripSearch } from '@/hooks/useCatalog';
import { formatWeight } from '@/lib/format';
import { cartTotalWeight, useCartStore } from '@/store/cart.store';
import { useAppLanguage } from '@/lib/appLanguage';

/** Destinations où la diaspora sénégalaise est la plus présente. */
const COMMON_DESTINATIONS: { city: string; country: string; label: string }[] = [
  { city: 'Paris', country: 'FR', label: 'Paris' },
  { city: 'Lyon', country: 'FR', label: 'Lyon' },
  { city: 'Marseille', country: 'FR', label: 'Marseille' },
  { city: 'Bruxelles', country: 'BE', label: 'Bruxelles' },
  { city: 'Madrid', country: 'ES', label: 'Madrid' },
  { city: 'Milan', country: 'IT', label: 'Milan' },
  { city: 'New York', country: 'US', label: 'New York' },
];

export default function TripSelectionScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const goBack = useGoBack('/(app)/cart');
  const items = useCartStore((s) => s.items);
  const requiredWeight = cartTotalWeight(items);

  const [destination, setDestination] = useState<{
    city: string;
    country: string;
  } | null>(null);
  const [customCity, setCustomCity] = useState('');
  const [customCountry, setCustomCountry] = useState('');

  const filters = useMemo(
    () =>
      destination
        ? { destCity: destination.city, destCountry: destination.country }
        : null,
    [destination],
  );

  const { data, isLoading, isError, refetch } = useTripSearch(filters);
  const trips = data?.data ?? [];

  // Les GP capables de tout transporter d'abord : l'utilisateur voit en
  // premier ce qu'il peut réellement choisir.
  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      const aFits = a.maxWeight - a.usedWeight >= requiredWeight;
      const bFits = b.maxWeight - b.usedWeight >= requiredWeight;
      if (aFits !== bFits) return aFits ? -1 : 1;
      return (
        new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
      );
    });
  }, [trips, requiredWeight]);

  const applyCustom = () => {
    if (customCity.trim().length < 2 || customCountry.trim().length !== 2) return;
    setDestination({
      city: customCity.trim(),
      country: customCountry.trim().toUpperCase(),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('Retour', 'Back')}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">{t('Choisir un GP', 'Choose a personal shopper')}</Text>
          <Text className="text-xs text-gray-500">
            {t('Panier', 'Cart')} : {formatWeight(requiredWeight)}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-6">
        <View className="px-4">
          <Text className="mb-2 text-sm font-semibold text-gray-900">
            {t('Où souhaitez-vous être livré ?', 'Where would you like your order delivered?')}
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {COMMON_DESTINATIONS.map((dest) => {
              const active =
                destination?.city === dest.city &&
                destination?.country === dest.country;
              return (
                <Pressable
                  key={`${dest.city}-${dest.country}`}
                  onPress={() =>
                    setDestination(
                      active ? null : { city: dest.city, country: dest.country },
                    )
                  }
                  className={[
                    'rounded-full border px-3.5 py-1.5',
                    active
                      ? 'border-primary bg-primary'
                      : 'border-gray-200 bg-white',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-sm font-medium',
                      active ? 'text-white' : 'text-gray-700',
                    ].join(' ')}
                  >
                    {t(dest.label, dest.label === 'Bruxelles' ? 'Brussels' : dest.label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* La couverture dépend des GP inscrits, pas d'une liste figée :
              une saisie libre reste indispensable. */}
          <Text className="mb-2 mt-4 text-xs text-gray-500">
            {t('Autre destination', 'Other destination')}
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              value={customCity}
              onChangeText={setCustomCity}
              placeholder={t('Ville', 'City')}
              placeholderTextColor="#9CA3AF"
              className="flex-1 rounded-xl bg-gray-100 px-3 py-2.5 text-base text-gray-900"
            />
            <TextInput
              value={customCountry}
              onChangeText={setCustomCountry}
              placeholder="FR"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              maxLength={2}
              className="w-16 rounded-xl bg-gray-100 px-3 py-2.5 text-center text-base text-gray-900"
            />
            <Button variant="secondary" onPress={applyCustom}>
              OK
            </Button>
          </View>
        </View>

        <View className="mt-6 px-4">
          {!destination ? (
            <EmptyState
              icon="location-outline"
              title={t('Choisissez une destination', 'Choose a destination')}
              description={t(
                "Nous afficherons les GP qui s'y rendent prochainement.",
                'We will show personal shoppers travelling there soon.',
              )}
            />
          ) : isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('Connexion impossible', 'Connection failed')}
              actionLabel={t('Réessayer', 'Try again')}
              onAction={() => void refetch()}
            />
          ) : sortedTrips.length === 0 ? (
            <EmptyState
              icon="airplane-outline"
              title={t('Aucun GP vers cette destination', 'No personal shoppers travelling to this destination')}
              description={t(
                `Personne ne voyage vers ${destination.city} pour le moment. Essayez une autre ville ou revenez plus tard.`,
                `No one is travelling to ${destination.city} right now. Try another city or check back later.`,
              )}
            />
          ) : (
            <>
              <Text className="mb-3 text-sm font-semibold text-gray-900">
                {t(
                  `${sortedTrips.length} GP vers ${destination.city}`,
                  `${sortedTrips.length} personal shopper${sortedTrips.length === 1 ? '' : 's'} travelling to ${destination.city}`,
                )}
              </Text>
              {sortedTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  requiredWeight={requiredWeight}
                  // Passe par la fiche du GP : le client voit sa note et son
                  // historique avant de lui confier ses achats.
                  onPress={() => router.push(`/(app)/trips/${trip.id}`)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
