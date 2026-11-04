import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useContentWidth } from '@/hooks/useContentWidth';
import { useAppLanguage } from '@/lib/appLanguage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilterSheet } from '@/components/search/FilterSheet';
import { GpCard } from '@/components/search/GpCard';
import { MerchantCard } from '@/components/search/MerchantCard';
import { ProductCell } from '@/components/search/ProductCell';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ConversationSkeleton,
  ProductCellSkeleton,
} from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import {
  EMPTY_FILTERS,
  countActiveFilters,
  useDebounced,
  useSearchGps,
  useSearchMerchants,
  useSearchProducts,
  useSuggestions,
  type SearchFilters,
} from '@/hooks/useSearch';

type Segment = 'products' | 'gps' | 'merchants';

/**
 * Largeur visée pour une vignette de résultat, en points.
 *
 * Le nombre de colonnes s'en déduit au lieu d'être figé à deux : sur un
 * téléphone cela donne bien deux colonnes, mais figé, le même calcul produisait
 * deux vignettes de 770 points sur un navigateur de bureau — une photo par
 * demi-écran. Le développement se fait sur le web, cet écart se voit donc
 * tous les jours.
 */
const TARGET_TILE_WIDTH = 190;
const MIN_COLUMNS = 2;
const GRID_GUTTER = 8;

/**
 * L'onglet Recherche.
 *
 * Trois portes d'entrée sur le même catalogue : ce qu'on achète, qui le
 * transporte, qui le vend. Elles partagent un seul champ de saisie — le
 * dupliquer par segment obligerait à retaper « Paris » en changeant d'onglet.
 */
export default function SearchScreen() {
  const { t } = useAppLanguage();
  const contentWidth = useContentWidth();

  const segments: { value: Segment; label: string }[] = [
    { value: 'products', label: t('Produits', 'Products') },
    { value: 'gps', label: t('GP', 'Travelers') },
    { value: 'merchants', label: t('Boutiques', 'Shops') },
  ];
  const placeholders: Record<Segment, string> = {
    products: t('Un produit, une marque…', 'A product or brand…'),
    gps: t('Une destination : Paris, Lyon…', 'A destination: Paris, Lyon…'),
    merchants: t('Le nom d’une boutique', 'A shop name'),
  };

  const [segment, setSegment] = useState<Segment>('products');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedQuery = useDebounced(query, 300);

  const productFilters = useMemo(
    () => ({ ...filters, ...(debouncedQuery.trim() ? { q: debouncedQuery.trim() } : {}) }),
    [filters, debouncedQuery],
  );

  const products = useSearchProducts(productFilters, segment === 'products');
  const gps = useSearchGps(debouncedQuery.trim(), segment === 'gps');
  const merchants = useSearchMerchants(
    debouncedQuery.trim(),
    segment === 'merchants',
  );
  const suggestions = useSuggestions(query);

  const activeFilters = countActiveFilters(filters);
  const columns = Math.max(
    MIN_COLUMNS,
    Math.floor(contentWidth / TARGET_TILE_WIDTH),
  );
  const tileWidth = (contentWidth - GRID_GUTTER * (columns + 1)) / columns;

  // Les suggestions ne s'affichent que pendant la frappe : une fois la
  // recherche lancée, elles masqueraient les résultats qu'on vient de demander.
  const showSuggestions =
    focused && query.trim().length >= 2 && Boolean(suggestions.data);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center gap-2 px-3 pb-2 pt-2">
        <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5">
          <Ionicons name="search" size={17} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            placeholder={placeholders[segment]}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={() => setFocused(false)}
            className="flex-1 text-[15px] text-gray-900"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('Effacer la recherche', 'Clear search')}
            >
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {focused ? (
          <Pressable
            onPress={() => {
              setFocused(false);
            }}
            accessibilityRole="button"
          >
            <Text className="text-xs text-gray-500">{t('Annuler', 'Cancel')}</Text>
          </Pressable>
        ) : segment === 'products' ? (
          <Pressable
            onPress={() => setSheetOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100"
            accessibilityRole="button"
            accessibilityLabel={
              activeFilters > 0
                ? t(`Filtres, ${activeFilters} actifs`, `Filters, ${activeFilters} active`)
                : t('Filtres', 'Filters')
            }
          >
            <Ionicons name="options-outline" size={19} color={colors.text} />
            {activeFilters > 0 && (
              <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1">
                <Text className="text-[9px] font-bold text-white">
                  {activeFilters}
                </Text>
              </View>
            )}
          </Pressable>
        ) : null}
      </View>

      {!showSuggestions && (
        <View className="flex-row gap-2 px-3 pb-2.5">
          {segments.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setSegment(item.value)}
              className={[
                'flex-1 items-center rounded-lg py-1.5',
                segment === item.value ? 'bg-primary' : 'bg-gray-100',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-xs font-semibold',
                  segment === item.value ? 'text-white' : 'text-gray-500',
                ].join(' ')}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {showSuggestions ? (
        <SuggestionList
          data={suggestions.data!}
          onPickTerm={(term) => {
            setQuery(term);
            setFocused(false);
          }}
          onPickMerchant={() => setFocused(false)}
          onPickDestination={(city) => {
            setQuery(city);
            setSegment('gps');
            setFocused(false);
          }}
        />
      ) : segment === 'products' ? (
        <ResultsPane
          isLoading={products.isLoading}
          isError={products.isError}
          onRetry={() => void products.refetch()}
          isEmpty={(products.data?.data.length ?? 0) === 0}
          skeleton={
            <View
              className="flex-row flex-wrap"
              style={{ paddingHorizontal: GRID_GUTTER, gap: GRID_GUTTER }}
            >
              {Array.from({ length: columns * 3 }).map((_, i) => (
                <ProductCellSkeleton key={i} width={tileWidth} />
              ))}
            </View>
          }
          emptyTitle={query ? t('Aucun résultat', 'No results') : t('Le catalogue est vide', 'The catalog is empty')}
          emptyDescription={
            query
              ? t(
                  'Essayez un autre mot-clé, ou élargissez vos filtres.',
                  'Try another keyword or broaden your filters.',
                )
              : t("Aucun produit n'est encore en ligne.", 'No products are listed yet.')
          }
        >
          <FlashList
            data={products.data?.data ?? []}
            keyExtractor={(item) => item.id}
            // `key` force le remontage quand le nombre de colonnes change :
            // FlashList ne recalcule pas sa disposition en cours de route.
            key={`grid-${columns}`}
            numColumns={columns}
            contentContainerStyle={{
              paddingHorizontal: GRID_GUTTER,
              paddingTop: 2,
            }}
            renderItem={({ item }) => (
              <ProductCell product={item} width={tileWidth} />
            )}
          />
        </ResultsPane>
      ) : segment === 'gps' ? (
        <ResultsPane
          isLoading={gps.isLoading}
          isError={gps.isError}
          onRetry={() => void gps.refetch()}
          isEmpty={(gps.data?.length ?? 0) === 0}
          skeleton={
            <View>
              {[0, 1, 2].map((i) => (
                <ConversationSkeleton key={i} />
              ))}
            </View>
          }
          emptyTitle={t('Aucun GP sur cette destination', 'No travelers for this destination')}
          emptyDescription={t(
            'Seuls les GP ayant un voyage à venir apparaissent ici.',
            'Only travelers with an upcoming trip appear here.',
          )}
        >
          <FlashList
            data={gps.data ?? []}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <Note
                text={t(
                  'Les GP transportent vos achats. Choisissez-en un après votre panier, ou contactez-le avant.',
                  'Travelers deliver your purchases. Choose one after adding items to your cart, or contact them beforehand.',
                )}
              />
            }
            renderItem={({ item }) => <GpCard gp={item} />}
          />
        </ResultsPane>
      ) : (
        <ResultsPane
          isLoading={merchants.isLoading}
          isError={merchants.isError}
          onRetry={() => void merchants.refetch()}
          isEmpty={(merchants.data?.length ?? 0) === 0}
          skeleton={
            <View>
              {[0, 1, 2, 3].map((i) => (
                <ConversationSkeleton key={i} />
              ))}
            </View>
          }
          emptyTitle={t('Aucune boutique', 'No shops')}
          emptyDescription={t('Essayez un autre nom.', 'Try another name.')}
        >
          <FlashList
            data={merchants.data ?? []}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MerchantCard merchant={item} />}
          />
        </ResultsPane>
      )}

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        resultCount={products.data?.total}
        onClose={() => setSheetOpen(false)}
        onApply={setFilters}
      />
    </SafeAreaView>
  );
}

function ResultsPane({
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  skeleton,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  /** Forme attendue des résultats — elle diffère selon le segment. */
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useAppLanguage();

  if (isLoading) {
    return <View className="flex-1">{skeleton}</View>;
  }

  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title={t('Connexion impossible', 'Unable to connect')}
        description={t('Impossible de charger les résultats.', 'Unable to load results.')}
        actionLabel={t('Réessayer', 'Try again')}
        onAction={onRetry}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon="search-outline"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return <View className="flex-1 bg-white">{children}</View>;
}

function SuggestionList({
  data,
  onPickTerm,
  onPickMerchant,
  onPickDestination,
}: {
  data: {
    products: string[];
    merchants: { id: string; shopName: string; city: string }[];
    destinations: { destCity: string; destCountry: string }[];
  };
  onPickTerm: (term: string) => void;
  onPickMerchant: (id: string) => void;
  onPickDestination: (city: string) => void;
}) {
  const { t } = useAppLanguage();
  const isEmpty =
    data.products.length === 0 &&
    data.merchants.length === 0 &&
    data.destinations.length === 0;

  if (isEmpty) {
    return (
      <View className="px-4 py-6">
        <Text className="text-center text-xs text-gray-400">
          {t(
            'Aucune suggestion — lancez quand même la recherche, elle tolère les fautes et les accents.',
            'No suggestions — try searching anyway; search handles typos and accents.',
          )}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {data.products.length > 0 && (
        <>
          <GroupLabel text={t('Suggestions', 'Suggestions')} />
          {data.products.map((name) => (
            <Pressable
              key={name}
              onPress={() => onPickTerm(name)}
              className="flex-row items-center gap-2.5 border-b border-gray-50 px-3.5 py-2.5"
            >
              <Ionicons name="search" size={15} color="#9CA3AF" />
              <Text className="text-[13px] text-gray-800">{name}</Text>
            </Pressable>
          ))}
        </>
      )}

      {data.merchants.length > 0 && (
        <>
          <GroupLabel text={t('Boutiques', 'Shops')} />
          {data.merchants.map((merchant) => (
            <Pressable
              key={merchant.id}
              onPress={() => {
                onPickTerm(merchant.shopName);
                onPickMerchant(merchant.id);
              }}
              className="flex-row items-center gap-2.5 border-b border-gray-50 px-3.5 py-2.5"
            >
              <Ionicons name="storefront-outline" size={15} color="#9CA3AF" />
              <Text className="text-[13px] text-gray-800">
                {merchant.shopName}
              </Text>
              <Text className="text-[11px] text-gray-400">{merchant.city}</Text>
            </Pressable>
          ))}
        </>
      )}

      {data.destinations.length > 0 && (
        <>
          <GroupLabel text={t('Destinations', 'Destinations')} />
          {data.destinations.map((destination) => (
            <Pressable
              key={`${destination.destCity}-${destination.destCountry}`}
              onPress={() => onPickDestination(destination.destCity)}
              className="flex-row items-center gap-2.5 border-b border-gray-50 px-3.5 py-2.5"
            >
              <Ionicons name="airplane-outline" size={15} color="#9CA3AF" />
              <Text className="text-[13px] text-gray-800">
                {destination.destCity}
              </Text>
              <Text className="text-[11px] text-gray-400">
                {destination.destCountry}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function GroupLabel({ text }: { text: string }) {
  return (
    <Text className="px-3.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-gray-400">
      {text}
    </Text>
  );
}

function Note({ text }: { text: string }) {
  return (
    <View className="mx-3 my-2.5 rounded-md border-l-[3px] border-amber-400 bg-amber-50 px-3 py-2.5">
      <Text className="text-[11px] leading-4 text-amber-900">{text}</Text>
    </View>
  );
}
