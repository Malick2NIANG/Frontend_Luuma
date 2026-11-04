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
import { useAppLanguage } from '@/lib/appLanguage';

const KIND_LABELS: Record<string, string> = {
  SIMPLE: 'Article simple',
  VARIANT: 'Plusieurs tailles ou couleurs',
  MADE_TO_ORDER: 'Sur-mesure',
  BY_LENGTH: 'Vendu au mètre',
};
const KIND_LABELS_EN: Record<string, string> = {
  SIMPLE: 'Single item',
  VARIANT: 'Multiple sizes or colors',
  MADE_TO_ORDER: 'Made to order',
  BY_LENGTH: 'Sold by length',
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
  const { t } = useAppLanguage();
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
      goingOffline
        ? t('Retirer de la vente ?', 'Remove from sale?')
        : t('Remettre en vente ?', 'Put back on sale?'),
      goingOffline
        ? t(
            'Le produit disparaîtra du fil et de la recherche. Les commandes déjà passées ne sont pas affectées.',
            'The product will disappear from the feed and search. Existing orders will not be affected.',
          )
        : t('Le produit redeviendra visible des acheteurs.', 'The product will be visible to buyers again.'),
      [
        { text: t('Annuler', 'Cancel'), style: 'cancel' },
        {
          text: goingOffline ? t('Retirer', 'Remove') : t('Remettre', 'Put back'),
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
          accessibilityLabel={t('Retour', 'Back')}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} className="flex-1 text-lg font-bold text-gray-900">
          {product?.name ?? t('Produit', 'Product')}
        </Text>
        <Pressable
          onPress={() => router.push(`/(app)/products/${id}`)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Voir la fiche telle que la voient les acheteurs', 'View the product page as buyers see it')}
        >
          <Ionicons name="eye-outline" size={21} color={colors.text} />
        </Pressable>
      </View>

      {isLoading ? (
        <ProductDetailSkeleton />
      ) : isError || !product ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('Produit introuvable', 'Product not found')}
          description={t('Vérifiez votre connexion puis réessayez.', 'Check your connection and try again.')}
          actionLabel={t('Réessayer', 'Try again')}
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
                  {product.isAvailable ? t('En vente', 'On sale') : t('Retiré', 'Not listed')}
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
                label={t('Prix', 'Price')}
                value={`${product.price.toLocaleString(t('fr-FR', 'en-US'))} FCFA`}
              />
              <Row label={t('Poids de référence', 'Reference weight')} value={`${product.weight} kg`} />
              <Row
                label={t(PRODUCT_CATEGORY_LABELS[product.category], product.category)}
                value={PRODUCT_CATEGORY_LABELS[product.category]}
              />
              <Row
                label={t('Mode de vente', 'Selling method')}
                value={t(KIND_LABELS[product.kind] ?? product.kind, KIND_LABELS_EN[product.kind] ?? product.kind)}
              />
              {product.productionDays ? (
                <Row
                  label={t('Délai de confection', 'Production time')}
                  value={t(`${product.productionDays} jours`, `${product.productionDays} days`)}
                />
              ) : null}
              {product.unitLabel ? (
                <Row label={t('Unité', 'Unit')} value={product.unitLabel} />
              ) : null}
            </View>

            {product.variants && product.variants.length > 0 ? (
              <>
                <Text className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  {t('Déclinaisons', 'Variants')}
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
                          .join(' · ') || t('Sans libellé', 'No label')}
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
                        ? t('non suivi', 'not tracked')
                        : t(`${variant.stock} en stock`, `${variant.stock} in stock`)}
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
                {product.isAvailable ? t('Retirer de la vente', 'Remove from sale') : t('Remettre en vente', 'Put back on sale')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
