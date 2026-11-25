import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

export type NotifCategorie = 'COMMANDES' | 'COLIS' | 'COMPTE';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  /** `lien` : la page de l'application que la notification concerne. */
  data: { lien?: string } | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsPage {
  items: AppNotification[];
  nextCursor: string | null;
}

export interface NotificationFilters {
  q?: string;
  categorie?: NotifCategorie;
}

/**
 * Nombre de notifications non lues, pour le badge de la cloche.
 *
 * Relu chaque minute et au retour sur l'application : il n'y a pas encore de
 * canal temps réel pour les notifications, et une cloche figée depuis le
 * matin ne sert à rien.
 */
export function useUnreadNotifications() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated,
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>(
        '/api/notifications/unread-count',
      );
      return data.count;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/** Liste paginée par curseur : 20 par page, la suite au défilement. */
export function useNotificationsList(
  filters: NotificationFilters,
  enabled: boolean,
) {
  const { isAuthenticated } = useAuth();

  return useInfiniteQuery({
    enabled: enabled && isAuthenticated,
    queryKey: ['notifications', 'list', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<NotificationsPage>('/api/notifications', {
        params: {
          limit: 20,
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.categorie ? { categorie: filters.categorie } : {}),
        },
      });
      return data;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/**
 * Tout marquer lu jusqu'à `jusqua` — la plus récente notification affichée.
 *
 * Le badge et les points s'éteignent tout de suite, sans attendre le serveur :
 * c'est le moment où la personne referme le panneau, elle doit voir la cloche
 * redevenir propre.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jusqua: string | undefined) => {
      await api.post('/api/notifications/read-all', jusqua ? { jusqua } : {});
    },
    onMutate: () => {
      queryClient.setQueryData(['notifications', 'unread'], 0);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
