import { useWindowDimensions } from 'react-native';

/**
 * Largeur maximale du contenu sur les écrans très larges, en points.
 */
export const MAX_CONTENT_WIDTH = 1920;

/**
 * Largeur disponible pour les éléments qui calculent leur mise en page à la
 * main, comme les grilles et les carrousels.
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_CONTENT_WIDTH);
}
