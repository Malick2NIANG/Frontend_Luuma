import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import type { PackageStatus } from '@/types/api.types';

export interface PackageItem {
  id: string;
  quantity: number;
  unitPrice: number;
  weight: number;
  variantLabel: string | null;
  product: { id: string; name: string; images: string[] };
}

export interface MerchantPackage {
  id: string;
  status: PackageStatus;
  weight: number;
  prepPhotoUrl: string | null;
  createdAt: string;
  merchant: { id: string; shopName: string; city: string };
  items: PackageItem[];
  trip: {
    id: string;
    originCity: string;
    destCity: string;
    destCountry: string;
    departureDate: string;
    pricePerKg: number;
    status: string;
  };
}

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  AWAITING_DROPOFF: 'À remettre au GP',
  DROPPED_OFF: 'Remis au GP',
  RECEIVED_BY_GP: 'Réception confirmée',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livré',
  REFUSED: 'Refusé par le GP',
  CANCELLED: 'Annulé',
};

/**
 * Les refus métier du serveur — « cette commande n'est pas encore payée » —
 * sont déjà rédigés pour le commerçant : les remplacer par un message
 * générique lui retirerait la seule information utile. Ils arrivent imbriqués
 * (notre filtre d'exceptions emballe la réponse de NestJS) : `apiErrorMessage`
 * les en extrait.
 */
function packageError(error: unknown): string {
  return apiErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.');
}

export function useGpPackages() {
  return useQuery({
    queryKey: ['packages', 'gp'],
    queryFn: async () => {
      const { data } = await api.get<MerchantPackage[]>('/api/packages/gp');
      return data;
    },
  });
}

/**
 * Les trois gestes du GP sur un colis : accuser réception, livrer, refuser.
 *
 * Regroupés dans un seul hook parce qu'ils partagent exactement les mêmes
 * invalidations : chacun déplace le colis d'un état à l'autre et met à jour le
 * suivi de la commande côté client.
 */
export function useGpPackageAction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      packageId,
      action,
      photoUrl,
      refusalReason,
    }: {
      packageId: string;
      action: 'receive' | 'deliver' | 'refuse';
      photoUrl?: string;
      refusalReason?: string;
    }) => {
      const body =
        action === 'refuse'
          ? { refusalReason }
          : action === 'receive'
            ? { receptionPhotoUrl: photoUrl }
            : { deliveryPhotoUrl: photoUrl };

      const { data } = await api.patch(
        `/api/packages/${packageId}/${action}`,
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['packages'] });
      void queryClient.invalidateQueries({ queryKey: ['gp'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? packageError(mutation.error) : null,
  };
}

export function useMerchantPackages() {
  return useQuery({
    queryKey: ['packages', 'merchant'],
    queryFn: async () => {
      const { data } = await api.get<MerchantPackage[]>('/api/packages/merchant');
      return data;
    },
  });
}

/**
 * Remise du colis au GP.
 *
 * La photo est facultative côté API, mais l'écran la réclame : c'est elle qui
 * fait foi si le GP conteste l'état ou le contenu à la réception. Sans elle,
 * la parole du commerçant vaut celle du GP, et le litige n'a plus d'arbitre.
 */
export function useDropOffPackage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      packageId,
      prepPhotoUrl,
    }: {
      packageId: string;
      prepPhotoUrl?: string;
    }) => {
      const { data } = await api.patch(`/api/packages/${packageId}/drop-off`, {
        prepPhotoUrl,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['packages'] });
      // Le compteur « à préparer » de l'espace commerçant en dépend.
      void queryClient.invalidateQueries({ queryKey: ['merchant'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? packageError(mutation.error) : null,
  };
}
