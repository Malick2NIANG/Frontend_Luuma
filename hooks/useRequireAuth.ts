import { useCallback, useEffect } from 'react';
// `useIsFocused` est réexporté par expo-router : l'importer depuis
// `@react-navigation/native` ferait dépendre le code d'un paquet transitif
// qui n'est pas dans nos dépendances déclarées.
import { useIsFocused, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

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
 * Protège un écran entier — panier, commande, conversation.
 *
 * Ne redirige QUE le visiteur sans compte. La perte de session, elle, est
 * traitée par la garde unique de `(app)/_layout.tsx`.
 *
 * La distinction n'est pas cosmétique. Un 401 intercepté dans `lib/api.ts`
 * vide le magasin, et tous les écrans montés se re-rendent dans le même
 * cycle : si chacun redirigeait, plusieurs navigations partiraient vers la
 * même destination dans le même lot d'effets, et celles qui arrivent après la
 * première échouent en « GO_BACK not handled » — un avertissement déclenché
 * par un effet, jamais par un appui.
 *
 * Le visiteur, lui, a franchi la garde légitimement : c'est le seul cas où
 * l'écran doit décider lui-même, et il est le seul à le faire.
 */
export function useRequireAuth(returnTo: string): { isReady: boolean } {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { isAuthenticated, isHydrated, isGuest } = useAuth();

  useEffect(() => {
    // `isFocused` ferme la dernière porte. Séparer le cas « visiteur » du cas
    // « session perdue » garantissait qu'un seul des DEUX mécanismes se
    // déclenche — mais pas qu'un seul ÉCRAN se déclenche : un visiteur peut
    // avoir plusieurs écrans gardés empilés (panier, puis paiement), tous
    // montés, tous dans la même branche, tous redirigeant.
    //
    // Seul l'écran visible décide. Ceux qui restent montés dessous se taisent.
    if (isFocused && isHydrated && !isAuthenticated && isGuest) {
      router.replace({
        pathname: '/(auth)/login',
        params: { returnTo },
      });
    }
  }, [isFocused, isHydrated, isAuthenticated, isGuest, router, returnTo]);

  return { isReady: isHydrated && isAuthenticated };
}
