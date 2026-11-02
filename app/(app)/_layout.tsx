import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { EmailVerificationGate } from '@/components/auth/EmailVerificationGate';
import { TermsGate } from '@/components/legal/TermsGate';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useAuth, useLogout } from '@/hooks/useAuth';
import { useMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth.store';

/**
 * Garde de session — UNIQUE point de redirection vers la connexion — et les
 * deux écrans bloquants qui suivent l'entrée dans un compte.
 *
 * Pourquoi un seul point de redirection : lorsqu'une session tombe — un 401
 * intercepté dans `lib/api.ts` vide le magasin — TOUS les écrans montés se
 * re-rendent dans le même cycle. Avec une garde sur les onglets ET un
 * `router.replace` dans `useRequireAuth` sur chaque écran empilé au-dessus,
 * deux navigations partaient vers la même destination dans le même lot
 * d'effets. La seconde arrivait sur un navigateur déjà transitionné, d'où
 * « The action 'GO_BACK' was not handled by any navigator » — un avertissement
 * déclenché par un effet, jamais par un appui, ce qui rendait la trace
 * déroutante.
 *
 * Pourquoi les deux écrans bloquants sont ICI, et dans CET ordre : leur
 * séquence est une décision produit, elle doit se lire en un coup d'œil plutôt
 * que se déduire de l'endroit où chacun a été monté.
 */
export default function AppLayout() {
  const { isAuthenticated, isHydrated, isGuest } = useAuth();
  const sessionEndReason = useAuthStore((state) => state.sessionEndReason);
  const { me, isError: meFailed, refetch: retryMe, isFetching } = useMe();
  const logout = useLogout();
  const pathname = usePathname();

  // Tant que le jeton n'a pas été relu depuis le stockage sécurisé, on ne sait
  // pas si la session existe. Rediriger maintenant éjecterait quelqu'un qui
  // est déjà connecté — le défaut classique d'une garde posée trop tôt.
  if (!isHydrated) {
    return <View className="flex-1 bg-white" />;
  }

  // `isGuest` est la seule dérogation : elle vaut pour la session en cours, ne
  // survit pas au redémarrage, et n'autorise rien. Chaque action se heurte à
  // `useRequireAuth` et repasse par la connexion.
  if (!isAuthenticated && !isGuest) {
    // `returnTo` est porté ici plutôt que par chaque écran : quelqu'un
    // interrompu au panier doit y revenir, et c'est désormais la garde qui le
    // sait puisqu'elle est seule à rediriger.
    //
    // Sauf après une déconnexion VOLONTAIRE. Sans cette distinction, quitter
    // depuis Réglages y ramenait à la reconnexion suivante : la garde voyait le
    // même `pathname` dans les deux cas et ne pouvait pas savoir lequel des
    // deux venait de se produire. La destination dépend de l'intention, pas de
    // l'écran affiché — seul le magasin connaît l'intention.
    const href =
      sessionEndReason === 'user'
        ? '/login'
        : `/login?returnTo=${encodeURIComponent(pathname)}`;
    return <Redirect href={href} />;
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
   * Les deux sont exemptés pour le visiteur sans compte : `me` n'existe pas,
   * et une visite n'engage personne.
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
