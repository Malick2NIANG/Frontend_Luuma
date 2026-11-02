import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthPrompt } from '@/components/AuthPrompt';
import { Avatar } from '@/components/ui/Avatar';
import { SettingsGroup, SettingsRow } from '@/components/ui/SettingsRow';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useFollowing } from '@/hooks/useFollow';
import { useMe, type ProfileState } from '@/hooks/useMe';
import { useOrders } from '@/hooks/useOrders';

/**
 * Libellés par état de dossier.
 *
 * Quatre états et non un booléen : « pas de boutique » et « boutique
 * refusée » demandent deux messages opposés — on invite le premier à
 * s'inscrire, on doit une explication au second.
 */
const MERCHANT_BADGES: Record<ProfileState, string> = {
  none: 'Commerçant',
  pending: 'Boutique en attente',
  approved: 'Commerçant',
  rejected: 'Dossier refusé',
};

const GP_BADGES: Record<ProfileState, string> = {
  none: 'GP',
  pending: 'GP en attente',
  approved: 'GP',
  rejected: 'Dossier refusé',
};

const MERCHANT_ROWS: Record<ProfileState, { title: string; subtitle: string }> = {
  none: { title: 'Ouvrir une boutique', subtitle: 'Vendez à la diaspora' },
  pending: {
    title: 'Ma boutique',
    subtitle: 'Dossier en cours d’examen — préparez déjà vos produits',
  },
  approved: { title: 'Ma boutique', subtitle: 'Produits, commandes, ventes' },
  rejected: {
    title: 'Dossier refusé',
    subtitle: 'Consultez le motif et déposez un nouveau dossier',
  },
};

const GP_ROWS: Record<ProfileState, { title: string; subtitle: string }> = {
  none: { title: 'Devenir GP', subtitle: 'Rentabilisez vos kilos' },
  pending: {
    title: 'Mon espace GP',
    subtitle: 'Dossier en cours d’examen — préparez déjà vos trajets',
  },
  approved: { title: 'Mon espace GP', subtitle: 'Trajets, colis, gains' },
  rejected: {
    title: 'Dossier refusé',
    subtitle: 'Consultez le motif et déposez un nouveau dossier',
  },
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuth();

  const { data: orders } = useOrders(isAuthenticated);
  const { data: favorites } = useFavorites();
  const { data: following } = useFollowing(isAuthenticated);
  const { me, can } = useMe();

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
          icon="person-circle-outline"
          title="Votre espace Luuma"
          description="Créez un compte pour commander, suivre vos colis, et vendre ou transporter à votre tour."
          returnTo="/(app)/(tabs)/profile"
        />
      </SafeAreaView>
    );
  }

  const orderCount = orders?.data.length ?? 0;
  const followCount =
    (following?.merchants.length ?? 0) + (following?.gps.length ?? 0);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center border-b border-gray-100 px-4 pb-2.5 pt-1">
        <Text className="text-lg font-bold text-gray-900">Profil</Text>
        <Pressable
          className="ml-auto h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          onPress={() => router.push('/(app)/settings')}
        >
          <Ionicons name="settings-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="pb-8">
        <View className="items-center px-4 pb-3.5 pt-4">
          <Avatar uri={user?.avatar} name={user?.name} size={76} />
          <Text className="mt-2.5 text-base font-bold text-gray-900">
            {user?.name ?? '—'}
          </Text>
          <Text className="mt-0.5 text-[11px] text-gray-500">{user?.email}</Text>
          {user?.phone ? (
            <Text className="text-[11px] text-gray-500">{user.phone}</Text>
          ) : null}

          {/* « Client » est toujours là : le rôle est posé à l'inscription et
              les casquettes s'ajoutent — un commerçant reste un acheteur. */}
          <View className="mt-2.5 flex-row flex-wrap justify-center gap-1.5">
            <RoleBadge label="Client" />
            {me?.merchant ? (
              <RoleBadge
                label={MERCHANT_BADGES[me.merchant.state]}
                muted={me.merchant.state !== 'approved'}
              />
            ) : null}
            {me?.gp ? (
              <RoleBadge
                label={GP_BADGES[me.gp.state]}
                muted={me.gp.state !== 'approved'}
              />
            ) : null}
          </View>
        </View>

        {/* L'email non vérifié bloque le paiement : le rappeler ici évite de
            le découvrir au moment de payer, quand la commande est prête. */}
        {user && !user.emailVerified ? (
          <Pressable
            onPress={() => router.push('/(app)/settings')}
            className="mx-3.5 mb-1 flex-row items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5"
          >
            <Ionicons name="mail-outline" size={19} color="#7A5C00" />
            <View className="flex-1">
              <Text className="text-xs font-bold text-amber-900">
                Vérifiez votre email
              </Text>
              <Text className="mt-0.5 text-[10.5px] text-amber-800">
                Nécessaire pour payer une commande
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#7A5C00" />
          </Pressable>
        ) : null}

        <SettingsGroup label="Mon activité" />
        <SettingsRow
          icon="cube-outline"
          title="Mes commandes"
          subtitle={
            orderCount > 0
              ? `${orderCount} commande${orderCount > 1 ? 's' : ''}`
              : 'Aucune pour le moment'
          }
          onPress={() => router.push('/(app)/orders')}
        />
        <SettingsRow
          icon="heart-outline"
          title="Mes favoris"
          subtitle={
            favorites?.length
              ? `${favorites.length} produit${favorites.length > 1 ? 's' : ''}`
              : 'Aucun favori'
          }
          onPress={() => router.push('/(app)/favorites')}
        />
        <SettingsRow
          icon="notifications-outline"
          title="Mes abonnements"
          subtitle={
            followCount > 0
              ? `${following?.merchants.length ?? 0} boutique(s) · ${
                  following?.gps.length ?? 0
                } GP`
              : 'Aucun abonnement'
          }
          onPress={() => router.push('/(app)/following')}
        />

        <SettingsGroup label="Vendre ou transporter" />
        {/* Sans dossier, l'entrée mène à l'inscription ; avec, à l'espace
            commerçant — y compris quand le dossier est encore en attente,
            puisque le catalogue peut se préparer pendant l'examen. */}
        <SettingsRow
          icon="storefront-outline"
          title={
            me?.merchant
              ? MERCHANT_ROWS[me.merchant.state].title
              : 'Ouvrir une boutique'
          }
          subtitle={
            me?.merchant
              ? MERCHANT_ROWS[me.merchant.state].subtitle
              : can.openShop
                ? 'Vendez à la diaspora'
                : 'Vérifiez votre email pour ouvrir une boutique'
          }
          onPress={() =>
            router.push(
              me?.merchant ? '/(app)/(tabs)/shop' : '/(app)/merchant/onboarding',
            )
          }
        />

        <SettingsRow
          icon="airplane-outline"
          title={me?.gp ? GP_ROWS[me.gp.state].title : 'Devenir GP'}
          subtitle={
            me?.gp
              ? GP_ROWS[me.gp.state].subtitle
              : can.becomeGp
                ? 'Rentabilisez vos kilos'
                : 'Vérifiez votre email pour devenir GP'
          }
          onPress={() =>
            router.push(me?.gp ? '/(app)/(tabs)/gp' : '/(app)/gp/onboarding')
          }
        />

        {can.administrate && (
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Administration"
            subtitle="Un code par email sera demandé"
            onPress={() => router.push('/(app)/admin')}
          />
        )}

        <SettingsGroup label="Aide" />
        <SettingsRow icon="chatbubble-ellipses-outline" title="Centre d'aide" disabled />
        <SettingsRow icon="alert-circle-outline" title="Signaler un litige" disabled />
      </ScrollView>
    </SafeAreaView>
  );
}

function RoleBadge({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <View
      className={[
        'rounded-full px-2.5 py-1',
        muted ? 'bg-amber-50' : 'bg-emerald-50',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[10px] font-semibold',
          muted ? 'text-amber-800' : 'text-primary',
        ].join(' ')}
      >
        {label}
      </Text>
    </View>
  );
}
