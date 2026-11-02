import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaCarousel } from '@/components/media/MediaCarousel';
import {
  AddToCartSheet,
  type AddToCartSelection,
} from '@/components/product/AddToCartSheet';
import { describeVariant } from '@/components/product/VariantPicker';
import { Avatar } from '@/components/ui/Avatar';
import { CurrencyPicker } from '@/components/ui/CurrencyPicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExpandableText } from '@/components/ui/ExpandableText';
import { ProductDetailSkeleton } from '@/components/ui/Skeleton';
import { CATEGORY_LABELS } from '@/constants/categories';
import { colors } from '@/constants/colors';
import { useProduct } from '@/hooks/useCatalog';
import { usePrice } from '@/hooks/useCurrency';
import { useOpenDirectChat } from '@/hooks/useDirectChat';
import { useToggleFavorite } from '@/hooks/useFavorites';
import { useAuthGate } from '@/hooks/useRequireAuth';
import { formatWeight, formatXof } from '@/lib/format';
import { isInCart, useCartStore } from '@/store/cart.store';

/**
 * Fiche produit.
 *
 * C'est ici que tout se décide — favori, devise, déclinaisons, panier, avis,
 * transport. Le fil ne fait que montrer, avec un unique « Voir plus » : y
 * mêler des actions obligeait à choisir une taille sans avoir rien lu.
 *
 * La barre du bas est fixe, comme sur Airbnb : le prix et le geste d'achat
 * restent visibles quelle que soit la position dans la page, pour qu'on
 * n'ait jamais à remonter pour agir.
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)');

  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const price = usePrice();
  const { requireAuth } = useAuthGate();
  const { toggle: toggleFavorite } = useToggleFavorite();
  const { open: openChat } = useOpenDirectChat();

  const addToCart = useCartStore((s) => s.add);
  const inCart = useCartStore((s) => (id ? isInCart(s.items, id) : false));

  const [sheetOpen, setSheetOpen] = useState(false);
  // Bascule optimiste posée SUR la valeur du serveur : sans elle, le cœur
  // s'affichait vide sur un produit déjà en favori, et rester à l'écoute du
  // seul serveur ferait « coller » le cœur le temps de l'aller-retour.
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const favorited = favoriteOverride ?? product?.isFavorited ?? false;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <ProductDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !product) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <EmptyState
          icon="alert-circle-outline"
          title="Produit introuvable"
          description="Ce produit n'est plus disponible ou a été retiré."
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const unit = product.unitLabel ?? 'unité';
  const isByLength = product.kind === 'BY_LENGTH';

  /** Couleurs distinctes, en aperçu — le choix réel se fait dans la feuille. */
  const colours = [
    ...new Map(
      product.variants
        .filter((v) => v.colorName)
        .map((v) => [v.colorName, v]),
    ).values(),
  ];

  const handleConfirm = (selection: AddToCartSelection) => {
    setSheetOpen(false);

    addToCart({
      product: {
        id: product.id,
        merchantId: product.merchant.id,
        name: product.name,
        images: product.images,
        price: product.price,
        priceEur: product.priceEur,
        weight: product.weight,
        kind: product.kind,
        unitLabel: product.unitLabel,
      },
      merchantName: product.merchant.shopName,
      quantity: selection.quantity,
      ...(selection.variant
        ? {
            variant: {
              id: selection.variant.id,
              label: describeVariant(selection.variant),
              weight: selection.variant.weight,
              price: selection.variant.price,
              images: selection.variant.images,
            },
          }
        : {}),
      ...(selection.measurements ? { measurements: selection.measurements } : {}),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Barre d'actions SUR fond blanc, au-dessus de la galerie, plutôt qu'en
          surimpression sur la photo.

          Deux raisons. D'abord l'image collait au bord haut, sans respiration.
          Ensuite et surtout : des pastilles blanches posées sur une photo
          quelconque disparaissent dès que celle-ci est claire — et les photos
          viennent des commerçants, on ne les maîtrise pas. Airbnb peut se le
          permettre avec un dégradé sombre en surimpression ; ici, une barre
          franche est plus sûre et plus lisible. */}
      <View className="flex-row items-center px-3 pb-2 pt-1">
        <RoundButton icon="arrow-back" label="Retour" onPress={goBack} />
        <View className="flex-1" />
        <RoundButton
          icon="share-outline"
          label="Partager"
          onPress={() => {
            void Share.share({
              message: `${product.name} — ${formatXof(product.price)} sur Luuma`,
            }).catch(() => undefined);
          }}
        />
        <View className="w-2" />
        <RoundButton
          icon={favorited ? 'heart' : 'heart-outline'}
          tint={favorited ? '#DC2626' : colors.text}
          label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onPress={() => {
            if (!requireAuth(`/(app)/products/${product.id}`)) return;
            toggleFavorite({ productId: product.id, isFavorited: favorited });
            setFavoriteOverride(!favorited);
          }}
        />
      </View>

      <ScrollView contentContainerClassName="pb-4">
        <MediaCarousel media={product.images} aspectRatio={4 / 3} openOnPress />

        <View className="px-4 pt-4">
          <Text className="text-xl font-bold text-gray-900">{product.name}</Text>

          <View className="mt-1.5 flex-row items-center gap-1.5">
            <Text className="text-[12px] text-gray-500">
              {CATEGORY_LABELS[product.category]}
            </Text>
            {product.subCategory ? (
              <>
                <Text className="text-[12px] text-gray-300">·</Text>
                <Text className="text-[12px] text-gray-500">
                  {product.subCategory}
                </Text>
              </>
            ) : null}
          </View>

          {/* --- Prix et devise --- */}
          <View className="mt-4 rounded-2xl border border-gray-100 p-4">
            <View className="flex-row items-end justify-between">
              <View>
                <View className="flex-row items-end gap-1.5">
                  <Text className="text-2xl font-bold text-primary">
                    {formatXof(product.price)}
                  </Text>
                  {isByLength ? (
                    <Text className="pb-1 text-sm text-gray-500">/ {unit}</Text>
                  ) : null}
                </View>
                <Text className="mt-0.5 text-sm text-gray-600">
                  {price.format(product.price)}
                  {isByLength ? ` / ${unit}` : ''}
                </Text>
              </View>

              <CurrencyPicker />
            </View>

            {/* Dit ici, pas à la caisse : le client doit savoir avant de
                s'engager que sa banque le débitera en euros. */}
            {price.isIndicative ? (
              <Text className="mt-2.5 text-[11px] leading-4 text-gray-500">
                Montant indicatif. Vous serez débité en euros.
                {price.quotedAt
                  ? ` Taux du ${new Date(price.quotedAt).toLocaleDateString('fr-FR')}.`
                  : ''}
              </Text>
            ) : null}
          </View>

          {/* --- Transport --- */}
          <View className="mt-3 flex-row items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-3">
            <Ionicons name="airplane-outline" size={17} color="#B45309" />
            <View className="flex-1">
              <Text className="text-[12px] font-semibold text-amber-900">
                {formatWeight(product.weight)} {isByLength ? `le ${unit}` : "l'unité"}
              </Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-amber-800">
                Le poids détermine le coût du transport. Vous choisirez votre GP
                après le panier.
              </Text>
            </View>
          </View>

          {/* --- Boutique --- */}
          <Pressable
            onPress={() => router.push(`/(app)/merchants/${product.merchant.id}`)}
            className="mt-4 flex-row items-center gap-3 rounded-2xl border border-gray-100 p-3.5"
          >
            <Avatar name={product.merchant.shopName} size={42} />
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-gray-900">
                {product.merchant.shopName}
              </Text>
              <Text className="mt-0.5 text-[11px] text-gray-500">
                {product.merchant.city}
                {product.merchant.totalReviews > 0
                  ? ` · ★ ${product.merchant.rating.toFixed(1)} (${product.merchant.totalReviews})`
                  : ' · Nouvelle boutique'}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                openChat(
                  product.merchant.user.id,
                  `/(app)/products/${product.id}`,
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Écrire à la boutique"
              className="rounded-lg border border-primary px-3 py-1.5"
            >
              <Text className="text-[11px] font-bold text-primary">Message</Text>
            </Pressable>
          </Pressable>

          {/* --- Description --- */}
          {product.description ? (
            <View className="mt-5">
              <Text className="mb-1.5 text-sm font-semibold text-gray-900">
                Description
              </Text>
              <ExpandableText
                text={product.description}
                lines={4}
                className="text-[13px] leading-5 text-gray-700"
              />
            </View>
          ) : null}

          {/* --- Aperçu des déclinaisons --- */}
          {colours.length > 0 ? (
            <View className="mt-5">
              <Text className="mb-2 text-sm font-semibold text-gray-900">
                {colours.length} couleur{colours.length > 1 ? 's' : ''} disponible
                {colours.length > 1 ? 's' : ''}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {colours.map((variant) => (
                  <View
                    key={variant.id}
                    className="flex-row items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1.5"
                  >
                    <View
                      className="h-4 w-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: variant.colorHex ?? '#E5E7EB' }}
                    />
                    <Text className="text-[11px] text-gray-700">
                      {variant.colorName}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* --- Avis --- */}
          <View className="mt-6 border-t border-gray-100 pt-5">
            <Text className="mb-1.5 text-sm font-semibold text-gray-900">
              Avis
            </Text>
            <Text className="text-[12px] leading-5 text-gray-500">
              Aucun avis pour l'instant. Les avis apparaîtront après les
              premières livraisons confirmées.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Barre d'action fixe — le prix et le geste restent sous la main. */}
      <View className="flex-row items-center gap-3 border-t border-gray-100 px-4 pt-3">
        <View className="flex-1">
          <Text className="text-base font-bold text-primary">
            {formatXof(product.price)}
          </Text>
          <Text className="text-[11px] text-gray-500">
            {price.format(product.price)}
            {isByLength ? ` / ${unit}` : ''}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            if (!requireAuth(`/(app)/products/${product.id}`)) return;
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          className="flex-row items-center gap-1.5 rounded-xl bg-primary px-6 py-3.5"
        >
          <Ionicons name="cart-outline" size={17} color={colors.white} />
          <Text className="text-sm font-bold text-white">
            {inCart ? 'Ajouter encore' : 'Ajouter au panier'}
          </Text>
        </Pressable>
      </View>

      <AddToCartSheet
        visible={sheetOpen}
        product={product}
        onClose={() => setSheetOpen(false)}
        onConfirm={handleConfirm}
      />
    </SafeAreaView>
  );
}

function RoundButton({
  icon,
  label,
  tint = colors.text,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-9 w-9 items-center justify-center rounded-full bg-white/90"
    >
      <Ionicons name={icon} size={19} color={tint} />
    </Pressable>
  );
}
