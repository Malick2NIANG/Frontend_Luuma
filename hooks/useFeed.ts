import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { FeedItem, FeedPage, FeedScope } from '@/types/feed.types';

export interface FeedFilters {
  scope?: FeedScope;
  q?: string;
  city?: string;
}

const PAGE_SIZE = 10;

/**
 * Fil d'actualité paginé par curseur.
 *
 * Le serveur peut renvoyer une page VIDE avec un curseur non nul : cela se
 * produit quand tous les éléments d'un tour ont été filtrés (des trajets
 * complets, par exemple). Sans traitement, la liste ne grandirait pas,
 * `onEndReached` ne se redéclencherait jamais, et le défilement se bloquerait
 * sur un fil pourtant non épuisé — d'où l'enchaînement automatique ci-dessous.
 */
export function useFeed(filters: FeedFilters = {}) {
  const query = useInfiniteQuery({
    queryKey: ['feed', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<FeedPage>('/api/feed', {
        params: {
          scope: filters.scope ?? 'all',
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.city ? { city: filters.city } : {}),
          ...(pageParam ? { before: pageParam } : {}),
          limit: PAGE_SIZE,
        },
      });
      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const items: FeedItem[] = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  // Enchaîne tant que le serveur annonce une suite sans rien avoir livré.
  useEffect(() => {
    const lastPage = data?.pages.at(-1);
    if (
      lastPage &&
      lastPage.items.length === 0 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [data, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { ...query, items };
}
