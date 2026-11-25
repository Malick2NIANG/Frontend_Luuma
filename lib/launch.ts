/**
 * L'écran de démarrage joue-t-il son animation complète ?
 *
 * Fonction PURE, isolée pour être testée : elle ne lit ni l'URL, ni le
 * stockage, ni l'historique — on lui passe tout. Voir lib/splash.ts pour la
 * lecture de l'environnement, et lib/launch.test.mjs pour les cas couverts.
 *
 * L'animation dure près de quatre secondes. Elle a du sens au VRAI lancement,
 * quand on ouvre Luuma depuis son écran d'accueil. Elle devient un obstacle
 * partout ailleurs : un lien de produit partagé, un retour de paiement, un
 * rechargement, le bouton retour. Dans ces cas, on veut le contenu tout de
 * suite.
 */

export type TypeNavigation =
  | 'navigate'
  | 'reload'
  | 'back_forward'
  | 'prerender'
  | null;

export type ModeSplash = 'complet' | 'rapide';

export interface ContexteLancement {
  /** Chemin ouvert au démarrage (« / » pour l'accueil). */
  chemin: string;
  /** Type de navigation rapporté par le navigateur, `null` s'il est inconnu. */
  typeNavigation: TypeNavigation;
  /** L'animation a-t-elle déjà été jouée pendant cette session ? */
  dejaJoue: boolean;
}

export function lancementDeLApp({
  chemin,
  typeNavigation,
  dejaJoue,
}: ContexteLancement): ModeSplash {
  if (dejaJoue) return 'rapide';
  if (typeNavigation === 'reload' || typeNavigation === 'back_forward') {
    return 'rapide';
  }
  return estAccueil(chemin) ? 'complet' : 'rapide';
}

/** « / », « » ou « /?ref=… » : l'accueil. Tout autre chemin est un lien profond. */
function estAccueil(chemin: string): boolean {
  const sansRequete = chemin.split(/[?#]/)[0] ?? '';
  return sansRequete === '' || sansRequete === '/';
}
