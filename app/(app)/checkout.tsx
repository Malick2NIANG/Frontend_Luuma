import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useTrip } from '@/hooks/useCatalog';
import { useConfirmOrder, useCreateOrder } from '@/hooks/useOrders';
import { formatDate, formatEur, formatWeight } from '@/lib/format';
import { useAppLanguage } from '@/lib/appLanguage';
import {
  cartByMerchant,
  cartSubtotalEur,
  cartTotalWeight,
  useCartStore,
} from '@/store/cart.store';

/** Doit rester aligné sur PLATFORM_FEE_PERCENT côté serveur. */
const PLATFORM_FEE_PERCENT = 6;

export default function CheckoutScreen() {
  const { t } = useAppLanguage();
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/cart');

  const items = useCartStore((s) => s.items);
  const { data: trip, isLoading } = useTrip(tripId);

  const createOrder = useCreateOrder();
  const confirmOrder = useConfirmOrder();

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [touched, setTouched] = useState(false);

  const totalWeight = cartTotalWeight(items);
  const subtotalEur = cartSubtotalEur(items);
  const groups = cartByMerchant(items);

  // Estimation locale, à titre indicatif : le serveur recalcule tout à la
  // création de la commande et c'est son montant qui fait foi.
  const estimate = useMemo(() => {
    const shipping = trip ? totalWeight * trip.pricePerKg : 0;
    const fee = subtotalEur * (PLATFORM_FEE_PERCENT / 100);
    return {
      shipping: Math.round(shipping * 100) / 100,
      fee: Math.round(fee * 100) / 100,
      total: Math.round((subtotalEur + shipping + fee) * 100) / 100,
    };
  }, [trip, totalWeight, subtotalEur]);

  const addressValid = address.trim().length >= 5;
  const cityValid = city.trim().length >= 2;
  const countryValid = country.trim().length === 2;
  const formValid = addressValid && cityValid && countryValid;

  const isBusy = createOrder.isPending || confirmOrder.isPending;
  const errorMessage = createOrder.errorMessage ?? confirmOrder.errorMessage;

  const handleSubmit = async () => {
    setTouched(true);
    if (!formValid || !tripId) return;

    // Deux étapes distinctes côté serveur : la commande est d'abord créée en
    // attente, puis le paiement réserve réellement la capacité du GP. Un échec
    // à la seconde étape signifie que la place a été prise entre-temps.
    const order = await createOrder.mutateAsync({
      tripId,
      items,
      deliveryAddress: address.trim(),
      deliveryCity: city.trim(),
      deliveryCountry: country.trim().toUpperCase(),
    });

    const confirmed = await confirmOrder.mutateAsync(order.id);
    router.replace(`/(app)/orders/${confirmed.id}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!trip || items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon="alert-circle-outline"
          title={t('Commande impossible', 'Unable to place order')}
          description={
            items.length === 0
              ? t('Votre panier est vide.', 'Your cart is empty.')
              : t("Ce trajet n'est plus disponible.", 'This trip is no longer available.')
          }
          actionLabel={t('Retour au catalogue', 'Back to catalog')}
          onAction={() => router.replace('/(app)/(tabs)')}
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
          accessibilityLabel={t('Retour', 'Back')}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">{t('Valider la commande', 'Checkout')}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-6">
          <View className="mb-5 rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="airplane" size={16} color={colors.accent} />
              <Text className="text-base font-semibold text-gray-900">
                {trip.originCity} → {trip.destCity}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-gray-500">
              {t('Départ le', 'Departs on')} {formatDate(trip.departureDate)}
            </Text>
            <Text className="mt-1 text-sm text-gray-500">
              {formatWeight(totalWeight)} · {formatEur(trip.pricePerKg)}/kg
            </Text>
          </View>

          <Text className="mb-2 text-sm font-semibold text-gray-900">
            {t('Adresse de livraison', 'Delivery address')}
          </Text>
          <Input
            label={t('Adresse', 'Address')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('12 rue des Lilas, appartement 3B', '12 Lilac Street, apartment 3B')}
            error={touched && !addressValid ? t('Adresse trop courte.', 'Address is too short.') : undefined}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label={t('Ville', 'City')}
                value={city}
                onChangeText={setCity}
                placeholder={trip.destCity}
                error={touched && !cityValid ? t('Ville requise.', 'City is required.') : undefined}
              />
            </View>
            <View className="w-24">
              <Input
                label={t('Pays', 'Country')}
                value={country}
                onChangeText={setCountry}
                placeholder={trip.destCountry}
                autoCapitalize="characters"
                maxLength={2}
                error={touched && !countryValid ? t('Code ISO.', 'ISO code.') : undefined}
              />
            </View>
          </View>

          <View className="mt-4 rounded-2xl bg-gray-50 p-4">
            <Text className="mb-2 text-sm font-semibold text-gray-900">
              {t('Récapitulatif', 'Summary')}
            </Text>
            <SummaryRow label={t('Produits', 'Products')} value={formatEur(subtotalEur)} />
            <SummaryRow
              label={t(`Transport (${formatWeight(totalWeight)})`, `Shipping (${formatWeight(totalWeight)})`)}
              value={formatEur(estimate.shipping)}
            />
            <SummaryRow
              label={t(`Frais de service (${PLATFORM_FEE_PERCENT} %)`, `Service fee (${PLATFORM_FEE_PERCENT}%)`)}
              value={formatEur(estimate.fee)}
            />
            <View className="mt-2 flex-row justify-between border-t border-gray-200 pt-2">
              <Text className="text-base font-semibold text-gray-900">{t('Total', 'Total')}</Text>
              <Text className="text-base font-bold text-primary">
                {formatEur(estimate.total)}
              </Text>
            </View>
            <Text className="mt-2 text-xs text-gray-500">
              {t(
                `${groups.length} colis · Montant définitif calculé par le serveur.`,
                `${groups.length} package(s) · Final amount calculated by the server.`,
              )}
            </Text>
          </View>

          <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
            <Ionicons name="shield-checkmark-outline" size={17} color="#047857" />
            <Text className="flex-1 text-xs text-emerald-800">
              {t(
                "Votre paiement est conservé sous séquestre et n'est versé au commerçant et au GP qu'après confirmation de la livraison.",
                'Your payment is held in escrow and released to the shop and personal shopper only after delivery is confirmed.',
              )}
            </Text>
          </View>

          {errorMessage ? (
            <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5">
              <Ionicons name="alert-circle-outline" size={17} color="#DC2626" />
              <Text className="flex-1 text-xs text-red-700">{errorMessage}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View className="border-t border-gray-100 px-4 pt-3">
          <Button
            fullWidth
            loading={isBusy}
            disabled={!formValid}
            onPress={() => void handleSubmit()}
          >
            {t('Payer', 'Pay')} {formatEur(estimate.total)}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-sm text-gray-700">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}
