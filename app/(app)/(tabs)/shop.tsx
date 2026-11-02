import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductCellSkeleton } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { useMe } from '@/hooks/useMe';
import {
  useMerchantStats,
  useOwnProducts,
  type OwnProduct,
  type ProductAvailabilityFilter,
} from '@/hooks/useMerchantSpace';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { firstImage } from '@/lib/media';

const GRID_GAP = 2;

const FILTERS: { key: ProductAvailabilityFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'available', label: 'En vente' },
  { key: 'unavailable', label: 'Retirés' },
];

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-[17px] font-bold text-gray-900">{value}</Text>
      <Text className="mt-0.5 text-center text-[10px] text-gray-500">{label}</Text>
    </View>
  );
}

function ProductCell({ product }: { product: OwnProduct }) {
  const router = useRouter();
  const cover = firstImage(product.images);

  // Un produit retiré ou en rupture doit se repérer d'un coup d'œil dans la
  // grille : c'est la question que le commerçant se pose en arrivant ici.
  const flag = !product.isAvailable
    ? 'Retiré'
    : product.isOutOfStock
      ? 'Rupture'
      : null;

  return (
    <View style={{ width: '33.333%', padding: GRID_GAP / 2 }}>
      <Pressable
        onPress={() => router.push(`/(app)/merchant/products/${product.id}`)}
        className="aspect-square overflow-hidden rounded-[2px] bg-gray-100"
      >
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View className="h-full w-full items-center justify-center">
            <Ionicons name="image-outline" size={20} color="#C7C7CC" />
          </View>
        )}

        {flag ? (
          <View className="absolute inset-0 items-center justify-center bg-black/45">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-white">
              {flag}
            </Text>
          </View>
        ) : null}

        {product.variantCount > 0 ? (
          <View className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 py-0.5">
            <Text className="text-[9px] font-semibold text-white">
              {product.variantCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

/**
 * Espace commerçant — onglet permanent.
 *
 * Un onglet et non un écran poussé depuis le profil : c'est l'espace de
 * travail quotidien de quelqu'un qui vend, et l'enfouir sous deux niveaux de
 * navigation reviendrait à traiter la vente comme un à-côté. L'onglet
 * n'apparaît que si le compte a une boutique (voir `(tabs)/_layout.tsx`) : les
 * rôles s'additionnent, donc la barre s'allonge au lieu de basculer de mode.
 *
 * Accessible dès le dépôt du dossier, pas seulement après approbation : le
 * commerçant peut préparer son catalogue pendant l'examen, ses produits
 * restant invisibles du public tant que la boutique n'est pas approuvée. Le
 * bandeau d'attente le dit explicitement — sans lui, publier un produit qui
 * n'apparaît nulle part passerait pour une panne.
 */
export default function MerchantSpaceScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const skeletonTileWidth = screenWidth / 3 - GRID_GAP;
  const { isReady } = useRequireAuth('/(app)/(tabs)/shop');
  const { me, can } = useMe();

  const [filter, setFilter] = useState<ProductAvailabilityFilter>('all');
  const { data: stats } = useMerchantStats();
  const { data: products, isLoading, isError, refetch } = useOwnProducts(filter);

  if (!isReady) return <View className="flex-1 bg-white" />;

  // Le compte n'a pas de boutique : on ne montre pas un espace vide, on
  // renvoie vers le dépôt de dossier.
  if (me && !me.merchant) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <EmptyState
          icon="storefront-outline"
          title="Vous n'avez pas encore de boutique"
          description="Ouvrez votre boutique pour publier vos produits sur Luuma."
          actionLabel="Ouvrir une boutique"
          onAction={() => router.replace('/(app)/merchant/onboarding')}
        />
      </SafeAreaView>
    );
  }

  const isPending = me?.merchant?.state === 'pending';
  const isRejected = me?.merchant?.state === 'rejected';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Pas de flèche de retour : un onglet est une racine de navigation,
          pas un écran empilé. */}
      <View className="border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Text numberOfLines={1} className="text-lg font-bold text-gray-900">
          {me?.merchant?.shopName ?? 'Ma boutique'}
        </Text>
      </View>

      <ScrollView contentContainerClassName="pb-24">
        {isPending ? (
          <View className="mx-3.5 mt-3 flex-row gap-2.5 rounded-xl bg-amber-50 p-3">
            <Ionicons name="time-outline" size={18} color="#B45309" />
            <Text className="flex-1 text-[12px] leading-[17px] text-amber-900">
              Votre boutique est en cours de validation. Vous pouvez déjà créer
              vos produits : ils resteront invisibles des acheteurs jusqu'à
              l'approbation.
            </Text>
          </View>
        ) : null}

        {isRejected ? (
          <View className="mx-3.5 mt-3 flex-row gap-2.5 rounded-xl bg-red-50 p-3">
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text className="flex-1 text-[12px] leading-[17px] text-red-900">
              Votre dossier a été refusé. Contactez le support pour connaître les
              corrections attendues.
            </Text>
          </View>
        ) : null}

        <View className="flex-row border-b border-gray-100 px-3.5 py-4">
          <Stat value={stats?.productCount ?? 0} label="Produits" />
          <Stat value={stats?.followersCount ?? 0} label="Abonnés" />
          <Stat value={stats?.toPrepareCount ?? 0} label="À préparer" />
          <Stat value={stats?.soldCount ?? 0} label="Vendus" />
        </View>

        <View className="flex-row gap-2 px-3.5 py-3">
          <Pressable
            onPress={() => router.push('/(app)/merchant/packages')}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2.5"
          >
            <Ionicons name="cube-outline" size={15} color={colors.text} />
            <Text className="text-[12.5px] font-semibold text-gray-900">
              Mes colis
            </Text>
            {stats && stats.toPrepareCount > 0 ? (
              <View className="ml-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="text-[10px] font-bold text-white">
                  {stats.toPrepareCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/merchant/products/new')}
            disabled={!can.publishProduct}
            className={[
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5',
              can.publishProduct ? 'bg-primary' : 'bg-gray-200',
            ].join(' ')}
          >
            <Ionicons name="add" size={17} color={colors.white} />
            <Text className="text-[12.5px] font-semibold text-white">
              Nouveau produit
            </Text>
          </Pressable>
        </View>

        <View className="flex-row gap-2 px-3.5 pb-3">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                className={[
                  'rounded-full px-3 py-1.5',
                  active ? 'bg-gray-900' : 'bg-gray-100',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-[12px] font-semibold',
                    active ? 'text-white' : 'text-gray-600',
                  ].join(' ')}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <View className="flex-row flex-wrap px-[1px]">
            {Array.from({ length: 9 }).map((_, index) => (
              <View key={index} style={{ width: '33.333%', padding: GRID_GAP / 2 }}>
                <ProductCellSkeleton width={skeletonTileWidth} />
              </View>
            ))}
          </View>
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Chargement impossible"
            description="Vérifiez votre connexion puis réessayez."
            actionLabel="Réessayer"
            onAction={() => void refetch()}
          />
        ) : !products || products.data.length === 0 ? (
          <EmptyState
            icon="pricetags-outline"
            title={
              filter === 'all'
                ? 'Aucun produit'
                : filter === 'available'
                  ? 'Aucun produit en vente'
                  : 'Aucun produit retiré'
            }
            description={
              filter === 'all'
                ? 'Publiez votre premier produit pour que les acheteurs le découvrent.'
                : undefined
            }
            actionLabel={filter === 'all' ? 'Créer un produit' : undefined}
            onAction={
              filter === 'all'
                ? () => router.push('/(app)/merchant/products/new')
                : undefined
            }
          />
        ) : (
          <View className="flex-row flex-wrap px-[1px]">
            {products.data.map((product) => (
              <ProductCell key={product.id} product={product} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
