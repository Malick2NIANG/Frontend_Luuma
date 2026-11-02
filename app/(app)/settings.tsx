import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { useGoBack } from '@/hooks/useGoBack';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { SettingsGroup, SettingsRow } from '@/components/ui/SettingsRow';
import { colors } from '@/constants/colors';
import { useLogout } from '@/hooks/useAuth';
import { useSetMarketingConsent } from '@/hooks/useLegal';
import { useMe } from '@/hooks/useMe';
import { useRequireAuth } from '@/hooks/useRequireAuth';

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
  const { isReady } = useRequireAuth('/(app)/settings');
  const { me } = useMe();
  const setMarketingConsent = useSetMarketingConsent();

  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyTrips, setNotifyTrips] = useState(true);
  const [notifyShops, setNotifyShops] = useState(false);

  if (!isReady) return <View className="flex-1 bg-white" />;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Retour" hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Réglages</Text>
      </View>

      <ScrollView contentContainerClassName="pb-10">
        <SettingsGroup label="Compte" />
        <SettingsRow
          icon="person-outline"
          title="Informations personnelles"
          subtitle="Nom, téléphone, photo"
          disabled
        />
        <SettingsRow
          icon="location-outline"
          title="Adresses de livraison"
          subtitle="Bientôt disponible"
          disabled
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
            title="Vérifier mon email"
            subtitle="Nécessaire pour payer une commande"
            disabled
          />
        ) : null}

        <SettingsGroup label="Sécurité" />
        <SettingsRow
          icon="key-outline"
          title="Changer mon mot de passe"
          disabled
        />
        <SettingsRow
          icon="phone-portrait-outline"
          title="Appareils connectés"
          subtitle="Bientôt disponible"
          disabled
        />

        <SettingsGroup label="Notifications" />
        <SettingsRow
          icon="cube-outline"
          title="Suivi de mes commandes"
          subtitle="Colis remis, en transit, livré"
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
          title="Nouveaux trajets des GP suivis"
          subtitle="Quand un GP part vers votre ville"
          value={notifyTrips}
          onValueChange={setNotifyTrips}
        />
        <SettingsRow
          icon="storefront-outline"
          title="Publications des boutiques suivies"
          value={notifyShops}
          onValueChange={setNotifyShops}
        />
        <Text className="px-3.5 pt-2 text-[10px] text-gray-400">
          Ces préférences ne sont pas encore enregistrées : l'envoi des
          notifications reste à mettre en place.
        </Text>

        {/* Séparé des interrupteurs ci-dessus, qui sont de simples préférences
            d'affichage : celui-ci est un consentement, il est réellement
            enregistré, et son retrait doit être aussi immédiat que l'accord. */}
        <SettingsGroup label="Communications commerciales" />
        <SettingsRow
          icon="megaphone-outline"
          title="Offres et nouveautés Luuma"
          subtitle={
            me?.legal.marketingConsent
              ? 'Vous recevez nos communications'
              : 'Vous ne recevez aucune communication commerciale'
          }
          value={me?.legal.marketingConsent ?? false}
          onValueChange={(next) => setMarketingConsent.mutate(next)}
          disabled={!me}
        />

        <SettingsGroup label="Préférences" />
        <SettingsRow
          icon="globe-outline"
          title="Langue"
          subtitle="Français"
          disabled
        />
        <SettingsRow
          icon="cash-outline"
          title="Devise affichée"
          subtitle="FCFA et EUR"
          disabled
        />

        <SettingsGroup label="À propos" />
        <SettingsRow
          icon="document-text-outline"
          title="Conditions générales"
          subtitle={
            me?.legal.acceptedAt
              ? `Acceptées le ${new Date(me.legal.acceptedAt).toLocaleDateString('fr-FR')}`
              : undefined
          }
          onPress={() => router.push('/legal/terms')}
        />
        <SettingsRow
          icon="lock-closed-outline"
          title="Politique de confidentialité"
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
            Se déconnecter
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
