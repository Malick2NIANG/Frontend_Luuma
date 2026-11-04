import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { formatEur, formatWeight, formatXof } from '@/lib/format';
import { useAppLanguage } from '@/lib/appLanguage';
import {
  cartByMerchant,
  cartSubtotalEur,
  cartTotalWeight,
  useCartStore,
  type CartItem,
} from '@/store/cart.store';

export default function CartScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)');
  // Le panier engage : on demande le compte ici, pas à l'entrée de l'app.
  const { isReady } = useRequireAuth('/(app)/cart');
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const groups = cartByMerchant(items);
  const totalWeight = cartTotalWeight(items);
  const subtotalEur = cartSubtotalEur(items);

  // Écran blanc pendant l'hydratation puis la redirection éventuelle : afficher
  // le panier une fraction de seconde avant d'éjecter serait déroutant.
  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <Header onBack={goBack} />
        <EmptyState
          icon="cart-outline"
          title={t('Votre panier est vide', 'Your cart is empty')}
          description={t(
            'Parcourez le catalogue et ajoutez des produits de plusieurs commerçants.',
            'Browse the catalog and add products from different shops.',
          )}
          actionLabel={t('Voir le catalogue', 'Browse the catalog')}
          onAction={() => router.replace('/(app)/(tabs)')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <Header onBack={goBack} onClear={clear} />

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-6">
        {/* Un colis par commerçant : chacun dépose le sien chez le même GP.
            L'expliciter ici évite la surprise au moment du suivi. */}
        {groups.length > 1 && (
          <View className="mb-4 flex-row items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5">
            <Ionicons name="information-circle-outline" size={17} color="#1D4ED8" />
            <Text className="flex-1 text-xs text-blue-800">
              {t(
                `Votre commande regroupe ${groups.length} commerçants. Chacun remettra son colis au même GP.`,
                `Your order includes ${groups.length} shops. Each one will hand their package to the same personal shopper.`,
              )}
            </Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.merchantId} className="mb-5">
            <View className="mb-2 flex-row items-center gap-1.5">
              <Ionicons name="storefront-outline" size={15} color={colors.accent} />
              <Text className="text-sm font-semibold text-gray-900">
                {group.merchantName}
              </Text>
            </View>

            {group.items.map((item) => (
              // `lineId` et non `productId` : le même boubou en M et en L sont
              // deux lignes, et les indexer par produit ferait agir les
              // boutons de l'une sur l'autre.
              <CartRow
                key={item.lineId}
                item={item}
                onDecrement={() => setQuantity(item.lineId, item.quantity - step(item))}
                onIncrement={() => setQuantity(item.lineId, item.quantity + step(item))}
                onRemove={() => remove(item.lineId)}
              />
            ))}
          </View>
        ))}

        <View className="rounded-2xl bg-gray-50 p-4">
          <View className="flex-row justify-between py-1">
            <Text className="text-sm text-gray-700">{t('Sous-total produits', 'Products subtotal')}</Text>
            <Text className="text-sm font-semibold text-gray-900">
              {formatEur(subtotalEur)}
            </Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text className="text-sm text-gray-700">{t('Poids total', 'Total weight')}</Text>
            <Text className="text-sm font-semibold text-gray-900">
              {formatWeight(totalWeight)}
            </Text>
          </View>
          <Text className="mt-2 text-xs text-gray-500">
            {t(
              "Les frais de transport dépendent du GP choisi à l'étape suivante.",
              'Shipping costs depend on the personal shopper you choose next.',
            )}
          </Text>
        </View>
      </ScrollView>

      <View className="border-t border-gray-100 px-4 pt-3">
        <Button
          fullWidth
          onPress={() => router.push('/(app)/trips')}
        >
          {t('Choisir un GP', 'Choose a personal shopper')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

/**
 * Pas d'incrément d'un article vendu au mètre.
 *
 * Passer de 2,5 m à 3,5 m d'un coup de « + » ferait bondir le prix et le
 * poids ; le demi-mètre est l'unité avec laquelle on achète du tissu.
 */
function step(item: CartItem): number {
  return item.kind === 'BY_LENGTH' ? 0.5 : 1;
}

function Header({
  onBack,
  onClear,
}: {
  onBack: () => void;
  onClear?: () => void;
}) {
  const { t } = useAppLanguage();
  return (
    <View className="flex-row items-center justify-between px-4 py-2">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">{t('Panier', 'Cart')}</Text>
      </View>

      {onClear && (
        <Pressable onPress={onClear} className="px-2 py-1">
          <Text className="text-sm text-red-600">{t('Vider', 'Clear')}</Text>
        </Pressable>
      )}
    </View>
  );
}

function CartRow({
  item,
  onDecrement,
  onIncrement,
  onRemove,
}: {
  item: CartItem;
  onDecrement: () => void;
  onIncrement: () => void;
  onRemove: () => void;
}) {
  const { t } = useAppLanguage();

  return (
    <View className="mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-100 p-2.5">
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          contentFit="cover"
          style={{ width: 56, height: 56, borderRadius: 12 }}
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-gray-100">
          <Ionicons name="image-outline" size={20} color="#9CA3AF" />
        </View>
      )}

      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-gray-900">
          {item.name}
        </Text>

        {/* La déclinaison choisie, figée à l'ajout. Sans elle, deux tailles du
            même vêtement seraient deux lignes rigoureusement identiques à
            l'écran — impossible de savoir laquelle on retire. */}
        {item.variantLabel ? (
          <Text numberOfLines={1} className="mt-0.5 text-[11px] text-gray-600">
            {item.variantLabel}
          </Text>
        ) : null}

        {item.measurements ? (
          <Text className="mt-0.5 text-[11px] text-gray-600">
            {t('Sur mesure', 'Custom fit')} · {Object.keys(item.measurements).length} {t('mesures', 'measurements')}
          </Text>
        ) : null}

        <Text className="mt-0.5 text-xs text-gray-500">
          {formatXof(item.price)} · {formatWeight(item.weight)}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-3">
          <Pressable
            onPress={onDecrement}
            className="h-7 w-7 items-center justify-center rounded-lg bg-gray-100"
          >
            <Ionicons name="remove" size={15} color={colors.text} />
          </Pressable>
          <Text className="min-w-5 text-center text-sm font-semibold text-gray-900">
            {item.quantity}
          </Text>
          <Pressable
            onPress={onIncrement}
            className="h-7 w-7 items-center justify-center rounded-lg bg-gray-100"
          >
            <Ionicons name="add" size={15} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={onRemove} className="self-start p-1">
        <Ionicons name="trash-outline" size={17} color="#DC2626" />
      </Pressable>
    </View>
  );
}
