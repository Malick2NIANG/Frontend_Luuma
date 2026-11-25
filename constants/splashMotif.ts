/**
 * Motif de l'écran de démarrage : un marché sénégalais en traits fins.
 *
 * « Luuma », c'est le marché hebdomadaire. Le dessin en reprend les éléments,
 * de haut en bas :
 *   · l'auvent rayé d'un étal, ses deux poteaux et ce qui y pend ;
 *   · deux anneaux tressés autour de la marque, comme le bord d'un van
 *     (le grand plateau de vannerie des marchés) ;
 *   · des bandes de losanges sur les côtés, comme un tissu suspendu ;
 *   · un baobab à gauche ; un canari, des calebasses et un panier à droite ;
 *   · une pirogue sur les vagues : le voyage vers la diaspora ;
 *   · une bande de motifs bogolan en pied.
 *
 * Le centre (y 260–540) reste dégagé : c'est là que s'affichent le logo, le
 * nom et le slogan, et le motif ne doit jamais gêner leur lecture.
 *
 * Repère : viewBox 0 0 400 800, cadré en `xMidYMid slice`. Traits seulement,
 * sans remplissage, dans la couleur de la marque sur le fond blanc.
 */

export const SPLASH_VIEWBOX = '0 0 400 800';

function scallops(x0: number, x1: number, y: number, w: number, depth: number) {
  let d = `M${x0} ${y}`;
  for (let x = x0; x < x1; x += w) d += ` q${w / 2} ${depth} ${w} 0`;
  return d;
}

function zigzag(x0: number, x1: number, yTop: number, yBottom: number, w: number) {
  let d = `M${x0} ${yBottom}`;
  for (let x = x0; x < x1; x += w) d += ` L${x + w / 2} ${yTop} L${x + w} ${yBottom}`;
  return d;
}

function waves(x0: number, x1: number, y: number, w: number, h: number) {
  let d = `M${x0} ${y}`;
  for (let x = x0; x < x1; x += w) d += ` q${w / 4} ${-h} ${w / 2} 0 q${w / 4} ${h} ${w / 2} 0`;
  return d;
}

export const SPLASH_PATHS: string[] = [
  // ── Auvent de l'étal ─────────────────────────────────────────────────
  'M-10 52 L8 36 H392 L410 52',
  'M8 36 V82 M392 36 V82',
  scallops(8, 392, 82, 32, 20),
  // rayures de la toile
  ...Array.from({ length: 12 }, (_, i) => `M${8 + 32 * i} 36 V82`),
  // poteaux
  'M28 92 V250 M372 92 V250',
  // suspendus : un régime d'oignons, une calebasse, un petit panier
  'M112 92 V118 M104 126 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M112 118 V126',
  'M96 140 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M116 140 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0',
  'M200 92 V122 M182 124 H218 A18 18 0 0 1 182 124 Z',
  'M288 92 V112 M272 112 H304 L298 138 H278 Z M276 121 H300 M278 129 H298',

  // ── Anneaux tressés autour de la marque ──────────────────────────────
  'M200 250 a150 150 0 1 0 0.01 0',

  // ── Baobab : tronc en bouteille, branches courtes ───────────────────
  'M38 690 C26 652 28 612 54 590 M110 690 C122 652 120 612 94 590',
  'M54 590 C46 574 30 568 16 556 M62 588 C58 570 52 556 54 538 M74 586 C74 568 76 552 82 540 M86 588 C92 570 104 560 118 552 M94 590 C108 584 124 584 138 574',
  'M16 556 L6 550 M16 556 L12 544 M54 538 L46 528 M54 538 L60 526 M82 540 L78 528 M82 540 L90 530 M118 552 L124 540 M138 574 L150 568 M138 574 L146 584',
  'M58 640 C66 646 80 646 90 640 M54 660 C66 668 84 668 96 660',
  'M20 690 H130',

  // ── Bandes de losanges sur les côtés (tissu suspendu) ────────────────
  ...[16, 384].flatMap((x) =>
    Array.from({ length: 8 }, (_, i) => `M${x} ${300 + 26 * i} l10 10 -10 10 -10 -10 z`),
  ),

  // ── Canari (jarre en terre) ──────────────────────────────────────────
  'M290 690 C262 690 254 650 272 630 C281 620 282 614 280 606 H324 C322 614 323 620 332 630 C350 650 342 690 314 690 Z',
  'M276 606 H328',
  zigzag(266, 338, 644, 656, 12),
  // calebasses empilées
  'M342 690 A26 18 0 0 0 394 690 Z',
  'M350 672 A18 12 0 0 0 386 672 Z',
  'M358 662 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M370 662 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0',
  // panier tressé
  'M206 690 L198 650 H250 L242 690 Z',
  'M202 664 H246 M204 677 H244 M214 650 L218 690 M230 650 L230 690 M236 650 L232 690',
  'M206 650 C206 628 242 628 242 650',

  // ── Pirogue sur les vagues ────────────────────────────────────────────
  'M128 724 C160 744 240 744 272 724 L282 710 C246 728 154 728 118 710 Z',
  'M150 728 V736 M175 732 V740 M200 733 V741 M225 732 V740 M250 728 V736',
  waves(96, 304, 752, 26, 6),

  // ── Bande bogolan ─────────────────────────────────────────────────────
  'M-10 768 H410 M-10 796 H410',
  zigzag(-10, 410, 772, 792, 20),
];

/**
 * Tracés en pointillé : l'anneau intérieur, comme les points de couture
 * d'une vannerie.
 */
export const SPLASH_DASHED_PATHS: string[] = ['M200 266 a134 134 0 1 0 0.01 0'];
export const SPLASH_DASH = '3 9';

/** Petits points ronds entre les pointes du zigzag bogolan. */
export const SPLASH_DOTS: { cx: number; cy: number; r: number }[] =
  Array.from({ length: 21 }, (_, i) => ({ cx: -10 + 20 * i + 10, cy: 788, r: 2 }));
