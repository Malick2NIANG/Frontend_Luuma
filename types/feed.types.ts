/** Miroir de FeedItem / FeedAuthor définis dans Backend/src/feed/feed.service.ts. */

import type { ProductCategory, ProductKind } from './api.types';

export type FeedAuthorType = 'merchant' | 'gp';

export interface FeedAuthor {
  type: FeedAuthorType;
  /** Identifiant du profil (boutique ou GP). */
  id: string;
  /** Identifiant du compte : une conversation se noue entre comptes. */
  userId: string;
  name: string;
  avatar: string | null;
  city: string | null;
  rating: number;
  totalReviews: number;
  followersCount: number;
  isFollowedByMe: boolean;
}

export interface FeedProduct {
  id: string;
  name: string;
  /**
   * Détermine si le produit peut être ajouté au panier depuis le fil.
   * Tout ce qui n'est pas `SIMPLE` exige un choix préalable sur la fiche.
   */
  kind: ProductKind;
  description: string | null;
  /** En XOF, tel que publié par le commerçant. */
  price: number;
  priceEur: number | null;
  weight: number;
  images: string[];
  category: ProductCategory;
  subCategory: string | null;
  /** Toujours `false` pour un visiteur : le serveur n'a alors rien à croiser. */
  isFavorited: boolean;
}

export interface FeedTrip {
  id: string;
  originCity: string;
  destCity: string;
  destCountry: string;
  departureDate: string;
  pricePerKg: number;
  maxWeight: number;
  usedWeight: number;
  remainingWeight: number;
}

interface FeedItemBase {
  /** Préfixé par type (`product:` / `trip:`) : unique tous types confondus. */
  id: string;
  publishedAt: string;
  author: FeedAuthor;
}

export type FeedItem =
  | (FeedItemBase & { kind: 'product'; product: FeedProduct })
  | (FeedItemBase & { kind: 'trip'; trip: FeedTrip });

export interface FeedPage {
  items: FeedItem[];
  /** null quand le fil est épuisé. Peut être non nul avec `items` vide. */
  nextCursor: string | null;
}

export type FeedScope = 'all' | 'products' | 'trips' | 'following';
