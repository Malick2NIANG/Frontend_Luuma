/**
 * Indicatifs téléphoniques.
 *
 * Liste écrite à la main plutôt qu'importée d'un paquet : les bibliothèques
 * d'indicatifs pèsent plusieurs centaines de kilo-octets pour couvrir 250 pays
 * dont Luuma n'en verra jamais la moitié. Celle-ci couvre l'Afrique de l'Ouest,
 * l'Afrique centrale, l'Europe où vit la diaspora, et l'Amérique du Nord.
 *
 * Les noms sont en français et servent à la recherche. Le tri est fait à
 * l'affichage, pas ici : `PRIORITY` remonte d'abord les pays les plus
 * probables.
 */
export interface Country {
  /** ISO 3166-1 alpha-2, sert aussi à composer le drapeau. */
  iso: string;
  name: string;
  /** Indicatif SANS le « + ». */
  dial: string;
}

/**
 * Pays remontés en tête de liste, avant tout tri alphabétique.
 *
 * Le Sénégal parce que c'est le pays d'origine des produits ; la France, la
 * Belgique et l'Italie parce que c'est là qu'est la diaspora. Faire défiler
 * soixante pays pour trouver le sien quand on est dans l'un de ces quatre
 * serait absurde.
 */
export const PRIORITY_ISO = ['SN', 'FR', 'BE', 'IT', 'ES', 'DE'];

/** Indicatif proposé par défaut à l'inscription. */
export const DEFAULT_COUNTRY_ISO = 'SN';

export const COUNTRIES: Country[] = [
  // Afrique de l'Ouest
  { iso: 'SN', name: 'Sénégal', dial: '221' },
  { iso: 'ML', name: 'Mali', dial: '223' },
  { iso: 'CI', name: "Côte d'Ivoire", dial: '225' },
  { iso: 'GN', name: 'Guinée', dial: '224' },
  { iso: 'GW', name: 'Guinée-Bissau', dial: '245' },
  { iso: 'GM', name: 'Gambie', dial: '220' },
  { iso: 'MR', name: 'Mauritanie', dial: '222' },
  { iso: 'BF', name: 'Burkina Faso', dial: '226' },
  { iso: 'NE', name: 'Niger', dial: '227' },
  { iso: 'TG', name: 'Togo', dial: '228' },
  { iso: 'BJ', name: 'Bénin', dial: '229' },
  { iso: 'GH', name: 'Ghana', dial: '233' },
  { iso: 'NG', name: 'Nigeria', dial: '234' },
  { iso: 'SL', name: 'Sierra Leone', dial: '232' },
  { iso: 'LR', name: 'Liberia', dial: '231' },
  { iso: 'CV', name: 'Cap-Vert', dial: '238' },

  // Afrique centrale et australe
  { iso: 'CM', name: 'Cameroun', dial: '237' },
  { iso: 'GA', name: 'Gabon', dial: '241' },
  { iso: 'CG', name: 'Congo', dial: '242' },
  { iso: 'CD', name: 'République démocratique du Congo', dial: '243' },
  { iso: 'TD', name: 'Tchad', dial: '235' },
  { iso: 'CF', name: 'République centrafricaine', dial: '236' },
  { iso: 'AO', name: 'Angola', dial: '244' },
  { iso: 'ZA', name: 'Afrique du Sud', dial: '27' },

  // Afrique du Nord et de l'Est
  { iso: 'MA', name: 'Maroc', dial: '212' },
  { iso: 'DZ', name: 'Algérie', dial: '213' },
  { iso: 'TN', name: 'Tunisie', dial: '216' },
  { iso: 'LY', name: 'Libye', dial: '218' },
  { iso: 'EG', name: 'Égypte', dial: '20' },
  { iso: 'KE', name: 'Kenya', dial: '254' },
  { iso: 'ET', name: 'Éthiopie', dial: '251' },
  { iso: 'DJ', name: 'Djibouti', dial: '253' },

  // Europe
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'BE', name: 'Belgique', dial: '32' },
  { iso: 'IT', name: 'Italie', dial: '39' },
  { iso: 'ES', name: 'Espagne', dial: '34' },
  { iso: 'DE', name: 'Allemagne', dial: '49' },
  { iso: 'PT', name: 'Portugal', dial: '351' },
  { iso: 'NL', name: 'Pays-Bas', dial: '31' },
  { iso: 'CH', name: 'Suisse', dial: '41' },
  { iso: 'GB', name: 'Royaume-Uni', dial: '44' },
  { iso: 'IE', name: 'Irlande', dial: '353' },
  { iso: 'LU', name: 'Luxembourg', dial: '352' },
  { iso: 'AT', name: 'Autriche', dial: '43' },
  { iso: 'SE', name: 'Suède', dial: '46' },
  { iso: 'NO', name: 'Norvège', dial: '47' },
  { iso: 'DK', name: 'Danemark', dial: '45' },
  { iso: 'FI', name: 'Finlande', dial: '358' },
  { iso: 'PL', name: 'Pologne', dial: '48' },
  { iso: 'GR', name: 'Grèce', dial: '30' },

  // Amériques
  { iso: 'US', name: 'États-Unis', dial: '1' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'BR', name: 'Brésil', dial: '55' },
  { iso: 'AR', name: 'Argentine', dial: '54' },

  // Moyen-Orient et Asie
  { iso: 'AE', name: 'Émirats arabes unis', dial: '971' },
  { iso: 'SA', name: 'Arabie saoudite', dial: '966' },
  { iso: 'QA', name: 'Qatar', dial: '974' },
  { iso: 'TR', name: 'Turquie', dial: '90' },
  { iso: 'CN', name: 'Chine', dial: '86' },
  { iso: 'IN', name: 'Inde', dial: '91' },
];

/**
 * Drapeau composé à partir du code ISO, sans aucune image.
 *
 * Chaque lettre est décalée vers son « indicateur régional » Unicode ; les
 * deux mis bout à bout donnent le drapeau. Cela évite d'embarquer 60 images.
 *
 * ⚠️ Windows n'affiche PAS les drapeaux emoji — il rend les deux lettres du
 * code à la place. C'est une limite de la police système, pas du code : sur
 * iOS et Android, le drapeau s'affiche normalement.
 */
export function flagOf(iso: string): string {
  const BASE = 0x1f1e6; // 🇦
  return iso
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(BASE + char.charCodeAt(0) - 65))
    .join('');
}

export function findCountry(iso: string): Country {
  return (
    COUNTRIES.find((country) => country.iso === iso) ??
    COUNTRIES.find((country) => country.iso === DEFAULT_COUNTRY_ISO)!
  );
}

/** Ordre d'affichage : les pays probables d'abord, puis l'alphabet. */
export function orderedCountries(): Country[] {
  const priority = PRIORITY_ISO.map((iso) => findCountry(iso));
  const rest = COUNTRIES.filter(
    (country) => !PRIORITY_ISO.includes(country.iso),
  ).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return [...priority, ...rest];
}

/**
 * Normalisation pour la recherche : sans accents, en minuscules.
 *
 * Même règle que la recherche de produits côté serveur — « senegal » doit
 * trouver « Sénégal », sinon la barre de recherche ne sert à rien pour la
 * moitié des noms de pays francophones.
 */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
