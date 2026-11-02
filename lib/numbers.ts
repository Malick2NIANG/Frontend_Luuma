/**
 * Lecture d'un nombre saisi à la main.
 *
 * La virgule est le séparateur décimal en français : quelqu'un qui pèse un
 * boubou tape « 1,2 », et `Number('1,2')` vaut NaN. Sans cette conversion, un
 * poids valide serait refusé comme invalide — et le commerçant n'aurait
 * aucune idée de ce qu'on lui reproche.
 *
 * Les espaces sont retirés aussi : on saisit volontiers « 15 000 » pour un
 * prix en FCFA.
 */
export function parseDecimal(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
