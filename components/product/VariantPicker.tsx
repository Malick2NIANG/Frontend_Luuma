import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import type { ProductVariant } from '@/hooks/useCatalog';
import type { ProductSize } from '@/types/api.types';

/** Ordre d'affichage des tailles. Une liste triée alphabétiquement donnerait
 *  L, M, S, XL — incompréhensible pour qui cherche sa taille. */
const SIZE_ORDER: ProductSize[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'ONE_SIZE',
];

const SIZE_LABELS: Record<ProductSize, string> = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  XXL: '2XL',
  XXXL: '3XL',
  ONE_SIZE: 'Unique',
};

export interface VariantPickerProps {
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

/**
 * Sélecteur couleur puis taille, façon Shein.
 *
 * Le principe qui fait la différence : une taille est grisée quand elle
 * n'existe pas dans la couleur choisie, au lieu d'être absente. La faire
 * disparaître donnerait l'impression que le produit n'est plus vendu dans
 * cette taille, alors qu'il l'est — dans une autre couleur.
 */
export function VariantPicker({
  variants,
  selected,
  onSelect,
}: VariantPickerProps) {
  const colours = useMemo(() => {
    const seen = new Map<string, ProductVariant>();
    for (const variant of variants) {
      if (variant.colorName && !seen.has(variant.colorName)) {
        seen.set(variant.colorName, variant);
      }
    }
    return [...seen.entries()].map(([name, sample]) => ({
      name,
      hex: sample.colorHex,
    }));
  }, [variants]);

  const sizes = useMemo(() => {
    const present = new Set(
      variants.map((v) => v.size).filter((s): s is ProductSize => s !== null),
    );
    return SIZE_ORDER.filter((size) => present.has(size));
  }, [variants]);

  const activeColour = selected?.colorName ?? colours[0]?.name ?? null;

  /** La déclinaison correspondant à une couleur et une taille données. */
  const findVariant = (
    colorName: string | null,
    size: ProductSize | null,
  ): ProductVariant | undefined =>
    variants.find((v) => v.colorName === colorName && v.size === size);

  const isSoldOut = (variant: ProductVariant | undefined): boolean =>
    !variant || !variant.isAvailable || variant.stock === 0;

  return (
    <View className="gap-4">
      {colours.length > 0 && (
        <View>
          <Text className="mb-2 text-sm font-semibold text-gray-900">
            Couleur{activeColour ? ` · ${activeColour}` : ''}
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {colours.map((colour) => {
              const isActive = colour.name === activeColour;
              return (
                <Pressable
                  key={colour.name}
                  accessibilityRole="button"
                  accessibilityLabel={colour.name}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => {
                    // On garde la taille choisie si elle existe dans la
                    // nouvelle couleur — sinon la première disponible.
                    const sameSize = findVariant(
                      colour.name,
                      selected?.size ?? null,
                    );
                    const fallback = variants.find(
                      (v) => v.colorName === colour.name && !isSoldOut(v),
                    );
                    const next = sameSize && !isSoldOut(sameSize) ? sameSize : fallback;
                    if (next) onSelect(next);
                  }}
                  className={[
                    'h-11 w-11 items-center justify-center rounded-full border-2',
                    isActive ? 'border-primary' : 'border-gray-200',
                  ].join(' ')}
                >
                  <View
                    className="h-7 w-7 rounded-full border border-gray-200"
                    style={{ backgroundColor: colour.hex ?? '#E5E7EB' }}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {sizes.length > 0 && (
        <View>
          <Text className="mb-2 text-sm font-semibold text-gray-900">Taille</Text>
          <View className="flex-row flex-wrap gap-2">
            {sizes.map((size) => {
              const variant = findVariant(activeColour, size);
              const soldOut = isSoldOut(variant);
              const isActive = selected?.id === variant?.id;

              return (
                <Pressable
                  key={size}
                  disabled={soldOut}
                  accessibilityRole="button"
                  accessibilityLabel={
                    soldOut
                      ? `Taille ${SIZE_LABELS[size]}, épuisée`
                      : `Taille ${SIZE_LABELS[size]}`
                  }
                  accessibilityState={{ selected: isActive, disabled: soldOut }}
                  onPress={() => variant && onSelect(variant)}
                  className={[
                    'min-w-14 items-center rounded-lg border px-3.5 py-2.5',
                    isActive
                      ? 'border-primary bg-primary'
                      : soldOut
                        ? 'border-gray-100 bg-gray-50'
                        : 'border-gray-200 bg-white',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-[13px] font-semibold',
                      isActive
                        ? 'text-white'
                        : soldOut
                          ? 'text-gray-300 line-through'
                          : 'text-gray-800',
                    ].join(' ')}
                  >
                    {/* Le libellé du commerçant l'emporte : « 42/44 » lui
                        parle davantage que « L ». */}
                    {variant?.sizeLabel ?? SIZE_LABELS[size]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Un stock bas se dit : c'est ce qui décide d'acheter maintenant. */}
      {selected?.stock != null && selected.stock > 0 && selected.stock <= 3 && (
        <Text className="text-xs font-medium text-amber-700">
          Plus que {selected.stock} en stock
        </Text>
      )}
    </View>
  );
}

/** Première déclinaison réellement achetable, pour la sélection par défaut. */
export function firstAvailableVariant(
  variants: ProductVariant[],
): ProductVariant | null {
  return (
    variants.find((v) => v.isAvailable && v.stock !== 0) ?? variants[0] ?? null
  );
}

/** « M · Bleu indigo » — figé dans le panier puis sur la commande. */
export function describeVariant(variant: ProductVariant): string {
  const size = variant.sizeLabel ?? (variant.size ? SIZE_LABELS[variant.size] : null);
  return [size, variant.colorName].filter(Boolean).join(' · ') || 'Standard';
}
