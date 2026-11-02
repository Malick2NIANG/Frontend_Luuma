import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '@/constants/colors';
import { CATEGORY_SHORT_LABELS } from '@/constants/categories';
import { PRODUCT_CATEGORIES } from '@/types/generated';
import {
  EMPTY_FILTERS,
  SORT_LABELS,
  SORT_OPTIONS,
  type SearchFilters,
  type SortOption,
} from '@/hooks/useSearch';
import type { ProductCategory } from '@/types/api.types';

/**
 * Villes proposées au filtre.
 *
 * Liste fermée volontairement courte : le champ libre produisait « Dakar »,
 * « dakar », « Dakar, Sénégal » selon le commerçant, et aucun filtre ne
 * pouvait fonctionner. À élargir quand l'offre sortira de ces quatre villes.
 */
const CITIES = ['Dakar', 'Thiès', 'Saint-Louis', 'Touba'];

/** Paliers de poids, en kg. Le poids détermine le prix du transport. */
const WEIGHT_BUCKETS: { label: string; value: number | undefined }[] = [
  { label: '— 500 g', value: 0.5 },
  { label: '— 1 kg', value: 1 },
  { label: '— 3 kg', value: 3 },
  { label: 'Peu importe', value: undefined },
];

const RATINGS: { label: string; value: number | undefined }[] = [
  { label: '4 et +', value: 4 },
  { label: '4,5 et +', value: 4.5 },
  { label: 'Toutes', value: undefined },
];

export interface FilterSheetProps {
  visible: boolean;
  filters: SearchFilters;
  resultCount?: number;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
}

/**
 * Panneau de filtres, en brouillon local.
 *
 * Les changements ne remontent qu'à la validation : appliquer à chaque appui
 * relancerait une recherche par pastille touchée, et la liste sous-jacente
 * sauterait pendant qu'on la règle.
 */
export function FilterSheet({
  visible,
  filters,
  resultCount,
  onClose,
  onApply,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<SearchFilters>(filters);

  // Resynchronisation à l'ouverture : le brouillon d'une session précédente
  // ne doit pas ressusciter après une réinitialisation faite ailleurs.
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const patch = (values: Partial<SearchFilters>) =>
    setDraft((current) => ({ ...current, ...values }));

  const toggle = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) => patch({ [key]: draft[key] === value ? undefined : value } as Partial<SearchFilters>);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="max-h-[88%] rounded-t-3xl bg-white">
          <View className="flex-row items-center border-b border-gray-100 px-4 py-3.5">
            <Text className="text-[15px] font-bold text-gray-900">Filtrer</Text>
            <Pressable
              className="ml-auto"
              onPress={() => setDraft({ ...EMPTY_FILTERS })}
            >
              <Text className="text-xs font-semibold text-primary">
                Tout effacer
              </Text>
            </Pressable>
            <Pressable className="ml-4" onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView>
            <Section title="Catégorie">
              <View className="flex-row flex-wrap gap-1.5">
                {PRODUCT_CATEGORIES.map((category: ProductCategory) => (
                  <Chip
                    key={category}
                    label={CATEGORY_SHORT_LABELS[category]}
                    active={draft.category === category}
                    onPress={() => toggle('category', category)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Prix (FCFA)">
              <View className="flex-row items-center gap-2.5">
                <NumberField
                  value={draft.minPrice}
                  placeholder="Minimum"
                  onChange={(value) => patch({ minPrice: value })}
                />
                <Text className="text-gray-400">—</Text>
                <NumberField
                  value={draft.maxPrice}
                  placeholder="Maximum"
                  onChange={(value) => patch({ maxPrice: value })}
                />
              </View>
            </Section>

            <Section title="Poids — il détermine le prix du transport">
              <View className="flex-row flex-wrap gap-1.5">
                {WEIGHT_BUCKETS.map((bucket) => (
                  <Chip
                    key={bucket.label}
                    label={bucket.label}
                    active={draft.maxWeight === bucket.value}
                    onPress={() => patch({ maxWeight: bucket.value })}
                  />
                ))}
              </View>
            </Section>

            <Section title="Ville du commerçant">
              <View className="flex-row flex-wrap gap-1.5">
                {CITIES.map((city) => (
                  <Chip
                    key={city}
                    label={city}
                    active={draft.city === city}
                    onPress={() => toggle('city', city)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Note du vendeur">
              <View className="flex-row flex-wrap gap-1.5">
                {RATINGS.map((rating) => (
                  <Chip
                    key={rating.label}
                    label={`★ ${rating.label}`}
                    active={draft.minRating === rating.value}
                    onPress={() => patch({ minRating: rating.value })}
                  />
                ))}
              </View>
            </Section>

            <Section title="Trier par" last>
              <View className="flex-row flex-wrap gap-1.5">
                {SORT_OPTIONS.map((option: SortOption) => (
                  <Chip
                    key={option}
                    label={SORT_LABELS[option]}
                    active={draft.sort === option}
                    onPress={() => patch({ sort: option })}
                  />
                ))}
              </View>
            </Section>
          </ScrollView>

          <View className="border-t border-gray-100 px-4 pb-5 pt-3">
            <Pressable
              onPress={() => {
                onApply(draft);
                onClose();
              }}
              className="items-center rounded-xl bg-primary py-3.5"
            >
              <Text className="text-sm font-bold text-white">
                {resultCount === undefined
                  ? 'Voir les résultats'
                  : `Voir ${resultCount} résultat${resultCount > 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View
      className={[
        'px-4 py-3.5',
        last ? '' : 'border-b border-gray-100',
      ].join(' ')}
    >
      <Text className="mb-2.5 text-xs font-bold text-gray-900">{title}</Text>
      {children}
    </View>
  );
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
        'rounded-full px-3 py-1.5',
        active ? 'bg-primary' : 'bg-gray-100',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[11px]',
          active ? 'font-semibold text-white' : 'text-gray-700',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function NumberField({
  value,
  placeholder,
  onChange,
}: {
  value: number | undefined;
  placeholder: string;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <TextInput
      value={value === undefined ? '' : String(value)}
      onChangeText={(text) => {
        const digits = text.replace(/\D/g, '');
        onChange(digits === '' ? undefined : Number(digits));
      }}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType="number-pad"
      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900"
    />
  );
}
