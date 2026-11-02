import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { MyStory, StoryGroup } from '@/types/story.types';

/**
 * Le bandeau de l'accueil.
 *
 * Réservé aux comptes : une story n'est visible que des abonnés et des
 * personnes avec qui l'on a une commande en cours — un visiteur n'a par
 * construction personne à voir. La requête est donc désactivée sans session
 * plutôt que d'aller chercher un 401.
 */
export function useStoryFeed() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated,
    queryKey: ['stories', 'feed'],
    queryFn: async () => {
      const { data } = await api.get<StoryGroup[]>('/api/stories/feed');
      return data;
    },
    // Une story vit 24 h : inutile de reinterroger à chaque retour d'écran,
    // mais assez court pour qu'une publication récente apparaisse vite.
    staleTime: 60_000,
  });
}

export function useMyStories() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated,
    queryKey: ['stories', 'mine'],
    queryFn: async () => {
      const { data } = await api.get<MyStory[]>('/api/stories/mine');
      return data;
    },
  });
}

/**
 * Marque une story comme vue.
 *
 * Volontairement silencieux : l'appel part pendant la lecture, et un échec
 * réseau ne doit ni interrompre le défilement ni afficher quoi que ce soit.
 * Au pire, l'anneau reste coloré et la story sera revue.
 */
export function useMarkStorySeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storyId: string) => {
      await api.post(`/api/stories/${storyId}/view`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
    },
    onError: () => {
      // Silence assumé — voir le commentaire ci-dessus.
    },
  });
}
