import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthGate } from '@/hooks/useRequireAuth';
import type { ProductCategory } from '@/types/api.types';

export interface FavoriteEntry {
  favoritedAt: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    priceEur: number | null;
    weight: number;
    images: string[];
    category: ProductCategory;
    subCategory: string | null;
    isAvailable: boolean;
  };
  merchant: {
    id: string;
    name: string;
    city: string;
    avatar: string | null;
    rating: number;
    totalReviews: number;
  };
}

export function useFavorites() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated,
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await api.get<FavoriteEntry[]>('/api/favorites');
      return data;
    },
  });
}

/**
 * Bascule le favori d'un produit.
 *
 * Contrairement à l'abonnement, la bascule est optimiste : l'état est un
 * simple booléen personnel, sans compteur partagé à recalculer côté serveur.
 * Attendre l'aller-retour donnerait un cœur qui « colle » — le défaut le plus
 * visible sur un geste que l'on répète en parcourant le fil.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { requireAuth } = useAuthGate();

  const mutation = useMutation({
    mutationFn: async (input: { productId: string; isFavorited: boolean }) => {
      const body = { productId: input.productId };

      const { data } = input.isFavorited
        ? await api.delete('/api/favorites', { data: body })
        : await api.post('/api/favorites', body);

      return data as { favorited: boolean; productId: string };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });

  const toggle = (input: { productId: string; isFavorited: boolean }) => {
    if (!requireAuth('/(app)/(tabs)')) return;
    mutation.mutate(input);
  };

  return { ...mutation, toggle };
}
