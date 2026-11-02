import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthGate } from '@/hooks/useRequireAuth';
import type { Conversation } from '@/types/chat.types';

export function useConversations() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    enabled: isAuthenticated,
    queryKey: ['chat', 'conversations'],
    queryFn: async () => {
      const { data } = await api.get<Conversation[]>('/api/chat');
      return data;
    },
    // L'onglet Messages est consulté souvent et brièvement : on le rafraîchit
    // à chaque ouverture plutôt que de risquer un compteur de non-lus périmé.
    staleTime: 0,
  });
}

/**
 * Ouvre la conversation directe avec un compte et y navigue.
 *
 * L'appel est idempotent côté serveur : appuyer deux fois sur « Message »
 * rouvre le même fil au lieu d'en créer un second. Le client n'a donc rien à
 * mémoriser ni à désactiver pendant l'aller-retour.
 */
export function useOpenDirectChat() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuthGate();

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post<{ chatId: string; created: boolean }>(
        '/api/chat/direct',
        { userId },
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      router.push(`/(app)/chat/${data.chatId}`);
    },
  });

  const open = (userId: string, returnTo = '/(app)/(tabs)') => {
    if (!requireAuth(returnTo)) return;
    mutation.mutate(userId);
  };

  return { ...mutation, open };
}
