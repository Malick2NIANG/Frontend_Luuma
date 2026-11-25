import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import {
  lancementDeLApp,
  type ModeSplash,
  type TypeNavigation,
} from '@/lib/launch';

/**
 * Lecture de l'environnement pour l'écran de démarrage, et signal de sa fin.
 *
 * La décision elle-même est dans lib/launch.ts (pure, testée) ; ce module ne
 * fait que rassembler ce qu'elle demande.
 */

/** Instant de chargement du module : point de départ de la durée minimale. */
export const SPLASH_CHARGE_A = Date.now();

/** Durée minimale de l'animation complète, depuis le chargement du module. */
export const SPLASH_DUREE_MINIMALE_MS = 2700;

const CLE_SESSION = 'luuma:splash-joue';

/** Natif : une variable de module vit exactement le temps du processus. */
let dejaJoueNatif = false;
let modeEnCache: ModeSplash | null = null;

/**
 * Mode de cette ouverture, calculé UNE fois.
 *
 * En cache parce que le calcul marque l'animation comme jouée : appelé deux
 * fois (StrictMode, remontage), il répondrait « rapide » la seconde fois et
 * couperait l'animation en plein milieu.
 */
export function modeDuSplash(): ModeSplash {
  if (modeEnCache) return modeEnCache;
  modeEnCache = Platform.OS === 'web' ? modeWeb() : modeNatif();
  return modeEnCache;
}

function modeWeb(): ModeSplash {
  let dejaJoue = false;
  // Navigation privée, stockage désactivé : sessionStorage peut lever une
  // exception. On joue alors l'animation plutôt que de planter le démarrage.
  try {
    dejaJoue = window.sessionStorage.getItem(CLE_SESSION) === '1';
    window.sessionStorage.setItem(CLE_SESSION, '1');
  } catch {
    dejaJoue = false;
  }

  let typeNavigation: TypeNavigation = null;
  try {
    const [entree] = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];
    typeNavigation = (entree?.type as TypeNavigation) ?? null;
  } catch {
    typeNavigation = null;
  }

  return lancementDeLApp({
    chemin: window.location.pathname + window.location.search,
    typeNavigation,
    dejaJoue,
  });
}

function modeNatif(): ModeSplash {
  // L'URL qui a ouvert l'application : nulle ou sans chemin quand on la lance
  // depuis l'écran d'accueil du téléphone, un chemin pour un lien partagé.
  let chemin = '/';
  try {
    const url = Linking.getLinkingURL();
    const path = url ? Linking.parse(url).path : null;
    if (path) chemin = `/${path.replace(/^\/+/, '')}`;
  } catch {
    chemin = '/';
  }

  const mode = lancementDeLApp({
    chemin,
    typeNavigation: null,
    dejaJoue: dejaJoueNatif,
  });
  dejaJoueNatif = true;
  return mode;
}

// --- Fin du splash -----------------------------------------------------------

let signalerFin: () => void = () => {};
const finDuSplash = new Promise<void>((resolve) => {
  signalerFin = resolve;
});

/**
 * Résolue quand l'écran de démarrage a disparu. Pour ouvrir une fenêtre
 * (annonce, nouveauté) sans qu'elle se joue derrière l'animation.
 */
export function attendreFinDuSplash(): Promise<void> {
  return finDuSplash;
}

/** Appelée une seule fois par l'écran de démarrage ; les appels suivants sont sans effet. */
export function marquerFinDuSplash(): void {
  signalerFin();
}
