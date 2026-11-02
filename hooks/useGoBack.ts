import { useCallback } from 'react';
import { useNavigation, useRouter, type Href } from 'expo-router';

/**
 * Retour arrière, avec une destination de repli.
 *
 * `router.back()` seul échoue dès qu'il n'y a pas d'historique — arrivée par
 * lien profond, notification, partage, ou simple saisie d'URL. React
 * Navigation émet alors « The action 'GO_BACK' was not handled by any
 * navigator », et surtout : le bouton retour ne fait RIEN. L'utilisateur est
 * bloqué sur l'écran, sans autre issue que de fermer l'application.
 *
 * DEUX vérifications, et c'est délibéré. `router.canGoBack()` d'expo-router
 * s'est révélé insuffisant : il renvoyait vrai sur la page d'une boutique
 * alors que l'action échouait quand même. Il consulte l'historique du
 * navigateur, tandis que c'est le navigateur de React Navigation qui traite
 * réellement GO_BACK — et les deux ne coïncident pas toujours sur le web,
 * où un chargement de page crée une pile à une seule entrée.
 *
 * On n'appelle donc `back()` que si les DEUX sont d'accord. Le pire cas
 * devient un remplacement là où un retour animé aurait suffi : une transition
 * un peu moins jolie, jamais un bouton mort.
 */
export function useGoBack(fallback: Href = '/(app)/(tabs)') {
  const router = useRouter();
  const navigation = useNavigation();

  return useCallback(() => {
    // `canGoBack` peut être absent selon le navigateur parent : on le traite
    // alors comme un refus plutôt que de supposer qu'il accepterait.
    const navigatorAgrees =
      typeof navigation.canGoBack === 'function' && navigation.canGoBack();

    if (navigatorAgrees && router.canGoBack()) {
      router.back();
      return;
    }

    // `replace` et non `push` : on remplace un écran sans passé par sa racine,
    // sinon un nouveau retour depuis le fil ramènerait à l'écran quitté.
    router.replace(fallback);
  }, [navigation, router, fallback]);
}
