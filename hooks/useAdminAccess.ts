import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';

/** Miroir d'AdminAccessService (Backend/src/admin/admin-access.service.ts). */
export interface AdminAccessState {
  elevated: boolean;
  expiresAt: string | null;
  codePending: boolean;
  resendInSeconds: number;
}

export const ADMIN_CODE_LENGTH = 6;

/**
 * Les messages du serveur portent ici l'information utile — essais restants,
 * délai à attendre, code expiré. `apiErrorMessage` sait les extraire quelles
 * que soient les trois formes d'emballage de NestJS ; un test sur la seule
 * chaîne, comme je l'avais écrit d'abord, les jetait tous.
 */
function accessError(error: unknown): string {
  return apiErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.');
}

/**
 * État de l'élévation de CETTE session vers l'administration.
 *
 * Interrogé à chaque montage plutôt que gardé en mémoire : l'élévation vit
 * côté serveur, attachée à la session. Un état local prétendrait savoir ce
 * que seul le serveur sait, et se tromperait dès qu'une élévation expire ou
 * qu'on la révoque depuis un autre endroit.
 */
export function useAdminAccessState(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['admin-access'],
    queryFn: async () => {
      const { data } = await api.get<AdminAccessState>('/api/admin/access');
      return data;
    },
    // Aucune mise en cache : c'est un contrôle d'accès. Servir une réponse
    // périmée ouvrirait l'écran à une session qui ne l'est plus.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useRequestAdminCode() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{
        sentTo: string;
        expiresInMinutes: number;
      }>('/api/admin/access/request');
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-access'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? accessError(mutation.error) : null,
  };
}

export function useVerifyAdminCode() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post<AdminAccessState>(
        '/api/admin/access/verify',
        { code },
      );
      return data;
    },
    onSuccess: (state) => {
      queryClient.setQueryData(['admin-access'], state);
      // Les données d'administration n'ont jamais pu être chargées jusqu'ici :
      // elles répondaient 403. Il faut donc les redemander maintenant.
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? accessError(mutation.error) : null,
  };
}

/** Quitter l'administration sans se déconnecter de l'application. */
export function useRevokeAdminAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/api/admin/access');
    },
    onSuccess: () => {
      queryClient.setQueryData(['admin-access'], {
        elevated: false,
        expiresAt: null,
        codePending: false,
        resendInSeconds: 0,
      } satisfies AdminAccessState);
      // Les dossiers et statistiques déjà chargés sortent du cache : ils ne
      // doivent pas rester lisibles sur un poste qu'on vient de refermer.
      queryClient.removeQueries({ queryKey: ['admin'] });
    },
  });
}
