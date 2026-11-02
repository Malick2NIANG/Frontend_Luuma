import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Merchant,
  Product,
  ProductKind,
  ProductSize,
  Trip,
} from '@/types/api.types';

/** Enveloppe de pagination renvoyée par les endpoints de recherche. */
interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProductWithMerchant = Product & {
  merchant: Pick<
    Merchant,
    'id' | 'shopName' | 'city' | 'country' | 'rating' | 'totalReviews'
  > & {
    /** Le COMPTE derrière la boutique — cible du bouton « Message ». */
    user: { id: string };
  };
};

/** Une déclinaison achetable, telle que renvoyée par GET /products/:id. */
export interface ProductVariant {
  id: string;
  size: ProductSize | null;
  /** Libellé du commerçant s'il diffère de l'énumération : « 42/44 ». */
  sizeLabel: string | null;
  colorName: string | null;
  colorHex: string | null;
  /** Poids propre à cette déclinaison, en kg. Prime sur celui du produit. */
  weight: number;
  /** Nul = le prix du produit s'applique. */
  price: number | null;
  /** Nul = stock non suivi. 0 = épuisé. */
  stock: number | null;
  images: string[];
  isAvailable: boolean;
}

/** La fiche produit complète, avec ce qu'il faut pour choisir avant d'acheter. */
export type ProductDetail = ProductWithMerchant & {
  kind: ProductKind;
  variants: ProductVariant[];
  unitLabel: string | null;
  minQuantity: number | null;
  productionDays: number | null;
  requiredMeasurements: string[];
  /** Toujours `false` pour un visiteur : rien à croiser sans compte. */
  isFavorited: boolean;
};

export interface ProductFilters {
  q?: string;
  category?: string;
  merchantId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Recherche paginée du catalogue.
 *
 * `useInfiniteQuery` plutôt que `useQuery` : sur mobile la liste se parcourt
 * au défilement, pas par numéros de page.
 */
export function useProductSearch(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', 'search', filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<Paginated<ProductWithMerchant>>(
        // `/api/search/products` remplace l'ancien `/api/products/search` :
        // classement par pertinence, accents et fautes tolérés, filtres poids
        // et note.
        '/api/search/products',
        { params: { ...filters, page: pageParam, limit: 20 } },
      );
      return data;
    },
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ProductDetail>(`/api/products/${id}`);
      return data;
    },
  });
}

/**
 * Boutique publique. Le backend retire les champs sensibles (KYC, coordonnées
 * de paiement) et n'expose que les produits encore disponibles — leurs objets
 * n'embarquent donc pas `merchantId`, déductible de la boutique elle-même.
 */
export type MerchantShop = Pick<
  Merchant,
  'id' | 'shopName' | 'description' | 'city' | 'country' | 'rating' | 'totalReviews' | 'createdAt'
> & {
  user: { id: string; name: string; avatar: string | null };
  products: Omit<Product, 'merchantId' | 'isAvailable' | 'updatedAt'>[];
  followersCount: number;
  isFollowedByMe: boolean;
};

/** Profil public d'un GP + ses trajets à venir encore ouverts. */
export interface GpProfile {
  id: string;
  rating: number;
  totalReviews: number;
  totalTrips: number;
  createdAt: string;
  user: { name: string; avatar: string | null };
  trips: {
    id: string;
    originCity: string;
    destCity: string;
    destCountry: string;
    departureDate: string;
    pricePerKg: number;
    maxWeight: number;
    usedWeight: number;
  }[];
  followersCount: number;
  isFollowedByMe: boolean;
}

export function useGp(id: string | undefined) {
  return useQuery({
    queryKey: ['gps', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<GpProfile>(`/api/gps/${id}`);
      return data;
    },
  });
}

export function useMerchant(id: string | undefined) {
  return useQuery({
    queryKey: ['merchants', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<MerchantShop>(`/api/merchants/${id}`);
      return data;
    },
  });
}

export type TripWithGp = Trip & {
  gp: {
    id: string;
    rating: number;
    totalTrips: number;
    user: { name: string; avatar: string | null };
  };
};

export interface TripFilters {
  destCity: string;
  destCountry: string;
  date?: string;
}

/**
 * Trajets desservant une ville, du départ le plus proche au plus lointain.
 * Le backend écarte déjà ceux dont la capacité est épuisée.
 */
export function useTripSearch(filters: TripFilters | null) {
  return useQuery({
    queryKey: ['trips', 'search', filters],
    enabled: Boolean(filters?.destCity && filters?.destCountry),
    queryFn: async () => {
      const { data } = await api.get<Paginated<Trip>>('/api/trips/search', {
        params: { ...filters, limit: 50 },
      });
      return data;
    },
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: ['trips', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<TripWithGp>(`/api/trips/${id}`);
      return data;
    },
  });
}
