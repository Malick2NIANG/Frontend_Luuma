import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthPrompt } from '@/components/AuthPrompt';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useOrders, type OrderDetail } from '@/hooks/useOrders';
import { formatEur, formatRelative, formatWeight } from '@/lib/format';

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useOrders(isAuthenticated);
  const orders = data?.data ?? [];

  if (!isHydrated) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <AuthPrompt
          icon="receipt-outline"
          title="Suivez vos commandes"
          description="Créez un compte pour commander et suivre vos colis jusqu'à la livraison."
          returnTo="/(app)/orders"
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-4 pb-2 pt-1">
        <Text className="text-2xl font-bold text-gray-900">Mes commandes</Text>
      </View>

      {isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Connexion impossible"
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Aucune commande"
          description="Vos commandes et leur suivi apparaîtront ici."
          actionLabel="Parcourir le catalogue"
          onAction={() => router.push('/(app)/(tabs)')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order: OrderDetail) => order.id}
          contentContainerClassName="px-4 pt-2 pb-6"
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          renderItem={({ item }) => (
            <OrderRow
              order={item}
              onPress={() => router.push(`/(app)/orders/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function OrderRow({
  order,
  onPress,
}: {
  order: OrderDetail;
  onPress: () => void;
}) {
  const totalWeight = order.packages.reduce((sum, p) => sum + p.weight, 0);
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  // Un colis refusé ne fait pas échouer la commande, mais l'utilisateur doit
  // le voir sans avoir à ouvrir le détail.
  const refusedCount = order.packages.filter(
    (p) => p.status === 'REFUSED',
  ).length;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl border border-gray-100 p-4"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">
            {itemCount} article{itemCount > 1 ? 's' : ''} ·{' '}
            {order.packages.length} colis
          </Text>
          <Text className="mt-0.5 text-xs text-gray-500">
            {order.deliveryCity}, {order.deliveryCountry} ·{' '}
            {formatRelative(order.createdAt)}
          </Text>
        </View>
        <Badge status={order.status} />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs text-gray-500">
          {formatWeight(totalWeight)}
        </Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-base font-bold text-primary">
            {formatEur(order.totalEur)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      </View>

      {refusedCount > 0 && (
        <View className="mt-2 flex-row items-center gap-1.5 border-t border-gray-100 pt-2">
          <Ionicons name="alert-circle-outline" size={14} color="#B45309" />
          <Text className="text-xs text-amber-700">
            {refusedCount} colis refusé{refusedCount > 1 ? 's' : ''} et
            remboursé{refusedCount > 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
