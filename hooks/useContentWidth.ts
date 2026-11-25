import { useWindowDimensions } from 'react-native';

/**
 * Mise en page selon la taille d'écran, sur le modèle d'Instagram.
 *
 *   TÉLÉPHONE  (< 700 px)    tout l'écran, onglets en bas.
 *   TABLETTE   (700–1 099)   barre d'icônes compacte à gauche, fil centré
 *                            dans l'espace restant.
 *   ORDINATEUR (≥ 1 100)     même barre d'icônes, même fil ; à partir de
 *                            1 160 px s'y ajoute une colonne à droite (compte,
 *                            boutiques suggérées, pied de page).
 *
 * La barre reste compacte partout : des icônes seules prennent 72 px, ce qui
 * laisse au fil et à la colonne de droite toute la place — c'est le choix
 * d'Instagram sur grand écran.
 */
export type Format = 'telephone' | 'tablette' | 'ordinateur';

export const SEUIL_TABLETTE = 700;
export const SEUIL_ORDINATEUR = 1100;
/** À partir de cette largeur, le fil a sa colonne de droite. */
export const SEUIL_COLONNE_DROITE = 1160;

/** Largeur maximale de la colonne de contenu. */
export const LARGEUR_COLONNE = 680;
/** Largeur de la barre latérale d'icônes (tablette et ordinateur). */
export const LARGEUR_BARRE_LATERALE = 72;
/** Largeur de la colonne de droite du fil. */
export const LARGEUR_COLONNE_DROITE = 320;
/** Espace entre le fil et la colonne de droite. */
export const ECART_COLONNE_DROITE = 56;

export interface Mise {
  format: Format;
  /** Navigation dans une barre latérale plutôt qu'en bas. */
  barreLaterale: boolean;
  /** Le fil affiche sa colonne de droite. */
  colonneDroite: boolean;
  /** Largeur utile pour le contenu d'un écran (colonne). */
  largeurContenu: number;
  /** Largeur maximale de l'application entière (aucune : plein écran). */
  largeurApplication: number | undefined;
}

export function useMiseEnPage(): Mise {
  const { width } = useWindowDimensions();

  if (width < SEUIL_TABLETTE) {
    return {
      format: 'telephone',
      barreLaterale: false,
      colonneDroite: false,
      largeurContenu: width,
      largeurApplication: undefined,
    };
  }

  // Ce qui reste à côté de la barre, moins une petite marge de chaque côté.
  const disponible = width - LARGEUR_BARRE_LATERALE - 32;
  return {
    format: width >= SEUIL_ORDINATEUR ? 'ordinateur' : 'tablette',
    barreLaterale: true,
    colonneDroite: width >= SEUIL_COLONNE_DROITE,
    largeurContenu: Math.min(LARGEUR_COLONNE, disponible),
    largeurApplication: undefined,
  };
}

/**
 * Largeur disponible pour les éléments qui calculent leur mise en page à la
 * main, comme les grilles et les carrousels : celle de la colonne.
 */
export function useContentWidth(): number {
  return useMiseEnPage().largeurContenu;
}
