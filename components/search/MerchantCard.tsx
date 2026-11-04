import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { RoleMark } from '@/components/ui/RoleMark';
import type { SearchMerchant } from '@/hooks/useSearch';
import { useAppLanguage } from '@/lib/appLanguage';

export function MerchantCard({ merchant }: { merchant: SearchMerchant }) {
  const router = useRouter();
  const { t } = useAppLanguage();

  return (
    <Pressable
      onPress={() => router.push(`/(app)/merchants/${merchant.id}`)}
      className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 py-3"
    >
      <Avatar uri={merchant.user.avatar} name={merchant.shopName} size={48} />

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} className="text-sm font-bold text-gray-900">
            {merchant.shopName}
          </Text>
          <RoleMark type="merchant" />
        </View>
        <Text className="mt-0.5 text-[11px] text-gray-500">
          {merchant.city}
          {merchant.totalReviews > 0
            ? ` · ★ ${merchant.rating.toFixed(1)} (${merchant.totalReviews})`
            : ` · ${t('Nouvelle boutique', 'New shop')}`}
          {` · ${merchant._count.products} ${t(
            merchant._count.products > 1 ? 'produits' : 'produit',
            merchant._count.products > 1 ? 'products' : 'product',
          )}`}
        </Text>
        {merchant.description ? (
          <Text numberOfLines={1} className="mt-0.5 text-[11px] text-gray-400">
            {merchant.description}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={17} color="#9CA3AF" />
    </Pressable>
  );
}
