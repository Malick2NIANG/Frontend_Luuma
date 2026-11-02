import type { ProductCategory } from '@/types/api.types';

/**
 * Libellés affichables des catégories.
 *
 * Les valeurs de l'énumération sont en majuscules sans accent — contrainte de
 * Postgres, pas choix d'affichage. Ce tableau est la seule traduction, et le
 * type `Record<ProductCategory, string>` garantit qu'une catégorie ajoutée au
 * schéma sans libellé fasse échouer la compilation plutôt que d'apparaître
 * telle quelle à l'écran.
 */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  VETEMENTS: 'Vêtements',
  CHAUSSURES: 'Chaussures',
  BIJOUX_ACCESSOIRES: 'Bijoux & accessoires',
  ALIMENTAIRE: 'Alimentaire',
  COSMETIQUES: 'Cosmétiques',
  ARTISANAT_DECO: 'Artisanat & déco',
  ENFANT_BEBE: 'Enfant & bébé',
  MAISON: 'Maison',
  LIVRES_CULTURE: 'Livres & culture',
  AUTRE: 'Autre',
};

/** Version courte, pour les pastilles de filtre où la place manque. */
export const CATEGORY_SHORT_LABELS: Record<ProductCategory, string> = {
  VETEMENTS: 'Vêtements',
  CHAUSSURES: 'Chaussures',
  BIJOUX_ACCESSOIRES: 'Bijoux',
  ALIMENTAIRE: 'Alimentaire',
  COSMETIQUES: 'Cosmétiques',
  ARTISANAT_DECO: 'Artisanat',
  ENFANT_BEBE: 'Enfant',
  MAISON: 'Maison',
  LIVRES_CULTURE: 'Livres',
  AUTRE: 'Autre',
};
