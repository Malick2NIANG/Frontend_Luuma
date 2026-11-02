import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdminAccessGate } from '@/components/admin/AdminAccessGate';
import { colors } from '@/constants/colors';
import { useAdminStats } from '@/hooks/useAdmin';
import {
  useAdminAccessState,
  useRevokeAdminAccess,
} from '@/hooks/useAdminAccess';
import { useGoBack } from '@/hooks/useGoBack';
import { useMe } from '@/hooks/useMe';

/**
 * Espace d'administration.
 *
 * Deux conditions, et elles ne disent pas la même chose : `can.administrate`
 * dit que ce COMPTE a le droit, l'élévation dit que cette SESSION l'a prouvé
 * à l'instant par un code reçu par email.
 *
 * Aucune des deux n'est une protection en soi — le serveur refuse les routes
 * sans élévation, que cet écran existe ou non. Ce qui se joue ici est
 * l'expérience : montrer un écran de code plutôt que des erreurs 403.
 */
export default function AdminScreen() {
  const { me, can, isLoading: meLoading } = useMe();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/profile');

  const isAdmin = can.administrate;
  const access = useAdminAccessState(isAdmin);
  const elevated = access.data?.elevated ?? false;

  const stats = useAdminStats(elevated);
  const revoke = useRevokeAdminAccess();

  if (meLoading || (isAdmin && access.isLoading)) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Quelqu'un qui n'est pas administrateur n'a pas à savoir que cet écran
  // existe : on le renvoie au profil sans explication.
  if (!me || !isAdmin) {
    return <Redirect href="/(app)/(tabs)/profile" />;
  }

  if (!elevated) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <AdminAccessGate
          onCancel={goBack}
          codePending={access.data?.codePending ?? false}
          resendInSeconds={access.data?.resendInSeconds ?? 0}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Revenir au profil"
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">Administration</Text>
        {/* Refermer l'espace sans se déconnecter : sur un poste partagé, on
            veut rendre l'ordinateur, pas perdre sa session. */}
        <Pressable
          onPress={() => {
            revoke.mutate(undefined, { onSuccess: goBack });
          }}
          disabled={revoke.isPending}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Quitter l'espace d'administration"
        >
          <Ionicons name="lock-closed-outline" size={22} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {stats.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : stats.isError ? (
          <Text className="text-center text-sm text-red-500">
            Impossible de charger les statistiques.
          </Text>
        ) : stats.data ? (
          <>
            <View className="gap-3">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Dossiers en attente
              </Text>
              <View className="flex-row gap-3">
                <PendingCard
                  icon="storefront-outline"
                  label="Commerçants"
                  count={stats.data.merchants.pending}
                  onPress={() => router.push('/(app)/admin/applications')}
                />
                <PendingCard
                  icon="airplane-outline"
                  label="GP"
                  count={stats.data.gps.pending}
                  onPress={() => router.push('/(app)/admin/applications')}
                />
              </View>
            </View>

            <View className="gap-3">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Plateforme
              </Text>
              <View className="rounded-2xl bg-white p-4">
                <StatRow label="Comptes" value={stats.data.users} />
                <StatRow
                  label="Boutiques validées"
                  value={stats.data.merchants.approved}
                />
                <StatRow label="GP validés" value={stats.data.gps.approved} />
                <StatRow label="Produits en ligne" value={stats.data.products} />
                <StatRow label="Trajets à venir" value={stats.data.activeTrips} />
                <StatRow
                  label="Colis refusés"
                  value={stats.data.refusedPackages}
                />
                <StatRow
                  label="Sous séquestre"
                  value={`${stats.data.escrowHeldEur.toFixed(2)} €`}
                  last
                />
              </View>
            </View>

            {/* Ce que l'administration ne sait PAS encore faire. L'écrire
                évite de chercher un écran qui n'existe pas, et tient la
                liste de ce qui reste à construire. */}
            <Text className="px-1 text-[12px] leading-4 text-gray-400">
              Consulter les comptes, les commandes et les litiges, ou
              suspendre un compte, n'est pas encore possible : ces routes
              n'existent pas côté serveur.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingCard({
  icon,
  label,
  count,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  onPress: () => void;
}) {
  const waiting = count > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} dossier${count > 1 ? 's' : ''} ${label} en attente`}
      className="flex-1 gap-2 rounded-2xl bg-white p-4"
    >
      <View className="flex-row items-center gap-2">
        <Ionicons
          name={icon}
          size={18}
          color={waiting ? colors.primary : '#9CA3AF'}
        />
        <Text className="text-[12px] text-gray-500">{label}</Text>
      </View>
      <Text
        className={[
          'text-2xl font-bold',
          waiting ? 'text-primary' : 'text-gray-300',
        ].join(' ')}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function StatRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: number | string;
  last?: boolean;
}) {
  return (
    <View
      className={[
        'flex-row items-center justify-between py-2.5',
        last ? '' : 'border-b border-gray-50',
      ].join(' ')}
    >
      <Text className="text-[13.5px] text-gray-600">{label}</Text>
      <Text className="text-[13.5px] font-semibold text-gray-900">{value}</Text>
    </View>
  );
}
