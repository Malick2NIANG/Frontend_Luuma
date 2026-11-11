import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TermsGate } from '@/components/legal/TermsGate';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';

/**
 * Entrée de l'application, et les deux écrans bloquants qui suivent l'entrée
 * dans un compte.
 *
 * CETTE GARDE NE REDIRIGE PLUS VERS LA CONNEXION. C'est le changement de
 * modèle : l'application s'ouvrait sur le formulaire de connexion, comme un
 * réseau social dont le contenu appartient aux membres. Luuma est une place
 * de marché — on y entre comme dans une boutique. Le catalogue est ouvert, et
 * le compte n'est réclamé qu'au moment de payer.
 *
 * Une session absente n'est donc plus une anomalie à corriger par une
 * redirection, mais un état de visite parfaitement normal. Ce sont les écrans
 * qui engagent — panier, paiement, messages, espaces professionnels — qui se
 * gardent eux-mêmes par `useRequireAuth`, chacun sachant où ramener la
 * personne ensuite.
 *
 * Effet de bord heureux : la classe de bogues « GO_BACK not handled » qui
 * venait de deux redirections concurrentes disparaît d'elle-même, puisqu'il
 * n'y a plus qu'un seul acteur capable de rediriger, et qu'il ne se déclenche
 * que sur l'écran visible.
 */
export default function AppLayout() {
  const { isAuthenticated, isHydrated } = useAuth();
  const { me, isError: meFailed, refetch: retryMe, isFetching } = useMe();
  const logout = useLogout();

  // Tant que le jeton n'a pas été relu depuis le stockage sécurisé, on ne sait
  // pas si la session existe. Afficher le fil maintenant ferait apparaître
  // l'interface du visiteur à quelqu'un qui est déjà connecté, le temps d'un
  // battement.
  if (!isHydrated) {
    return <View className="flex-1 bg-white" />;
  }

  /**
   * TANT QUE `me` EST INCONNU, ON N'OUVRE PAS L'APPLICATION.
   *
   * Les deux écrans qui suivent se déclenchent sur `me`. Écrits en
   * `Boolean(me && …)`, ils s'effaçaient dès que `me` valait `null` — c'est-à-
   * dire pendant le chargement, mais aussi DURABLEMENT si `GET /api/me`
   * échouait : trois tentatives de React Query, puis plus rien. Une panne
   * réseau ouvrait donc l'application à quelqu'un qui n'a ni vérifié son email
   * ni accepté les conditions. Un écran bloquant qui s'efface quand le serveur
   * ne répond pas ne bloque rien : il faut échouer fermé.
   *
   * Le compromis est de ne pas laisser la personne coincée pour autant — d'où
   * le bouton « Réessayer », et la sortie par la déconnexion.
   *
   * Le visiteur sans compte n'est pas concerné : `isAuthenticated` est faux
   * pour lui, la requête n'est jamais lancée, et une visite n'engage personne.
   */
  if (isAuthenticated && !me) {
    if (!meFailed) {
      return <View className="flex-1 bg-white" />;
    }

    return (
      <View className="flex-1 items-center justify-center gap-5 bg-white px-8">
        <Ionicons name="cloud-offline-outline" size={40} color={colors.primary} />
        <View className="gap-2">
          <Text className="text-center text-lg font-bold text-gray-900">
            Connexion au serveur impossible
          </Text>
          <Text className="text-center text-[13px] leading-5 text-gray-500">
            Nous n'avons pas pu charger votre compte. Vérifiez votre connexion,
            puis réessayez.
          </Text>
        </View>
        <Button onPress={() => void retryMe()} loading={isFetching} fullWidth>
          Réessayer
        </Button>
        <Pressable
          onPress={() => logout.mutate()}
          disabled={logout.isPending}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Text className="text-[12.5px] text-gray-500">Se déconnecter</Text>
        </Pressable>
      </View>
    );
  }

  /**
   * VÉRIFICATION D'ABORD, CONDITIONS ENSUITE.
   *
   * L'email est le seul moyen de récupérer un compte. Accepter les conditions
   * avant de l'avoir vérifié reviendrait à enregistrer un consentement sur un
   * compte potentiellement injoignable — une faute de frappe à l'inscription,
   * et la personne ne peut plus ni se reconnecter ni réinitialiser son mot de
   * passe, alors qu'on détient son acceptation.
   *
   * Les deux ne concernent QUE les comptes : `me` n'existe pas pour un
   * visiteur, et parcourir un catalogue n'engage personne. Le jour où il
   * créera un compte, les deux écrans l'attendront.
   */
  const needsEmailVerification = Boolean(me && !me.emailVerified);
  const needsTerms = Boolean(me?.legal.needsAcceptance);

  return (
    <>
      {needsEmailVerification ? (
        <EmailVerificationGate />
      ) : needsTerms ? (
        <TermsGate />
      ) : null}

      {/* L'arbre est monté DERRIÈRE les écrans bloquants, pas à leur place :
          le fil charge ses données pendant ce temps, et l'application est
          déjà prête au moment où le dernier écran se ferme. */}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
