import type { DisplayCurrency } from '@/hooks/useCurrency';

/**
 * Devise d'affichage déduite du pays de la personne.
 *
 * Limitée aux devises que Luuma sait afficher (voir DISPLAY_CURRENCIES). Un
 * pays hors de cette liste — Suisse, Maroc, Suède… — reçoit l'euro : c'est la
 * devise réellement facturée à la diaspora, donc celle qui ne ment jamais sur
 * le montant débité. La personne peut toujours en changer ensuite.
 */
const ZONE_EURO = [
  'FR', 'BE', 'IT', 'ES', 'DE', 'PT', 'NL', 'IE', 'LU', 'AT', 'FI', 'GR',
];

/** Union économique ouest-africaine : franc CFA, comme au Sénégal. */
const ZONE_FCFA = ['SN', 'ML', 'CI', 'BF', 'NE', 'TG', 'BJ', 'GW'];

export function deviseDuPays(iso: string | null): DisplayCurrency {
  if (!iso) return 'EUR';
  if (ZONE_FCFA.includes(iso)) return 'XOF';
  if (ZONE_EURO.includes(iso)) return 'EUR';
  if (iso === 'US') return 'USD';
  if (iso === 'GB') return 'GBP';
  if (iso === 'CA') return 'CAD';
  return 'EUR';
}

/** Le pays a-t-il sa propre devise, ou retombe-t-il sur l'euro par défaut ? */
export function deviseParDefaut(iso: string | null): boolean {
  if (!iso) return true;
  return ![...ZONE_FCFA, ...ZONE_EURO, 'US', 'GB', 'CA'].includes(iso);
}
