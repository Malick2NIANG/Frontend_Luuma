// ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN
//
// Produit par Backend/scripts/generate-shared-types.ts depuis schema.prisma.
// Relancer après toute modification d'une énumération :
//
//     cd Backend && npm run types:generate
//
// Les libellés affichés ne sont PAS ici : ils relèvent de l'interface, pas du
// contrat de données. Voir api.types.ts.

export type StoryMediaType =
  | 'IMAGE'
  | 'VIDEO'
  | 'TEXT';

// Valeurs, pour itérer dans un menu ou un filtre.
export const STORY_MEDIA_TYPES: readonly StoryMediaType[] = [
  'IMAGE',
  'VIDEO',
  'TEXT',
] as const;

export type RoleType =
  | 'CLIENT'
  | 'MERCHANT'
  | 'GP'
  | 'ADMIN';

// Valeurs, pour itérer dans un menu ou un filtre.
export const ROLE_TYPES: readonly RoleType[] = [
  'CLIENT',
  'MERCHANT',
  'GP',
  'ADMIN',
] as const;

export type ProductCategory =
  | 'VETEMENTS'
  | 'CHAUSSURES'
  | 'BIJOUX_ACCESSOIRES'
  | 'ALIMENTAIRE'
  | 'COSMETIQUES'
  | 'ARTISANAT_DECO'
  | 'ENFANT_BEBE'
  | 'MAISON'
  | 'LIVRES_CULTURE'
  | 'AUTRE';

// Valeurs, pour itérer dans un menu ou un filtre.
export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'VETEMENTS',
  'CHAUSSURES',
  'BIJOUX_ACCESSOIRES',
  'ALIMENTAIRE',
  'COSMETIQUES',
  'ARTISANAT_DECO',
  'ENFANT_BEBE',
  'MAISON',
  'LIVRES_CULTURE',
  'AUTRE',
] as const;

export type ProductKind =
  | 'SIMPLE'
  | 'VARIANT'
  | 'MADE_TO_ORDER'
  | 'BY_LENGTH';

// Valeurs, pour itérer dans un menu ou un filtre.
export const PRODUCT_KINDS: readonly ProductKind[] = [
  'SIMPLE',
  'VARIANT',
  'MADE_TO_ORDER',
  'BY_LENGTH',
] as const;

export type ProductSize =
  | 'XS'
  | 'S'
  | 'M'
  | 'L'
  | 'XL'
  | 'XXL'
  | 'XXXL'
  | 'ONE_SIZE';

// Valeurs, pour itérer dans un menu ou un filtre.
export const PRODUCT_SIZES: readonly ProductSize[] = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'ONE_SIZE',
] as const;

export type TripStatus =
  | 'UPCOMING'
  | 'COLLECTING'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

// Valeurs, pour itérer dans un menu ou un filtre.
export const TRIP_STATUS_VALUES: readonly TripStatus[] = [
  'UPCOMING',
  'COLLECTING',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COLLECTING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDED';

// Valeurs, pour itérer dans un menu ou un filtre.
export const ORDER_STATUS_VALUES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'COLLECTING',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'DISPUTED',
  'REFUNDED',
] as const;

export type ItemStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'HANDED_TO_GP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

// Valeurs, pour itérer dans un menu ou un filtre.
export const ITEM_STATUS_VALUES: readonly ItemStatus[] = [
  'PENDING',
  'PREPARING',
  'HANDED_TO_GP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

export type PackageStatus =
  | 'AWAITING_DROPOFF'
  | 'DROPPED_OFF'
  | 'RECEIVED_BY_GP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'REFUSED'
  | 'CANCELLED';

// Valeurs, pour itérer dans un menu ou un filtre.
export const PACKAGE_STATUS_VALUES: readonly PackageStatus[] = [
  'AWAITING_DROPOFF',
  'DROPPED_OFF',
  'RECEIVED_BY_GP',
  'IN_TRANSIT',
  'DELIVERED',
  'REFUSED',
  'CANCELLED',
] as const;

export type PaymentType =
  | 'ESCROW_HOLD'
  | 'MERCHANT_PAYOUT'
  | 'GP_PAYOUT'
  | 'PLATFORM_FEE'
  | 'REFUND';

// Valeurs, pour itérer dans un menu ou un filtre.
export const PAYMENT_TYPES: readonly PaymentType[] = [
  'ESCROW_HOLD',
  'MERCHANT_PAYOUT',
  'GP_PAYOUT',
  'PLATFORM_FEE',
  'REFUND',
] as const;

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

// Valeurs, pour itérer dans un menu ou un filtre.
export const PAYMENT_STATUS_VALUES: readonly PaymentStatus[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
] as const;

export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VOICE'
  | 'FILE'
  | 'SYSTEM';

// Valeurs, pour itérer dans un menu ou un filtre.
export const MESSAGE_TYPES: readonly MessageType[] = [
  'TEXT',
  'IMAGE',
  'VOICE',
  'FILE',
  'SYSTEM',
] as const;

export type ChatKind =
  | 'ORDER'
  | 'DIRECT';

// Valeurs, pour itérer dans un menu ou un filtre.
export const CHAT_KINDS: readonly ChatKind[] = [
  'ORDER',
  'DIRECT',
] as const;

export type ReviewType =
  | 'CLIENT_TO_GP'
  | 'CLIENT_TO_MERCHANT'
  | 'GP_TO_CLIENT'
  | 'GP_TO_MERCHANT'
  | 'MERCHANT_TO_GP';

// Valeurs, pour itérer dans un menu ou un filtre.
export const REVIEW_TYPES: readonly ReviewType[] = [
  'CLIENT_TO_GP',
  'CLIENT_TO_MERCHANT',
  'GP_TO_CLIENT',
  'GP_TO_MERCHANT',
  'MERCHANT_TO_GP',
] as const;

export type NotifType =
  | 'ORDER_CONFIRMED'
  | 'PACKAGE_HANDED_TO_GP'
  | 'PACKAGE_RECEIVED_BY_GP'
  | 'GP_IN_TRANSIT'
  | 'ORDER_DELIVERED'
  | 'NEW_MESSAGE'
  | 'PAYMENT_RELEASED'
  | 'GP_CANCELLED_TRIP'
  | 'PACKAGE_REFUSED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED';

// Valeurs, pour itérer dans un menu ou un filtre.
export const NOTIF_TYPES: readonly NotifType[] = [
  'ORDER_CONFIRMED',
  'PACKAGE_HANDED_TO_GP',
  'PACKAGE_RECEIVED_BY_GP',
  'GP_IN_TRANSIT',
  'ORDER_DELIVERED',
  'NEW_MESSAGE',
  'PAYMENT_RELEASED',
  'GP_CANCELLED_TRIP',
  'PACKAGE_REFUSED',
  'KYC_APPROVED',
  'KYC_REJECTED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
] as const;

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED_CLIENT'
  | 'RESOLVED_MERCHANT'
  | 'CLOSED';

// Valeurs, pour itérer dans un menu ou un filtre.
export const DISPUTE_STATUS_VALUES: readonly DisputeStatus[] = [
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_CLIENT',
  'RESOLVED_MERCHANT',
  'CLOSED',
] as const;
