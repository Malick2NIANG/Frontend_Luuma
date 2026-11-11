import { useCallback, useEffect } from 'react';
// `useIsFocused` est réexporté par expo-router : l'importer depuis
// `@react-navigation/native` ferait dépendre le code d'un paquet transitif
// qui n'est pas dans nos dépendances déclarées.
import { useIsFocused, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';

/**
 * Renvoie vers la connexion en mémorisant la page d'origine.
 *
 * Le paramètre `returnTo` est essentiel : quelqu'un qui a rempli son panier
 * et se voit demander un compte doit revenir exactement où il en était, sinon
 * il abandonne. `useLogin`/`useRegister` l'exploitent après authentification.
 */
export function useAuthGate() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  const requireAuth = useCallback(
    (returnTo: string): boolean => {
      if (isAuthenticated) return true;

      router.push({
        pathname: '/(auth)/login',
        params: { returnTo },
      });
      return false;
    },
    [isAuthenticated, router],
  );

  return { requireAuth, isAuthenticated, isHydrated };
}

/**
 * Protège un écran qui engage — paiement, commandes, messages, espaces
 * professionnels.
 *
 * C'est désormais le SEUL mécanisme de redirection vers la connexion. La
 * garde de `(app)/_layout.tsx` n'y renvoie plus personne : une session
 * absente est l'état normal d'un visiteur qui parcourt le catalogue. Seuls
 * les écrans qui demandent un compte le réclament, chacun sachant où ramener
 * la personne ensuite.
 *
 * À NE PAS poser sur le panier : il est ouvert aux visiteurs, et c'est
 * délibéré. Un panier rempli est un engagement déjà pris ; demander le compte
 * à cet instant ferait abandonner. Le seuil est le paiement.
 */
export function useRequireAuth(returnTo: string): { isReady: boolean } {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isAuthenticated, isHydrated } = useAuth();
  const sessionEndReason = useAuthStore((state) => state.sessionEndReason);

  useEffect(() => {
    // `isFocused` ferme une porte qui s'était déjà refermée sur nous : un
    // visiteur peut avoir plusieurs écrans gardés empilés — panier, puis
    // paiement — tous montés, tous dans la même branche. S'ils redirigeaient
    // ensemble, plusieurs navigations partiraient dans le même lot d'effets
    // et les suivantes échoueraient en « GO_BACK not handled ».
    //
    // Seul l'écran visible décide. Ceux qui restent montés dessous se taisent.
    if (!isFocused || !isHydrated || isAuthenticated) return;

    // Une déconnexion VOLONTAIRE ne doit pas renvoyer au formulaire : la
    // personne vient de partir, elle redevient visiteur et retrouve le fil.
    // `useLogout` l'y emmène ; sans cette sortie, cet écran l'enverrait au
    // login en même temps, et les deux navigations se marcheraient dessus.
    if (sessionEndReason === 'user') return;

    router.replace({
      pathname: '/(auth)/login',
      params: { returnTo },
    });
  }, [
    isFocused,
    isHydrated,
    isAuthenticated,
    sessionEndReason,
    router,
    returnTo,
  ]);

  return { isReady: isHydrated && isAuthenticated };
}
