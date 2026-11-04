import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { MediaCarousel } from '@/components/media/MediaCarousel';
import { PostHeader } from '@/components/feed/PostHeader';
import { ExpandableText } from '@/components/ui/ExpandableText';
import { colors } from '@/constants/colors';
import { CATEGORY_SHORT_LABELS } from '@/constants/categories';
import { formatEur, formatWeight, formatXof } from '@/lib/format';
import { useAppLanguage } from '@/lib/appLanguage';
import type { FeedAuthor, FeedProduct } from '@/types/feed.types';

const CATEGORY_LABELS_EN: Record<FeedProduct['category'], string> = {
  VETEMENTS: 'Clothing',
  CHAUSSURES: 'Shoes',
  BIJOUX_ACCESSOIRES: 'Jewelry',
  ALIMENTAIRE: 'Food',
  COSMETIQUES: 'Cosmetics',
  ARTISANAT_DECO: 'Crafts',
  ENFANT_BEBE: 'Kids',
  MAISON: 'Home',
  LIVRES_CULTURE: 'Books',
  AUTRE: 'Other',
};

export interface ProductPostProps {
  product: FeedProduct;
  author: FeedAuthor;
  publishedAt: string;
}

/**
 * Une publication produit dans le fil.
 *
 * Volontairement pauvre en actions : un seul bouton, « Voir plus ». Le fil se
 * parcourt, il ne sert pas à décider — ajouter au panier depuis ici obligeait
 * à choisir une taille sans avoir vu la fiche, et multipliait les libellés de
 * bouton selon le type de produit. Tout ce qui engage (favori, panier,
 * déclinaisons, avis, devise) vit désormais sur la fiche.
 */
export function ProductPost({ product, author, publishedAt }: ProductPostProps) {
  const router = useRouter();
  const { t } = useAppLanguage();
  const detailPath = `/(app)/products/${product.id}`;

  const openDetail = () => router.push(detailPath);

  return (
    <View className="border-b border-gray-100 bg-white pb-2">
      <PostHeader author={author} publishedAt={publishedAt} />

      <Pressable onPress={openDetail}>
        <MediaCarousel media={product.images} aspectRatio={4 / 3} />
      </Pressable>

      <Pressable className="mt-2.5 px-3" onPress={openDetail}>
        <View className="flex-row items-baseline gap-2">
          <Text className="text-[17px] font-extrabold text-primary">
            {formatXof(product.price)}
          </Text>
          {product.priceEur != null && (
            <Text className="text-[11px] text-gray-400">
              ≈ {formatEur(product.priceEur)}
            </Text>
          )}
        </View>

        <Text
          numberOfLines={2}
          className="mt-0.5 text-[13px] font-medium leading-5 text-gray-900"
        >
          {product.name}
        </Text>
      </Pressable>

      {/* Hors de la zone qui navigue : le « plus » de la description déplie
          sur place, il n'ouvre pas la fiche. Imbriqué, il aurait fait les deux. */}
      {product.description ? (
        <View className="mt-1 px-3">
          <ExpandableText text={product.description} lines={2} />
        </View>
      ) : null}

      <Pressable className="mt-2 px-3" onPress={openDetail}>
        <View className="flex-row flex-wrap gap-1.5">
          {/* Le poids est mis au même rang que la catégorie parce qu'il est
              décisif ici : c'est lui qui fixe le prix du transport par le GP. */}
          <Tag icon="scale-outline" label={formatWeight(product.weight)} />
          <Tag
            label={t(
              CATEGORY_SHORT_LABELS[product.category],
              CATEGORY_LABELS_EN[product.category],
            )}
          />
          {product.subCategory ? <Tag label={product.subCategory} /> : null}
        </View>
      </Pressable>

      <Pressable
        onPress={openDetail}
        accessibilityRole="button"
        accessibilityLabel={t(`Voir ${product.name}`, `View ${product.name}`)}
        className="mx-3 mb-1 mt-2.5 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
      >
        <Text className="text-[13px] font-bold text-white">
          {t('Voir plus', 'View more')}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={colors.white} />
      </Pressable>
    </View>
  );
}

function Tag({
  icon,
  label,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
      {icon ? <Ionicons name={icon} size={10} color="#6B7280" /> : null}
      <Text className="text-[10px] text-gray-500">{label}</Text>
    </View>
  );
}
