import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

export type RoleMarkType = 'merchant' | 'gp';

/**
 * Pastille indiquant sous quelle casquette un compte publie.
 *
 * Sur Luuma, un même compte peut vendre ET transporter, et les deux rôles
 * n'engagent pas du tout la même chose : on achète à une boutique, on confie
 * un colis à un GP. Distinguer les deux d'un coup d'œil évite d'écrire à un
 * commerçant pour lui demander s'il passe par Lyon.
 *
 * Regroupé ici plutôt que répété dans chaque écran : c'est le seul moyen que
 * l'avion et la boutique restent deux membres d'une même famille visuelle —
 * même taille, même couleur — au lieu de diverger au fil des retouches.
 */
const ICONS: Record<RoleMarkType, React.ComponentProps<typeof Ionicons>['name']> = {
  gp: 'airplane',
  merchant: 'storefront',
};

export interface RoleMarkProps {
  type: RoleMarkType;
  size?: number;
  color?: string;
}

export function RoleMark({
  type,
  size = 11,
  // Même couleur pour les deux : c'est la FORME qui porte la distinction.
  // Deux teintes différentes à cette taille se liraient comme deux niveaux
  // d'importance, ce qu'elles ne sont pas.
  color = colors.accent,
}: RoleMarkProps) {
  return <Ionicons name={ICONS[type]} size={size} color={color} />;
}

/** Libellé pour les lecteurs d'écran, où l'icône seule ne dit rien. */
export const ROLE_LABELS: Record<RoleMarkType, string> = {
  gp: 'GP — transporteur',
  merchant: 'Boutique',
};
