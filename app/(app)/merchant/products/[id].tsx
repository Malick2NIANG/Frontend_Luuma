import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaCarousel } from '@/components/media/MediaCarousel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductDetailSkeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { useProduct } from '@/hooks/useCatalog';
import { useGoBack } from '@/hooks/useGoBack';
import { useToggleProductAvailability } from '@/hooks/useMerchantSpace';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { PRODUCT_CATEGORY_LABELS } from '@/types/api.types';

const KIND_LABELS: Record<string, string> = {
  SIMPLE: 'Article simple',
  VARIANT: 'Plusieurs tailles ou couleurs',
  MADE_TO_ORDER: 'Sur-mesure',
  BY_LENGTH: 'Vendu au mètre',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-gray-50 py-2.5">
      <Text className="text-[12.5px] text-gray-500">{label}</Text>
      <Text className="text-[12.5px] font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

/**
 * Fiche produit vue par son commerçant.
 *
 * Séparée de `products/[id]`, qui est la fiche ACHETEUR : celle-ci ne
 * propose ni panier ni favori, et montre au contraire ce que le public ne
 * voit pas — le nombre de vues, l'état de la mise en vente, le détail des
 * déclinaisons et de leur stock.
 */
export default function MerchantProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/shop');
  const { isReady } = useRequireAuth('/(app)/(tabs)/shop');

  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const toggle = useToggleProductAvailability();

  if (!isReady) return <View className="flex-1 bg-white" />;

  const confirmToggle = () => {
    if (!product) return;
    const goingOffline = product.isAvailable;

    Alert.alert(
      goingOffline ? 'Retirer de la vente ?' : 'Remettre en vente ?',
      goingOffline
        ? "Le produit disparaîtra du fil et de la recherche. Les commandes déjà passées ne sont pas affectées."
        : 'Le produit redeviendra visible des acheteurs.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: goingOffline ? 'Retirer' : 'Remettre',
          style: goingOffline ? 'destructive' : 'default',
          onPress: () =>
            toggle.mutate({
              productId: product.id,
              isAvailable: !product.isAvailable,
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} className="flex-1 text-lg font-bold text-gray-900">
          {product?.name ?? 'Produit'}
        </Text>
        <Pressable
          onPress={() => router.push(`/(app)/products/${id}`)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Voir la fiche telle que la voient les acheteurs"
        >
          <Ionicons name="eye-outline" size={21} color={colors.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <ProductDetailSkeleton />
      ) : isError || !product ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Produit introuvable"
          description="Vérifiez votre connexion puis réessayez."
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      ) : (
        <ScrollView contentContainerClassName="pb-10">
          {product.images.length > 0 ? (
            <MediaCarousel media={product.images} aspectRatio={4 / 3} openOnPress />
          ) : null}

          <View className="px-3.5">
            <View className="mt-4 flex-row items-center gap-2">
              <View
                className={[
                  'rounded-full px-2 py-0.5',
                  product.isAvailable ? 'bg-emerald-50' : 'bg-gray-100',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-[10.5px] font-bold uppercase tracking-wide',
                    product.isAvailable ? 'text-primary' : 'text-gray-500',
                  ].join(' ')}
                >
                  {product.isAvailable ? 'En vente' : 'Retiré'}
                </Text>
              </View>
              <Text className="text-[11px] text-gray-400">
                {product.viewCount ?? 0} vue
                {(product.viewCount ?? 0) > 1 ? 's' : ''}
              </Text>
            </View>

            <Text className="mt-2 text-[17px] font-bold text-gray-900">
              {product.name}
            </Text>
            {product.description ? (
              <Text className="mt-1.5 text-[13px] leading-5 text-gray-600">
                {product.description}
              </Text>
            ) : null}

            <View className="mt-5">
              <Row
                label="Prix"
                value={`${product.price.toLocaleString('fr-FR')} FCFA`}
              />
              <Row label="Poids de référence" value={`${product.weight} kg`} />
              <Row
                label="Catégorie"
                value={PRODUCT_CATEGORY_LABELS[product.category]}
              />
              <Row
                label="Mode de vente"
                value={KIND_LABELS[product.kind] ?? product.kind}
              />
              {product.productionDays ? (
                <Row
                  label="Délai de confection"
                  value={`${product.productionDays} jours`}
                />
              ) : null}
              {product.unitLabel ? (
                <Row label="Unité" value={product.unitLabel} />
              ) : null}
            </View>

            {product.variants && product.variants.length > 0 ? (
              <>
                <Text className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Déclinaisons
                </Text>
                {product.variants.map((variant) => (
                  <View
                    key={variant.id}
                    className="flex-row items-center justify-between border-b border-gray-50 py-2.5"
                  >
                    <View className="flex-1 flex-row items-center gap-2">
                      {variant.colorHex ? (
                        <View
                          style={{ backgroundColor: variant.colorHex }}
                          className="h-3.5 w-3.5 rounded-full border border-gray-200"
                        />
                      ) : null}
                      <Text className="text-[12.5px] text-gray-900">
                        {[variant.sizeLabel ?? variant.size, variant.colorName]
                          .filter(Boolean)
                          .join(' · ') || 'Sans libellé'}
                      </Text>
                    </View>
                    <Text className="text-[12px] text-gray-500">
                      {variant.weight} kg
                    </Text>
                    <Text
                      className={[
                        'ml-3 w-16 text-right text-[12px] font-semibold',
                        variant.stock === null || variant.stock === undefined
                          ? 'text-gray-400'
                          : variant.stock > 0
                            ? 'text-gray-900'
                            : 'text-red-600',
                      ].join(' ')}
                    >
                      {variant.stock === null || variant.stock === undefined
                        ? 'non suivi'
                        : `${variant.stock} en stock`}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            {toggle.errorMessage ? (
              <Text className="mt-5 text-center text-[12.5px] text-red-500">
                {toggle.errorMessage}
              </Text>
            ) : null}

            <Pressable
              onPress={confirmToggle}
              disabled={toggle.isPending}
              className={[
                'mt-7 flex-row items-center justify-center gap-2 rounded-lg border py-3',
                product.isAvailable
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-white',
              ].join(' ')}
            >
              <Ionicons
                name={product.isAvailable ? 'eye-off-outline' : 'eye-outline'}
                size={17}
                color={product.isAvailable ? '#DC2626' : colors.text}
              />
              <Text
                className={[
                  'text-[13px] font-semibold',
                  product.isAvailable ? 'text-red-600' : 'text-gray-900',
                ].join(' ')}
              >
                {product.isAvailable ? 'Retirer de la vente' : 'Remettre en vente'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
