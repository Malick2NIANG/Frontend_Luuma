import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProductCategory } from '@/types/api.types';
import type { GpSummary } from '@/types/gp.types';

export const SORT_OPTIONS = [
  'relevance',
  'price_asc',
  'price_desc',
  'newest',
  'rating',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Pertinence',
  price_asc: 'Prix ↑',
  price_desc: 'Prix ↓',
  newest: 'Nouveautés',
  rating: 'Mieux notés',
};

export interface SearchFilters {
  q?: string;
  category?: ProductCategory;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  maxWeight?: number;
  minRating?: number;
  sort: SortOption;
}

export const EMPTY_FILTERS: SearchFilters = { sort: 'relevance' };

/** Nombre de filtres actifs — alimente la pastille du bouton « Filtrer ». */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.category) count += 1;
  if (filters.city) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  if (filters.maxWeight) count += 1;
  if (filters.minRating) count += 1;
  if (filters.sort !== 'relevance') count += 1;
  return count;
}

export interface SearchProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceEur: number | null;
  weight: number;
  images: string[];
  category: ProductCategory;
  subCategory: string | null;
  merchant: {
    id: string;
    shopName: string;
    city: string;
    country: string;
    rating: number;
    totalReviews: number;
  };
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchMerchant {
  id: string;
  shopName: string;
  city: string;
  country: string;
  description: string | null;
  rating: number;
  totalReviews: number;
  user: { name: string; avatar: string | null };
  _count: { followers: number; products: number };
}

export interface Suggestions {
  products: string[];
  merchants: { id: string; shopName: string; city: string }[];
  destinations: { destCity: string; destCountry: string }[];
}

/**
 * Retarde la propagation d'une valeur qui change à chaque frappe.
 *
 * Sans cela, « bazin » lancerait cinq recherches dont quatre déjà obsolètes à
 * leur retour — et sur un réseau lent, la dernière réponse reçue n'est pas
 * forcément la plus récente demandée.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useSearchProducts(filters: SearchFilters, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['search', 'products', filters],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SearchProduct>>(
        '/api/search/products',
        { params: pruneParams(filters) },
      );
      return data;
    },
  });
}

export function useSearchMerchants(q: string, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['search', 'merchants', q],
    queryFn: async () => {
      const { data } = await api.get<SearchMerchant[]>('/api/search/merchants', {
        params: q ? { q } : {},
      });
      return data;
    },
  });
}

export function useSearchGps(q: string, enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['search', 'gps', q],
    queryFn: async () => {
      const { data } = await api.get<GpSummary[]>('/api/gps', {
        params: q ? { q } : {},
      });
      return data;
    },
  });
}

/**
 * Suggestions pendant la frappe.
 *
 * Le serveur renvoie une liste vide en dessous de deux caractères ; on évite
 * quand même l'appel, sans quoi la première lettre tapée déclencherait une
 * requête dont la réponse est connue d'avance.
 */
export function useSuggestions(q: string) {
  const term = q.trim();

  return useQuery({
    enabled: term.length >= 2,
    queryKey: ['search', 'suggest', term],
    queryFn: async () => {
      const { data } = await api.get<Suggestions>('/api/search/suggest', {
        params: { q: term },
      });
      return data;
    },
    staleTime: 60_000,
  });
}

/** Retire les clés vides : `?city=` filtrerait sur la chaîne vide. */
function pruneParams(filters: SearchFilters): Record<string, unknown> {
  const entries = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== '' && value !== null,
  );
  return Object.fromEntries(entries);
}
