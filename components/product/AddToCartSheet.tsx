import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  MeasurementsForm,
  measurementsComplete,
} from '@/components/product/MeasurementsForm';
import {
  VariantPicker,
  describeVariant,
  firstAvailableVariant,
} from '@/components/product/VariantPicker';
import { colors } from '@/constants/colors';
import { usePrice } from '@/hooks/useCurrency';
import type { ProductDetail, ProductVariant } from '@/hooks/useCatalog';
import { formatWeight, formatXof } from '@/lib/format';

/** Pas d'ajustement d'une longueur de tissu — l'unité d'achat réelle. */
const LENGTH_STEP = 0.5;

export interface AddToCartSelection {
  quantity: number;
  variant: ProductVariant | null;
  measurements: Record<string, number> | null;
}

export interface AddToCartSheetProps {
  visible: boolean;
  product: ProductDetail;
  onClose: () => void;
  onConfirm: (selection: AddToCartSelection) => void;
}

/**
 * Feuille de choix, ouverte depuis la barre d'action de la fiche.
 *
 * Le choix se fait ici et non dans le corps de la page, pour la raison qui
 * fait qu'Airbnb ouvre un panneau plutôt que d'inscrire ses champs dans la
 * fiche : on lit d'abord, on décide ensuite. Mêlés au contenu, la taille et la
 * quantité obligent à trancher avant d'avoir lu les avis.
 *
 * Une seule feuille pour les trois formes de vente : ce qui change est le
 * corps — déclinaisons, mesures ou longueur — jamais la mécanique.
 */
export function AddToCartSheet({
  visible,
  product,
  onClose,
  onConfirm,
}: AddToCartSheetProps) {
  const price = usePrice();

  const isVariant = product.kind === 'VARIANT';
  const isCustom = product.kind === 'MADE_TO_ORDER';
  const isByLength = product.kind === 'BY_LENGTH';

  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);

  // Réinitialisation à chaque ouverture : rouvrir la feuille après un premier
  // ajout doit repartir d'un choix neuf, pas des valeurs de la fois d'avant.
  useEffect(() => {
    if (!visible) return;

    setVariant(isVariant ? firstAvailableVariant(product.variants) : null);
    setMeasurements({});
    setQuantity(isByLength ? (product.minQuantity ?? 1) : 1);
  }, [visible, isVariant, isByLength, product.variants, product.minQuantity]);

  const unitPrice = variant?.price ?? product.price;
  const unitWeight = variant?.weight ?? product.weight;
  const unit = product.unitLabel ?? 'unité';

  /** Ce qui empêche encore de valider, dit en toutes lettres. */
  const blocker = useMemo(() => {
    if (isVariant) {
      if (!variant) return 'Choisissez une taille';
      if (variant.stock === 0) return 'Cette taille est épuisée';
      if (variant.stock !== null && variant.stock < quantity) {
        return `Il ne reste que ${variant.stock} exemplaire(s)`;
      }
      return null;
    }
    if (isCustom && !measurementsComplete(product.requiredMeasurements, measurements)) {
      return 'Renseignez toutes vos mesures';
    }
    if (isByLength && quantity < (product.minQuantity ?? 0)) {
      return `Minimum ${product.minQuantity} ${unit}`;
    }
    return null;
  }, [
    isVariant,
    isCustom,
    isByLength,
    variant,
    quantity,
    measurements,
    product.requiredMeasurements,
    product.minQuantity,
    unit,
  ]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="max-h-[88%] rounded-t-3xl bg-white">
          <View className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
            <Text numberOfLines={1} className="flex-1 text-[15px] font-bold text-gray-900">
              {product.name}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView className="px-4" keyboardShouldPersistTaps="handled">
            {isVariant && product.variants.length > 0 ? (
              <View className="pt-4">
                <VariantPicker
                  variants={product.variants}
                  selected={variant}
                  onSelect={setVariant}
                />
              </View>
            ) : null}

            {isCustom ? (
              <View className="pt-4">
                <MeasurementsForm
                  required={product.requiredMeasurements}
                  values={measurements}
                  productionDays={product.productionDays}
                  onChange={setMeasurements}
                />
              </View>
            ) : null}

            <View className="py-5">
              <Text className="mb-2 text-sm font-semibold text-gray-900">
                {isByLength ? `Longueur (${unit})` : 'Quantité'}
              </Text>

              <View className="flex-row items-center gap-4">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Diminuer"
                  onPress={() =>
                    setQuantity((q) =>
                      isByLength
                        ? Math.max(product.minQuantity ?? LENGTH_STEP, q - LENGTH_STEP)
                        : Math.max(1, q - 1),
                    )
                  }
                  className="h-11 w-11 items-center justify-center rounded-xl border border-gray-200"
                >
                  <Ionicons name="remove" size={20} color={colors.text} />
                </Pressable>

                {isByLength ? (
                  <TextInput
                    value={String(quantity)}
                    onChangeText={(text) => {
                      // Virgule décimale acceptée : c'est ce que frappe un
                      // clavier téléphone en France comme au Sénégal.
                      const parsed = Number(text.replace(',', '.'));
                      if (!Number.isNaN(parsed)) setQuantity(parsed);
                    }}
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Longueur en ${unit}`}
                    className="min-w-16 rounded-lg border border-gray-200 px-3 py-2 text-center text-lg font-semibold text-gray-900"
                  />
                ) : (
                  <Text className="min-w-8 text-center text-lg font-semibold text-gray-900">
                    {quantity}
                  </Text>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Augmenter"
                  onPress={() =>
                    setQuantity((q) => (isByLength ? q + LENGTH_STEP : q + 1))
                  }
                  className="h-11 w-11 items-center justify-center rounded-xl border border-gray-200"
                >
                  <Ionicons name="add" size={20} color={colors.text} />
                </Pressable>
              </View>

              <View className="mt-5 rounded-2xl bg-gray-50 p-4">
                <Row
                  label="Sous-total"
                  value={formatXof(unitPrice * quantity)}
                />
                {price.currency !== 'XOF' ? (
                  <Row
                    label="Soit environ"
                    value={price.format(unitPrice * quantity)}
                    muted
                  />
                ) : null}
                <Row
                  label="Poids total"
                  value={formatWeight(unitWeight * quantity)}
                  muted
                />
                {variant ? (
                  <Row label="Choix" value={describeVariant(variant)} muted />
                ) : null}
              </View>
            </View>
          </ScrollView>

          <View className="border-t border-gray-100 px-4 pb-6 pt-3">
            {blocker ? (
              <Text className="mb-2 text-center text-xs text-gray-500">
                {blocker}
              </Text>
            ) : null}

            <Pressable
              disabled={Boolean(blocker)}
              onPress={() =>
                onConfirm({
                  quantity,
                  variant,
                  measurements: isCustom ? measurements : null,
                })
              }
              accessibilityRole="button"
              className={[
                'items-center rounded-xl py-3.5',
                blocker ? 'bg-gray-200' : 'bg-primary',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-sm font-bold',
                  blocker ? 'text-gray-400' : 'text-white',
                ].join(' ')}
              >
                Ajouter au panier
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className={muted ? 'text-sm text-gray-500' : 'text-sm text-gray-700'}>
        {label}
      </Text>
      <Text
        className={
          muted ? 'text-sm text-gray-500' : 'text-sm font-semibold text-gray-900'
        }
      >
        {value}
      </Text>
    </View>
  );
}
