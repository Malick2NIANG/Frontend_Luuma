import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Me } from '@/hooks/useMe';

export type LegalDocumentId = 'terms' | 'privacy';

export interface LegalDocument {
  id: LegalDocumentId;
  title: string;
  version: string;
  updatedAt: string;
  body: string;
}

/**
 * Version courante des conditions, telle que le serveur la connaît.
 *
 * C'est elle — et non une constante figée dans l'application — qui est
 * enregistrée à l'inscription. Une version codée en dur dérive dès la
 * première correction juridique : le texte lu serait le nouveau, la version
 * enregistrée l'ancienne, et la preuve d'acceptation porterait sur un
 * document que l'utilisateur n'a jamais vu.
 */
export function useTermsVersion() {
  return useQuery({
    queryKey: ['legal', 'version'],
    queryFn: async () => {
      const { data } = await api.get<{ version: string }>('/api/legal/version');
      return data.version;
    },
    // Une version qui change en cours de session n'a pas de sens : on la lit
    // une fois au lancement.
    staleTime: Infinity,
  });
}

export function useLegalDocument(id: LegalDocumentId) {
  return useQuery({
    queryKey: ['legal', id],
    queryFn: async () => {
      const { data } = await api.get<LegalDocument>(`/api/legal/${id}`);
      return data;
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Acceptation des conditions générales.
 *
 * Invalide `['me']` plutôt que d'écrire dans le cache : c'est la réponse du
 * serveur qui fait foi sur `needsAcceptance`, et une écriture optimiste ferait
 * disparaître l'écran bloquant avant que l'enregistrement soit confirmé.
 */
export function useAcceptTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      version,
      marketingConsent,
    }: {
      version: string;
      marketingConsent: boolean;
    }) => {
      const { data } = await api.post<Me>('/api/me/accept-terms', {
        version,
        marketingConsent,
      });
      return data;
    },
    onSuccess: (me) => {
      queryClient.setQueryData(['me'], me);
    },
  });
}

/**
 * Accord commercial : donner ou retirer.
 *
 * Mise à jour optimiste — l'interrupteur doit répondre au doigt. En cas
 * d'échec on revient à l'état précédent plutôt que de laisser croire qu'un
 * retrait a été enregistré alors qu'il ne l'a pas été.
 */
export function useSetMarketingConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accepted: boolean) => {
      const { data } = await api.post<{ marketingConsent: boolean }>(
        '/api/me/marketing-consent',
        { accepted },
      );
      return data.marketingConsent;
    },
    onMutate: async (accepted) => {
      await queryClient.cancelQueries({ queryKey: ['me'] });
      const previous = queryClient.getQueryData<Me>(['me']);

      if (previous) {
        queryClient.setQueryData<Me>(['me'], {
          ...previous,
          legal: { ...previous.legal, marketingConsent: accepted },
        });
      }

      return { previous };
    },
    onError: (_error, _accepted, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['me'], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
