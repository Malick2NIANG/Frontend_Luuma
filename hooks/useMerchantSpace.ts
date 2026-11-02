import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import type { ProductCategory, ProductKind } from '@/types/api.types';

export interface OwnProduct {
  id: string;
  kind: ProductKind;
  name: string;
  price: number;
  priceEur: number | null;
  weight: number;
  images: string[];
  category: ProductCategory;
  subCategory: string | null;
  isAvailable: boolean;
  viewCount: number;
  unitLabel: string | null;
  minQuantity: number | null;
  productionDays: number | null;
  createdAt: string;
  variantCount: number;
  isOutOfStock: boolean;
}

export interface MerchantStats {
  productCount: number;
  availableCount: number;
  followersCount: number;
  toPrepareCount: number;
  soldCount: number;
  estimatedRevenueEur: number;
  isApproved: boolean;
}

export type ProductAvailabilityFilter = 'all' | 'available' | 'unavailable';

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function merchantError(error: unknown): string {
  return apiErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.');
}

/**
 * Le catalogue du commerçant, indisponibles compris.
 *
 * Distinct de `useCatalog`, qui interroge les routes publiques : celles-ci
 * filtrent sur `isAvailable` et sur l'approbation de la boutique, donc un
 * commerçant en attente n'y verrait rien de ce qu'il vient de créer.
 */
export function useOwnProducts(availability: ProductAvailabilityFilter = 'all') {
  return useQuery({
    queryKey: ['merchant', 'products', availability],
    queryFn: async () => {
      const { data } = await api.get<Paginated<OwnProduct>>(
        '/api/merchants/me/products',
        { params: { availability, limit: 50 } },
      );
      return data;
    },
  });
}

export function useMerchantStats() {
  return useQuery({
    queryKey: ['merchant', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<MerchantStats>('/api/merchants/me/stats');
      return data;
    },
    staleTime: 30_000,
  });
}

/**
 * Retirer ou remettre un produit en vente.
 *
 * Un interrupteur plutôt qu'une suppression : le produit a peut-être déjà
 * été commandé, et sa fiche doit rester lisible depuis les commandes
 * passées. Supprimer casserait l'historique du client.
 */
export function useToggleProductAvailability() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      productId,
      isAvailable,
    }: {
      productId: string;
      isAvailable: boolean;
    }) => {
      const { data } = await api.patch(`/api/products/${productId}`, {
        isAvailable,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['merchant'] });
      // Le fil et la recherche montrent le produit au public : ils doivent
      // refléter le retrait sans attendre l'expiration de leur cache.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? merchantError(mutation.error) : null,
  };
}
