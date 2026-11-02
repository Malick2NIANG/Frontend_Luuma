import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';

export const PAYOUT_METHODS = ['wave', 'orange_money', 'bank'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

/** Le GP peut être payé par Stripe : la diaspora le règle depuis l'Europe. */
export const GP_PAYOUT_METHODS = [...PAYOUT_METHODS, 'stripe'] as const;
export type GpPayoutMethod = (typeof GP_PAYOUT_METHODS)[number];

export const PAYOUT_LABELS: Record<GpPayoutMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  bank: 'Virement bancaire',
  stripe: 'Carte bancaire (Stripe)',
};

export interface CreateMerchantInput {
  shopName: string;
  description?: string;
  address: string;
  city?: string;
  country?: string;
  /** Clé de stockage `kyc/…`, pas une URL : le bucket est privé. */
  idDocumentUrl?: string;
  payoutMethod?: PayoutMethod;
  payoutAccount?: string;
}

export interface CreateGpInput {
  idDocumentUrl?: string;
  payoutMethod?: GpPayoutMethod;
  payoutAccount?: string;
}

/**
 * Les messages métier du serveur sont déjà rédigés pour l'utilisateur.
 * `apiErrorMessage` les extrait quelle que soit leur forme, y compris le
 * tableau de `class-validator` imbriqué que la lecture manuelle d'origine
 * laissait retomber sur le message générique.
 */
function professionalError(error: unknown): string {
  return apiErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.');
}

/**
 * Dépôt d'un dossier commerçant.
 *
 * L'invalidation de `['me']` n'est pas un détail de confort : `useMe` garde
 * ses données une minute, donc sans elle le profil continuerait d'afficher
 * « Ouvrir une boutique » juste après le dépôt. L'utilisateur croirait que
 * rien ne s'est passé et recommencerait — pour se heurter à un « Vous avez
 * déjà une boutique ».
 */
export function useCreateMerchant() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateMerchantInput) => {
      const { data } = await api.post('/api/merchants', input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? professionalError(mutation.error) : null,
  };
}

export function useCreateGp() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateGpInput) => {
      const { data } = await api.post('/api/gps', input);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? professionalError(mutation.error) : null,
  };
}
