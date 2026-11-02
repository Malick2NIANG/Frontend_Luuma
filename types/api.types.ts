// Mirrors Backend/prisma/schema.prisma. Dates are ISO strings (JSON over HTTP).

/**
 * Les énumérations viennent de `generated.ts`, produit depuis schema.prisma.
 *
 * Elles étaient auparavant recopiées ici à la main, et rien ne pouvait
 * détecter leur dérive : une valeur d'énumération traverse le réseau comme
 * une chaîne, donc `category: string` acceptait n'importe quel texte — y
 * compris une valeur retirée du schéma la veille.
 */
// `import` ET `export` : le premier met les noms dans la portée de ce
// fichier — les interfaces ci-dessous les utilisent comme types de propriété —
// le second les remet à disposition des modules qui importent api.types.
// Un `export ... from` seul réexporterait sans rien introduire ici.
import type {
  ChatKind,
  DisputeStatus,
  ItemStatus,
  MessageType,
  NotifType,
  OrderStatus,
  PackageStatus,
  PaymentStatus,
  PaymentType,
  ProductCategory,
  ProductKind,
  ProductSize,
  ReviewType,
  RoleType,
  StoryMediaType,
  TripStatus,
} from './generated';

export type {
  ChatKind,
  DisputeStatus,
  ItemStatus,
  MessageType,
  NotifType,
  OrderStatus,
  PackageStatus,
  PaymentStatus,
  PaymentType,
  ProductCategory,
  ProductKind,
  ProductSize,
  ReviewType,
  RoleType,
  StoryMediaType,
  TripStatus,
};

export {
  ORDER_STATUS_VALUES,
  PACKAGE_STATUS_VALUES,
  PRODUCT_CATEGORIES,
  PRODUCT_KINDS,
  PRODUCT_SIZES,
} from './generated';

/**
 * Libellés affichés — délibérément absents du fichier généré : ils relèvent
 * de l'interface, pas du contrat de données, et se traduisent.
 */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  VETEMENTS: 'Vêtements',
  CHAUSSURES: 'Chaussures',
  BIJOUX_ACCESSOIRES: 'Bijoux & accessoires',
  ALIMENTAIRE: 'Alimentaire',
  COSMETIQUES: 'Cosmétiques & soins',
  ARTISANAT_DECO: 'Artisanat & décoration',
  ENFANT_BEBE: 'Enfant & bébé',
  MAISON: 'Maison',
  LIVRES_CULTURE: 'Livres & culture',
  AUTRE: 'Autre',
};

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  avatar?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  roles?: RoleType[];
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  userId: string;
  shopName: string;
  description?: string | null;
  address: string;
  city: string;
  country: string;
  idDocumentUrl?: string | null;
  isKycVerified: boolean;
  isApproved: boolean;
  rejectionNote?: string | null;
  payoutMethod?: string | null;
  payoutAccount?: string | null;
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface GP {
  id: string;
  userId: string;
  idDocumentUrl?: string | null;
  isKycVerified: boolean;
  isApproved: boolean;
  rejectionNote?: string | null;
  totalTrips: number;
  maxWeightPerTrip: number;
  payoutMethod?: string | null;
  payoutAccount?: string | null;
  rating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description?: string | null;
  price: number;
  priceEur?: number | null;
  weight: number;
  images: string[];
  category: ProductCategory;
  subCategory?: string | null;
  viewCount?: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  gpId: string;
  originCity: string;
  originCountry: string;
  destCity: string;
  destCountry: string;
  departureDate: string;
  arrivalDate?: string | null;
  pricePerKg: number;
  maxWeight: number;
  usedWeight: number;
  status: TripStatus;
  flightTicketUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  clientId: string;
  status: OrderStatus;
  subtotalEur: number;
  shippingEur: number;
  platformFeeEur: number;
  totalEur: number;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryCountry: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  merchantId: string;
  packageId?: string | null;
  quantity: number;
  unitPrice: number;
  weight: number;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: string;
  orderId: string;
  gpId: string;
  tripId: string;
  merchantId: string;
  status: PackageStatus;
  weight: number;
  prepPhotoUrl?: string | null;
  receptionPhotoUrl?: string | null;
  deliveryPhotoUrl?: string | null;
  refusalReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  recipientId?: string | null;
  stripeId?: string | null;
  waveRef?: string | null;
  omRef?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  orderId: string;
  messages?: Message[];
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content?: string | null;
  fileUrl?: string | null;
  duration?: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  type: ReviewType;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotifType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  resolution?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
