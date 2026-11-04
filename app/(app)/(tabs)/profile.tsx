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
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * Libellés par état de dossier.
 *
 * Quatre états et non un booléen : « pas de boutique » et « boutique
 * refusée » demandent deux messages opposés — on invite le premier à
 * s'inscrire, on doit une explication au second.
 */
export default function ProfileScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuth();

  const merchantBadges: Record<ProfileState, string> = {
    none: t('Commerçant', 'Seller'),
    pending: t('Boutique en attente', 'Shop pending'),
    approved: t('Commerçant', 'Seller'),
    rejected: t('Dossier refusé', 'Application rejected'),
  };
  const gpBadges: Record<ProfileState, string> = {
    none: t('GP', 'Traveler'),
    pending: t('GP en attente', 'Traveler profile pending'),
    approved: t('GP', 'Traveler'),
    rejected: t('Dossier refusé', 'Application rejected'),
  };
  const merchantRows: Record<ProfileState, { title: string; subtitle: string }> = {
    none: { title: t('Ouvrir une boutique', 'Open a shop'), subtitle: t('Vendez à la diaspora', 'Sell to the diaspora') },
    pending: {
      title: t('Ma boutique', 'My shop'),
      subtitle: t('Dossier en cours d’examen — préparez déjà vos produits', 'Application under review — start preparing your products'),
    },
    approved: { title: t('Ma boutique', 'My shop'), subtitle: t('Produits, commandes, ventes', 'Products, orders, sales') },
    rejected: {
      title: t('Dossier refusé', 'Application rejected'),
      subtitle: t('Consultez le motif et déposez un nouveau dossier', 'Check the reason and submit a new application'),
    },
  };
  const gpRows: Record<ProfileState, { title: string; subtitle: string }> = {
    none: { title: t('Devenir GP', 'Become a traveler'), subtitle: t('Rentabilisez vos kilos', 'Earn from your spare luggage capacity') },
    pending: {
      title: t('Mon espace GP', 'My traveler space'),
      subtitle: t('Dossier en cours d’examen — préparez déjà vos trajets', 'Application under review — start preparing your trips'),
    },
    approved: { title: t('Mon espace GP', 'My traveler space'), subtitle: t('Trajets, colis, gains', 'Trips, packages, earnings') },
    rejected: {
      title: t('Dossier refusé', 'Application rejected'),
      subtitle: t('Consultez le motif et déposez un nouveau dossier', 'Check the reason and submit a new application'),
    },
  };

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
          title={t('Votre espace Luuma', 'Your Luuma space')}
          description={t(
            'Créez un compte pour commander, suivre vos colis, et vendre ou transporter à votre tour.',
            'Create an account to order, track your packages, and start selling or delivering.',
          )}
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
        <Text className="text-lg font-bold text-gray-900">{t('Profil', 'Profile')}</Text>
        <Pressable
          className="ml-auto h-9 w-9 items-center justify-center rounded-full bg-gray-100"
          accessibilityRole="button"
          accessibilityLabel={t('Paramètres', 'Settings')}
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
            <RoleBadge label={t('Client', 'Customer')} />
            {me?.merchant ? (
              <RoleBadge
                label={merchantBadges[me.merchant.state]}
                muted={me.merchant.state !== 'approved'}
              />
            ) : null}
            {me?.gp ? (
              <RoleBadge
                label={gpBadges[me.gp.state]}
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
                {t('Vérifiez votre email', 'Verify your email')}
              </Text>
              <Text className="mt-0.5 text-[10.5px] text-amber-800">
                {t('Nécessaire pour payer une commande', 'Required to pay for an order')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#7A5C00" />
          </Pressable>
        ) : null}

        <SettingsGroup label={t('Mon activité', 'My activity')} />
        <SettingsRow
          icon="cube-outline"
          title={t('Mes commandes', 'My orders')}
          subtitle={
            orderCount > 0
              ? t(
                  `${orderCount} commande${orderCount > 1 ? 's' : ''}`,
                  `${orderCount} order${orderCount > 1 ? 's' : ''}`,
                )
              : t('Aucune pour le moment', 'None yet')
          }
          onPress={() => router.push('/(app)/orders')}
        />
        <SettingsRow
          icon="heart-outline"
          title={t('Mes favoris', 'My favorites')}
          subtitle={
            favorites?.length
              ? t(
                  `${favorites.length} produit${favorites.length > 1 ? 's' : ''}`,
                  `${favorites.length} product${favorites.length > 1 ? 's' : ''}`,
                )
              : t('Aucun favori', 'No favorites')
          }
          onPress={() => router.push('/(app)/favorites')}
        />
        <SettingsRow
          icon="notifications-outline"
          title={t('Mes abonnements', 'Following')}
          subtitle={
            followCount > 0
              ? t(
                  `${following?.merchants.length ?? 0} boutique(s) · ${following?.gps.length ?? 0} GP`,
                  `${following?.merchants.length ?? 0} shop${following?.merchants.length === 1 ? '' : 's'} · ${following?.gps.length ?? 0} traveler${following?.gps.length === 1 ? '' : 's'}`,
                )
              : t('Aucun abonnement', 'Not following anyone')
          }
          onPress={() => router.push('/(app)/following')}
        />

        <SettingsGroup label={t('Vendre ou transporter', 'Sell or deliver')} />
        {/* Sans dossier, l'entrée mène à l'inscription ; avec, à l'espace
            commerçant — y compris quand le dossier est encore en attente,
            puisque le catalogue peut se préparer pendant l'examen. */}
        <SettingsRow
          icon="storefront-outline"
          title={
            me?.merchant
              ? merchantRows[me.merchant.state].title
              : t('Ouvrir une boutique', 'Open a shop')
          }
          subtitle={
            me?.merchant
              ? merchantRows[me.merchant.state].subtitle
              : can.openShop
                ? t('Vendez à la diaspora', 'Sell to the diaspora')
                : t('Vérifiez votre email pour ouvrir une boutique', 'Verify your email to open a shop')
          }
          onPress={() =>
            router.push(
              me?.merchant ? '/(app)/(tabs)/shop' : '/(app)/merchant/onboarding',
            )
          }
        />

        <SettingsRow
          icon="airplane-outline"
          title={me?.gp ? gpRows[me.gp.state].title : t('Devenir GP', 'Become a traveler')}
          subtitle={
            me?.gp
              ? gpRows[me.gp.state].subtitle
              : can.becomeGp
                ? t('Rentabilisez vos kilos', 'Earn from your spare luggage capacity')
                : t('Vérifiez votre email pour devenir GP', 'Verify your email to become a traveler')
          }
          onPress={() =>
            router.push(me?.gp ? '/(app)/(tabs)/gp' : '/(app)/gp/onboarding')
          }
        />

        {can.administrate && (
          <SettingsRow
            icon="shield-checkmark-outline"
            title={t('Administration', 'Administration')}
            subtitle={t('Un code par email sera demandé', 'An email code will be required')}
            onPress={() => router.push('/(app)/admin')}
          />
        )}

        <SettingsGroup label={t('Aide', 'Help')} />
        <SettingsRow icon="chatbubble-ellipses-outline" title={t("Centre d'aide", 'Help center')} disabled />
        <SettingsRow icon="alert-circle-outline" title={t('Signaler un litige', 'Report an issue')} disabled />
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
