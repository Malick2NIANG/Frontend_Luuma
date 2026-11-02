const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose E.164 check: leading +, country code, 8-15 digits total.
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}

/**
 * Recompose un numéro E.164 à partir de l'indicatif et du numéro local.
 *
 * Deux nettoyages indispensables. Les SÉPARATEURS d'abord : « 77 123 45 67 »,
 * « 77-123-45-67 » et « 77.123.45.67 » sont la même chose, et refuser l'un
 * parce qu'on a accepté l'autre serait arbitraire.
 *
 * Le ZÉRO initial ensuite : en France comme au Sénégal, on dit son numéro avec
 * un zéro devant, mais ce zéro disparaît dès qu'on préfixe l'indicatif —
 * « +33 06 12… » n'existe pas. Le retirer est la correction que tout le monde
 * attend sans savoir la nommer.
 */
export function toE164(dialCode: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, '').replace(/^0+/, '');
  return `+${dialCode}${digits}`;
}
