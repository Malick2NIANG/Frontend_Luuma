import { useState } from 'react';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

import { useGoBack } from '@/hooks/useGoBack';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelpSheet } from '@/components/HelpSheet';
import { Button } from '@/components/ui/Button';
import { SettingsGroup, SettingsRow } from '@/components/ui/SettingsRow';
import { colors } from '@/constants/colors';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { useSetMarketingConsent } from '@/hooks/useLegal';
import { useMe } from '@/hooks/useMe';
import { findCountry } from '@/constants/countries';
import { useCurrencyStore } from '@/hooks/useCurrency';
import { useAppLanguage } from '@/lib/appLanguage';
import { useOnboardingStore } from '@/store/onboarding.store';

/**
 * Réglages.
 *
 * Les interrupteurs de notification sont pour l'instant purement locaux : le
 * module de notifications n'existe pas encore côté serveur. Les afficher sans
 * le dire laisserait croire que le choix est enregistré — d'où la mention
 * explicite en pied de section plutôt que des lignes grisées, qui donneraient
 * l'impression d'une application inachevée alors que le reste fonctionne.
 */
export default function SettingsScreen() {
  const goBack = useGoBack('/(app)/(tabs)/profile');
  const router = useRouter();
  const logout = useLogout();
  const { isAuthenticated, isHydrated } = useAuth();
  const devise = useCurrencyStore((s) => s.currency);
  const paysIso = useOnboardingStore((s) => s.pays);
  const zone = useOnboardingStore((s) => s.zone);
  const { me } = useMe();
  const setMarketingConsent = useSetMarketingConsent();
  const { t } = useAppLanguage();
  const paysLibelle = paysIso
    ? findCountry(paysIso).name
    : zone === 'ETRANGER'
      ? t('Autre pays', 'Other country')
      : t('Non renseigné', 'Not set');

  const [aideOuverte, setAideOuverte] = useState(false);
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyTrips, setNotifyTrips] = useState(true);
  const [notifyShops, setNotifyShops] = useState(false);

  if (!isHydrated) return <View className="flex-1 bg-white" />;

  // Une ligne partagée par les deux versions de l'écran.
  const ligneZone = (
    <SettingsRow
      icon="earth-outline"
      title={t('Pays et devise', 'Country and currency')}
      subtitle={`${paysLibelle} · ${devise}`}
      onPress={() => router.push('/onboarding?modifier=1')}
    />
  );

  const enTete = (
    <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
      <Pressable onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel={t('Retour', 'Back')} hitSlop={10}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text className="text-lg font-bold text-gray-900">{t('Réglages', 'Settings')}</Text>
    </View>
  );

  /** Pied de page commun : l'aide, puis la version — utile au support. */
  const piedDePage = (
    <View className="items-center px-3.5 pb-4 pt-8">
      <Pressable
        onPress={() => setAideOuverte(true)}
        accessibilityRole="button"
        hitSlop={8}
        className="flex-row items-center"
      >
        <Ionicons name="help-circle-outline" size={17} color={colors.primary} />
        <Text className="ml-1.5 text-sm font-semibold text-primary">
          {t("Besoin d'aide ?", 'Need help?')}
        </Text>
      </Pressable>
      <Text className="mt-3 text-xs text-gray-400">
        Luuma · {t('version', 'version')} {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
      <HelpSheet visible={aideOuverte} onClose={() => setAideOuverte(false)} />
    </View>
  );

  /**
   * Visiteur sans compte : les réglages ne lui sont plus fermés.
   *
   * L'accueil promet « pays et devise modifiables dans les paramètres » à
   * tout le monde, compte ou pas. On lui montre donc ce qui le concerne —
   * ses préférences et les documents légaux — et une entrée vers la
   * connexion pour le reste, au lieu de le renvoyer d'office au formulaire.
   */
  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {enTete}
        <ScrollView contentContainerClassName="pb-10">
          <SettingsGroup label={t('Préférences', 'Preferences')} />
          {ligneZone}

          <SettingsGroup label={t('À propos', 'About')} />
          <SettingsRow
            icon="document-text-outline"
            title={t('Conditions générales', 'Terms and conditions')}
            onPress={() => router.push('/legal/terms')}
          />
          <SettingsRow
            icon="lock-closed-outline"
            title={t('Politique de confidentialité', 'Privacy policy')}
            onPress={() => router.push('/legal/privacy')}
          />

          <View className="px-3.5 pb-2 pt-6">
            <Button
              fullWidth
              onPress={() =>
                router.push({
                  pathname: '/(auth)/login',
                  params: { returnTo: '/(app)/settings' },
                })
              }
            >
              {t('Se connecter', 'Log in')}
            </Button>
          </View>
          {piedDePage}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('Retour', 'Back')} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">{t('Réglages', 'Settings')}</Text>
      </View>

      <ScrollView contentContainerClassName="pb-10">
        <SettingsGroup label={t('Compte', 'Account')} />
        <SettingsRow
          icon="person-outline"
          title={t('Informations personnelles', 'Personal information')}
          subtitle={t('Nom, téléphone, photo', 'Name, phone, photo')}
          disabled
        />
        <SettingsRow
          icon="location-outline"
          title={t('Adresses de livraison', 'Delivery addresses')}
          subtitle={t(
            'Proposées au moment de commander',
            'Offered at checkout',
          )}
          onPress={() => router.push('/(app)/addresses')}
        />
        {/* Lit `me.emailVerified` (serveur), pas `user.emailVerified` (magasin
            local) : c'est la même donnée que consulte la garde bloquante de
            `(app)/_layout.tsx`, et les deux doivent s'accorder. Le magasin est
            posé une fois à la connexion et ne se met à jour qu'à des moments
            précis (nouvelle connexion, vérification réussie) — une seule
            source qui dérive silencieusement suffit à afficher ici le
            contraire de ce que la garde affiche. Si `me` n'est pas encore
            connu, la ligne ne dit rien plutôt que d'affirmer l'un ou l'autre. */}
        {me && !me.emailVerified ? (
          <SettingsRow
            icon="mail-outline"
            title={t('Vérifier mon email', 'Verify my email')}
            subtitle={t('Nécessaire pour payer une commande', 'Required to pay for an order')}
            disabled
          />
        ) : null}

        <SettingsGroup label={t('Sécurité', 'Security')} />
        <SettingsRow
          icon="key-outline"
          title={t('Changer mon mot de passe', 'Change my password')}
          disabled
        />
        <SettingsRow
          icon="phone-portrait-outline"
          title={t('Appareils connectés', 'Connected devices')}
          subtitle={t('Bientôt disponible', 'Coming soon')}
          disabled
        />

        <SettingsGroup label={t('Notifications', 'Notifications')} />
        <SettingsRow
          icon="cube-outline"
          title={t('Suivi de mes commandes', 'Order tracking')}
          subtitle={t('Colis remis, en transit, livré', 'Package handed over, in transit, delivered')}
          value={notifyOrders}
          onValueChange={setNotifyOrders}
        />
        <SettingsRow
          icon="chatbubble-outline"
          title="Messages"
          value={notifyMessages}
          onValueChange={setNotifyMessages}
        />
        <SettingsRow
          icon="airplane-outline"
          title={t('Nouveaux trajets des GP suivis', 'New trips from followed personal shoppers')}
          subtitle={t('Quand un GP part vers votre ville', 'When a personal shopper travels to your city')}
          value={notifyTrips}
          onValueChange={setNotifyTrips}
        />
        <SettingsRow
          icon="storefront-outline"
          title={t('Publications des boutiques suivies', 'Posts from followed shops')}
          value={notifyShops}
          onValueChange={setNotifyShops}
        />
        <Text className="px-3.5 pt-2 text-[10px] text-gray-400">
          {t(
            "Ces préférences ne sont pas encore enregistrées : l'envoi des notifications reste à mettre en place.",
            'These preferences are not saved yet: notifications are still being set up.',
          )}
        </Text>

        {/* Séparé des interrupteurs ci-dessus, qui sont de simples préférences
            d'affichage : celui-ci est un consentement, il est réellement
            enregistré, et son retrait doit être aussi immédiat que l'accord. */}
        <SettingsGroup label={t('Communications commerciales', 'Marketing communications')} />
        <SettingsRow
          icon="megaphone-outline"
          title={t('Offres et nouveautés Luuma', 'Luuma offers and news')}
          subtitle={
            me?.legal.marketingConsent
              ? t('Vous recevez nos communications', 'You receive our updates')
              : t('Vous ne recevez aucune communication commerciale', 'You do not receive marketing communications')
          }
          value={me?.legal.marketingConsent ?? false}
          onValueChange={(next) => setMarketingConsent.mutate(next)}
          disabled={!me}
        />

        <SettingsGroup label={t('Préférences', 'Preferences')} />
        <SettingsRow
          icon="language-outline"
          title={t('Langue', 'Language')}
          subtitle={t('Français', 'English')}
          disabled
        />
{ligneZone}

        <SettingsGroup label={t('À propos', 'About')} />
        <SettingsRow
          icon="document-text-outline"
          title={t('Conditions générales', 'Terms and conditions')}
          subtitle={
            me?.legal.acceptedAt
              ? t(
                  `Acceptées le ${new Date(me.legal.acceptedAt).toLocaleDateString('fr-FR')}`,
                  `Accepted on ${new Date(me.legal.acceptedAt).toLocaleDateString('en-US')}`,
                )
              : undefined
          }
          onPress={() => router.push('/legal/terms')}
        />
        <SettingsRow
          icon="lock-closed-outline"
          title={t('Politique de confidentialité', 'Privacy policy')}
          onPress={() => router.push('/legal/privacy')}
        />

        {logout.errorMessage ? (
          <Text className="px-3.5 pt-3 text-center text-xs text-red-500">
            {logout.errorMessage}
          </Text>
        ) : null}

        <View className="px-3.5 pb-2 pt-4">
          <Button
            variant="secondary"
            fullWidth
            loading={logout.isPending}
            onPress={() => logout.mutate()}
          >
            {t('Se déconnecter', 'Log out')}
          </Button>
        </View>
        {piedDePage}
      </ScrollView>
    </SafeAreaView>
  );
}
