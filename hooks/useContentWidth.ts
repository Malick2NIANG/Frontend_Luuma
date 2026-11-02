import { useWindowDimensions } from 'react-native';

/**
 * Largeur maximale du contenu, en points.
 *
 * Luuma est une application mobile ; le navigateur ne sert qu'au
 * développement. Sans plafond, une publication s'y étire sur toute la
 * fenêtre et son image en 4:3 atteint 1 176 points de haut — on ne voit
 * plus qu'une photo par écran, et il devient impossible de juger la mise en
 * page qu'auront réellement les utilisateurs.
 *
 * 480 correspond aux plus grands téléphones actuels : au-delà, on ne
 * regarderait plus la même interface.
 */
export const MAX_CONTENT_WIDTH = 480;

/**
 * Largeur réellement disponible pour le contenu.
 *
 * Sur téléphone elle vaut la largeur de l'écran ; sur un navigateur large
 * elle est plafonnée. Les composants qui dimensionnent une image à la main
 * (carrousel, grille de résultats) doivent utiliser CETTE valeur et non
 * `useWindowDimensions`, sinon ils déborderont du cadre centré.
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_CONTENT_WIDTH);
}
