import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthGate } from '@/hooks/useRequireAuth';
import type { FeedAuthorType } from '@/types/feed.types';

interface FollowResponse {
  following: boolean;
  followersCount: number;
}

export interface FollowingList {
  merchants: {
    id: string;
    shopName: string;
    city: string;
    rating: number;
    totalReviews: number;
    user: { name: string; avatar: string | null };
    _count: { followers: number; products: number };
  }[];
  gps: {
    id: string;
    rating: number;
    totalReviews: number;
    totalTrips: number;
    user: { name: string; avatar: string | null };
    _count: { followers: number; trips: number };
  }[];
}

/**
 * Bascule l'abonnement d'un compte.
 *
 * Le fil est invalidé après coup plutôt que mis à jour de façon optimiste :
 * `followersCount` est calculé côté serveur, et l'afficher à l'estime
 * produirait un écart visible si deux appareils suivent en même temps.
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();
  const { requireAuth } = useAuthGate();

  const mutation = useMutation({
    mutationFn: async (input: {
      target: FeedAuthorType;
      targetId: string;
      isFollowing: boolean;
    }) => {
      const body = { target: input.target, targetId: input.targetId };

      const { data } = input.isFollowing
        ? await api.delete<FollowResponse>('/api/follows', { data: body })
        : await api.post<FollowResponse>('/api/follows', body);

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['follows'] });
    },
  });

  /**
   * S'abonner engage : un visiteur est renvoyé vers la connexion, avec retour
   * sur le fil une fois le compte créé.
   */
  const toggle = (input: {
    target: FeedAuthorType;
    targetId: string;
    isFollowing: boolean;
  }) => {
    if (!requireAuth('/(app)/(tabs)')) return;
    mutation.mutate(input);
  };

  return { ...mutation, toggle };
}

export function useFollowing(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['follows', 'list'],
    queryFn: async () => {
      const { data } = await api.get<FollowingList>('/api/follows');
      return data;
    },
  });
}
