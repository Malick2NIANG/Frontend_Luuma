import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useOrderChat } from '@/hooks/useChat';
import { useCancelOrder, useOrder } from '@/hooks/useOrders';
import { formatDate, formatEur, formatWeight } from '@/lib/format';
import type { PackageStatus } from '@/types/api.types';

/** Étapes visibles par le client, dans l'ordre du parcours réel d'un colis. */
const PACKAGE_STEPS: { status: PackageStatus; label: string }[] = [
  { status: 'AWAITING_DROPOFF', label: 'En préparation' },
  { status: 'DROPPED_OFF', label: 'Déposé chez le GP' },
  { status: 'RECEIVED_BY_GP', label: 'Réceptionné' },
  { status: 'IN_TRANSIT', label: 'En voyage' },
  { status: 'DELIVERED', label: 'Livré' },
];

const PACKAGE_LABELS: Record<PackageStatus, string> = {
  AWAITING_DROPOFF: 'En préparation',
  DROPPED_OFF: 'Déposé chez le GP',
  RECEIVED_BY_GP: 'Réceptionné',
  IN_TRANSIT: 'En voyage',
  DELIVERED: 'Livré',
  REFUSED: 'Refusé par le GP',
  CANCELLED: 'Annulé',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/orders');

  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const { data: chat } = useOrderChat(id);
  const cancelOrder = useCancelOrder();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <EmptyState
          icon="alert-circle-outline"
          title="Commande introuvable"
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const canCancel =
    (order.status === 'PENDING' || order.status === 'CONFIRMED') &&
    order.packages.every(
      (p) => p.status === 'AWAITING_DROPOFF' || p.status === 'CANCELLED',
    );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-1 flex-row items-center gap-3">
          <Pressable
            onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Retour"
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">Commande</Text>
        </View>

        {chat?.chatId && (
          <Pressable
            onPress={() => router.push(`/(app)/chat/${chat.chatId}`)}
            className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
          >
            <Ionicons name="chatbubble-outline" size={19} color={colors.text} />
            {chat.unread > 0 && (
              <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
                <Text className="text-[10px] font-bold text-white">
                  {chat.unread}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="pb-6">
        <View className="mb-4 flex-row items-center justify-between">
          <Badge status={order.status} />
          <Text className="text-lg font-bold text-primary">
            {formatEur(order.totalEur)}
          </Text>
        </View>

        <View className="mb-5 rounded-2xl bg-gray-50 p-4">
          <Text className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Livraison
          </Text>
          <Text className="mt-1 text-sm text-gray-900">
            {order.deliveryAddress}
          </Text>
          <Text className="text-sm text-gray-600">
            {order.deliveryCity}, {order.deliveryCountry}
          </Text>
          <Text className="mt-2 text-xs text-gray-500">
            Commandé le {formatDate(order.createdAt)}
          </Text>
        </View>

        <Text className="mb-3 text-sm font-semibold text-gray-900">
          Suivi des colis ({order.packages.length})
        </Text>

        {order.packages.map((pkg) => {
          const pkgItems = order.items.filter((i) => i.packageId === pkg.id);
          const isRefused = pkg.status === 'REFUSED';
          const currentStep = PACKAGE_STEPS.findIndex(
            (s) => s.status === pkg.status,
          );

          return (
            <View
              key={pkg.id}
              className={[
                'mb-3 rounded-2xl border p-4',
                isRefused ? 'border-red-200 bg-red-50' : 'border-gray-100',
              ].join(' ')}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {pkg.merchant.shopName}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {formatWeight(pkg.weight)} · {pkgItems.length} article
                    {pkgItems.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <Badge label={PACKAGE_LABELS[pkg.status]} />
              </View>

              {isRefused ? (
                <View className="mt-3 border-t border-red-200 pt-3">
                  <Text className="text-xs font-medium text-red-800">
                    Motif du refus
                  </Text>
                  <Text className="mt-0.5 text-xs text-red-700">
                    {pkg.refusalReason ?? 'Non précisé'}
                  </Text>
                  {/* Le refus d'un colis n'annule pas le reste de la commande :
                      le dire explicitement évite l'inquiétude. */}
                  <Text className="mt-2 text-xs text-red-700">
                    Ces articles vous ont été remboursés. Les autres colis
                    poursuivent leur acheminement.
                  </Text>
                </View>
              ) : (
                <View className="mt-3 border-t border-gray-100 pt-3">
                  {PACKAGE_STEPS.map((step, index) => {
                    const done = currentStep >= 0 && index <= currentStep;
                    return (
                      <View
                        key={step.status}
                        className="flex-row items-center gap-2 py-1"
                      >
                        <Ionicons
                          name={done ? 'checkmark-circle' : 'ellipse-outline'}
                          size={16}
                          color={done ? colors.accent : '#D1D5DB'}
                        />
                        <Text
                          className={[
                            'text-xs',
                            done ? 'text-gray-900' : 'text-gray-400',
                          ].join(' ')}
                        >
                          {step.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <View className="mt-3 border-t border-gray-100 pt-3">
                {pkgItems.map((item) => (
                  <View
                    key={item.id}
                    className="flex-row justify-between py-0.5"
                  >
                    <Text
                      numberOfLines={1}
                      className="flex-1 text-xs text-gray-600"
                    >
                      {item.quantity} × {item.product.name}
                    </Text>
                    <Text className="text-xs text-gray-700">
                      {formatEur(item.unitPrice * item.quantity)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <View className="mt-2 rounded-2xl bg-gray-50 p-4">
          <SummaryRow label="Produits" value={formatEur(order.subtotalEur)} />
          <SummaryRow label="Transport" value={formatEur(order.shippingEur)} />
          <SummaryRow
            label="Frais de service"
            value={formatEur(order.platformFeeEur)}
          />
          <View className="mt-2 flex-row justify-between border-t border-gray-200 pt-2">
            <Text className="text-sm font-semibold text-gray-900">Total</Text>
            <Text className="text-sm font-bold text-primary">
              {formatEur(order.totalEur)}
            </Text>
          </View>
        </View>

        {canCancel && (
          <Button
            variant="secondary"
            fullWidth
            loading={cancelOrder.isPending}
            className="mt-5"
            onPress={() => void cancelOrder.mutateAsync(order.id)}
          >
            Annuler la commande
          </Button>
        )}

        {cancelOrder.errorMessage ? (
          <Text className="mt-2 text-center text-xs text-red-600">
            {cancelOrder.errorMessage}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-0.5">
      <Text className="text-sm text-gray-700">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}
