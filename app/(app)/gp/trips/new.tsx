import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useGoBack } from '@/hooks/useGoBack';
import { useGpStats } from '@/hooks/useGpSpace';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { parseDecimal } from '@/lib/numbers';
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * Destinations principales de la diaspora sénégalaise.
 *
 * Une liste courte plutôt qu'un champ libre : le code pays est exigé au format
 * ISO 3166-1 alpha-2 par l'API, et personne ne tape « FR » spontanément. Le
 * champ « autre ville » reste libre pour tout ce qui n'est pas là.
 */
const DESTINATIONS: { city: string; country: string; label: string }[] = [
  { city: 'Paris', country: 'FR', label: 'Paris' },
  { city: 'Lyon', country: 'FR', label: 'Lyon' },
  { city: 'Marseille', country: 'FR', label: 'Marseille' },
  { city: 'Bruxelles', country: 'BE', label: 'Bruxelles' },
  { city: 'Milan', country: 'IT', label: 'Milan' },
  { city: 'Madrid', country: 'ES', label: 'Madrid' },
  { city: 'Londres', country: 'GB', label: 'Londres' },
  { city: 'New York', country: 'US', label: 'New York' },
  { city: 'Montréal', country: 'CA', label: 'Montréal' },
];

const ORIGINS = ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Touba'];

/** `YYYY-MM-DD` → ISO 8601, ou null si la saisie n'est pas une date valide. */
function toIsoDate(input: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (!match) return null;

  const date = new Date(`${input.trim()}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'rounded-full border px-3 py-1.5',
        active ? 'border-primary bg-primary' : 'border-gray-200 bg-white',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[12px] font-semibold',
          active ? 'text-white' : 'text-gray-700',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wide text-gray-400">
      {children}
    </Text>
  );
}

export default function NewTripScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/gp');
  const queryClient = useQueryClient();
  const { isReady } = useRequireAuth('/(app)/gp/trips/new');
  const { data: stats } = useGpStats();

  const [originCity, setOriginCity] = useState('Dakar');
  const [destIndex, setDestIndex] = useState<number | null>(0);
  const [customCity, setCustomCity] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post('/api/trips', payload);
      return data as { id: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['gp'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      router.replace('/(app)/(tabs)/gp');
    },
    onError: (caught: unknown) => {
      // Les refus du serveur — capacité au-dessus du palier, date passée —
      // sont déjà rédigés pour le GP. Ils arrivent imbriqués (notre filtre
      // d'exceptions emballe la réponse de NestJS) : `apiErrorMessage` les en
      // extrait, et garde le message propre à cet écran quand il n'y en a pas.
      setError(
        apiErrorMessage(caught, t('La publication du trajet a échoué. Réessayez.', 'Trip publication failed. Please try again.')),
      );
    },
  });

  if (!isReady) return <View className="flex-1 bg-white" />;

  const ceiling = stats?.maxWeightPerTrip ?? null;

  const validate = (): string | null => {
    if (!originCity.trim()) return t('Indiquez la ville de départ.', 'Enter the departure city.');

    const city =
      destIndex !== null ? DESTINATIONS[destIndex].city : customCity.trim();
    const country =
      destIndex !== null
        ? DESTINATIONS[destIndex].country
        : customCountry.trim().toUpperCase();

    if (!city) return t("Indiquez la ville d'arrivée.", 'Enter the destination city.');
    if (!/^[A-Z]{2}$/.test(country)) {
      return t('Le code pays doit faire deux lettres (FR, BE, IT…).', 'The country code must be two letters (FR, BE, IT…).');
    }

    const departure = toIsoDate(departureDate);
    if (!departure) return t('La date de départ doit être au format AAAA-MM-JJ.', 'Enter the departure date in YYYY-MM-DD format.');
    if (new Date(departure).getTime() <= Date.now()) {
      return t('La date de départ doit être dans le futur.', 'The departure date must be in the future.');
    }

    if (arrivalDate.trim()) {
      const arrival = toIsoDate(arrivalDate);
      if (!arrival) return t("La date d'arrivée doit être au format AAAA-MM-JJ.", 'Enter the arrival date in YYYY-MM-DD format.');
      if (new Date(arrival) < new Date(departure)) {
        return t("L'arrivée ne peut pas précéder le départ.", 'Arrival cannot be before departure.');
      }
    }

    const price = parseDecimal(pricePerKg);
    if (price === null || price <= 0) {
      return t('Indiquez un prix au kilo supérieur à 0.', 'Enter a price per kilogram greater than 0.');
    }

    const weight = parseDecimal(maxWeight);
    if (weight === null || weight <= 0) {
      return t('Indiquez les kilos que vous acceptez de transporter.', 'Enter how many kilograms you are willing to carry.');
    }
    if (ceiling !== null && weight > ceiling) {
      return t(`Votre palier actuel est de ${ceiling} kg par voyage.`, `Your current limit is ${ceiling} kg per trip.`);
    }

    return null;
  };

  const handleSubmit = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);

    const city =
      destIndex !== null ? DESTINATIONS[destIndex].city : customCity.trim();
    const country =
      destIndex !== null
        ? DESTINATIONS[destIndex].country
        : customCountry.trim().toUpperCase();

    create.mutate({
      originCity: originCity.trim(),
      destCity: city,
      destCountry: country,
      departureDate: toIsoDate(departureDate),
      arrivalDate: arrivalDate.trim() ? toIsoDate(arrivalDate) : undefined,
      pricePerKg: parseDecimal(pricePerKg),
      maxWeight: parseDecimal(maxWeight),
    });
  };

  const weightValue = parseDecimal(maxWeight);
  const priceValue = parseDecimal(pricePerKg);
  const estimate =
    weightValue !== null && priceValue !== null && weightValue > 0 && priceValue > 0
      ? weightValue * priceValue
      : null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Retour', 'Back')}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-gray-900">
          {t('Nouveau trajet', 'New trip')}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="px-3.5 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle>{t('Départ', 'Departure')}</SectionTitle>
          <View className="flex-row flex-wrap gap-2">
            {ORIGINS.map((city) => (
              <Chip
                key={city}
                label={city}
                active={originCity === city}
                onPress={() => setOriginCity(city)}
              />
            ))}
          </View>
          <View className="mt-3">
            <Input
              label={t('Ou une autre ville', 'Or another city')}
              placeholder="Kaolack"
              value={ORIGINS.includes(originCity) ? '' : originCity}
              onChangeText={setOriginCity}
            />
          </View>

          <SectionTitle>{t('Arrivée', 'Arrival')}</SectionTitle>
          <View className="flex-row flex-wrap gap-2">
            {DESTINATIONS.map((destination, index) => (
              <Chip
                key={`${destination.city}-${destination.country}`}
                label={t(destination.label, destination.label === 'Londres' ? 'London' : destination.label === 'Montréal' ? 'Montreal' : destination.label)}
                active={destIndex === index}
                onPress={() => {
                  setDestIndex(index);
                  setCustomCity('');
                  setCustomCountry('');
                }}
              />
            ))}
            <Chip
              label={t('Autre…', 'Other…')}
              active={destIndex === null}
              onPress={() => setDestIndex(null)}
            />
          </View>

          {destIndex === null ? (
            <View className="mt-3 gap-4">
              <Input
                label={t("Ville d'arrivée", 'Arrival city')}
                placeholder="Genève"
                value={customCity}
                onChangeText={setCustomCity}
              />
              <View>
                <Input
                  label={t('Code pays', 'Country code')}
                  placeholder="CH"
                  autoCapitalize="characters"
                  maxLength={2}
                  value={customCountry}
                  onChangeText={setCustomCountry}
                />
                <Text className="mt-1 text-[10.5px] text-gray-400">
                  {t('Deux lettres : FR, BE, IT, ES, GB, US, CA…', 'Two letters: FR, BE, IT, ES, GB, US, CA…')}
                </Text>
              </View>
            </View>
          ) : null}

          <SectionTitle>{t('Dates', 'Dates')}</SectionTitle>
          <View className="gap-4">
            <Input
              label={t('Départ (AAAA-MM-JJ)', 'Departure (YYYY-MM-DD)')}
              placeholder="2026-10-15"
              keyboardType="numbers-and-punctuation"
              value={departureDate}
              onChangeText={setDepartureDate}
            />
            <Input
              label={t('Arrivée (facultatif)', 'Arrival (optional)')}
              placeholder="2026-10-16"
              keyboardType="numbers-and-punctuation"
              value={arrivalDate}
              onChangeText={setArrivalDate}
            />
          </View>

          <SectionTitle>{t('Capacité et tarif', 'Capacity and rate')}</SectionTitle>
          <View className="gap-4">
            <View>
              <Input
                label={t('Kilos disponibles', 'Available kilograms')}
                placeholder="5"
                keyboardType="decimal-pad"
                value={maxWeight}
                onChangeText={setMaxWeight}
              />
              {ceiling !== null ? (
                <Text className="mt-1 text-[10.5px] text-gray-400">
                  {t(
                    `Votre palier actuel : ${ceiling} kg par voyage. Il augmente après 5 voyages validés.`,
                    `Your current limit: ${ceiling} kg per trip. It increases after 5 completed trips.`,
                  )}
                </Text>
              ) : null}
            </View>
            <View>
              <Input
                label={t('Prix au kilo (€)', 'Price per kilogram (€)')}
                placeholder="8"
                keyboardType="decimal-pad"
                value={pricePerKg}
                onChangeText={setPricePerKg}
              />
              <Text className="mt-1 text-[10.5px] text-gray-400">
                {t("C'est ce que paiera l'acheteur, en plus du prix du produit.", 'This is what the buyer pays in addition to the product price.')}
              </Text>
            </View>
          </View>

          {/* Le GP raisonne en gains, pas en tarif unitaire : lui montrer le
              total possible l'aide à fixer un prix qu'il tiendra. */}
          {estimate !== null ? (
            <View className="mt-4 rounded-xl bg-emerald-50 p-3">
              <Text className="text-[12.5px] text-primary">
                {t('Valise pleine, ce trajet vous rapporterait environ', 'With a full suitcase, this trip would earn you about')}{' '}
                <Text className="font-bold">{estimate.toFixed(2)} €</Text>.
              </Text>
            </View>
          ) : null}

          {error ? (
            <Text className="mt-5 text-center text-[12.5px] text-red-500">
              {error}
            </Text>
          ) : null}

          <View className="mt-6">
            <Button onPress={handleSubmit} loading={create.isPending} fullWidth>
              {t('Publier le trajet', 'Publish trip')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
