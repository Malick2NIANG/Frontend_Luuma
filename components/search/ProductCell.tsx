import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { formatXof } from '@/lib/format';
import type { SearchProduct } from '@/hooks/useSearch';

/**
 * Vignette de résultat, en grille à deux colonnes.
 *
 * La grille reste le bon format ICI, contrairement au fil : on cherche un
 * article précis, on compare des prix, on balaie vite. Le fil, lui, se
 * parcourt sans intention — d'où le format pleine largeur qui donne sa place
 * au compte.
 */
export function ProductCell({
  product,
  width,
}: {
  product: SearchProduct;
  width: number;
}) {
  const router = useRouter();
  const cover = product.images[0];
  const imageHeight = width * 1.15;

  return (
    <Pressable
      onPress={() => router.push(`/(app)/products/${product.id}`)}
      style={{ width }}
      className="mb-2 overflow-hidden rounded-xl bg-white"
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          contentFit="cover"
          transition={160}
          style={{ width, height: imageHeight }}
        />
      ) : (
        <View
          style={{ width, height: imageHeight }}
          className="items-center justify-center bg-gray-100"
        >
          <Ionicons name="image-outline" size={26} color="#9CA3AF" />
        </View>
      )}

      <View className="px-2 pb-2 pt-1.5">
        <Text className="text-[13px] font-extrabold text-primary">
          {formatXof(product.price)}
        </Text>
        <Text numberOfLines={2} className="mt-0.5 text-[11px] leading-4 text-gray-700">
          {product.name}
        </Text>

        <View className="mt-1.5 flex-row items-center gap-1">
          <Avatar name={product.merchant.shopName} size={15} />
          <Text numberOfLines={1} className="flex-1 text-[9px] text-gray-500">
            {product.merchant.shopName}
          </Text>
          {product.merchant.totalReviews > 0 && (
            <>
              <Ionicons name="star" size={8} color={colors.gold} />
              <Text className="text-[9px] text-gray-500">
                {product.merchant.rating.toFixed(1)}
              </Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}
