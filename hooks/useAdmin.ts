import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';

/** Miroir d'AdminService.getStats (Backend/src/admin/admin.service.ts). */
export interface AdminStats {
  users: number;
  merchants: { pending: number; approved: number };
  gps: { pending: number; approved: number };
  activeTrips: number;
  products: number;
  orders: Record<string, number>;
  refusedPackages: number;
  escrowHeldEur: number;
}

/**
 * Tableau de bord de l'administration.
 *
 * `enabled` est piloté par l'élévation : sans elle le serveur répond 403, et
 * lancer la requête quand même remplirait la console d'erreurs prévisibles.
 *
 * La clé commence par `admin` pour que la sortie de l'espace puisse vider
 * d'un coup tout ce qui en relève.
 */
export function useAdminStats(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<AdminStats>('/api/admin/stats');
      return data;
    },
    staleTime: 30_000,
  });
}

// --- Instruction des dossiers ----------------------------------------------

/** Le postulant derrière le dossier — on approuve quelqu'un, pas une fiche. */
export interface Applicant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface PendingMerchant {
  id: string;
  shopName: string;
  description: string | null;
  address: string;
  city: string;
  country: string;
  idDocumentUrl: string | null;
  isKycVerified: boolean;
  rejectionNote: string | null;
  createdAt: string;
  user: Applicant;
  _count: { products: number };
}

export interface PendingGp {
  id: string;
  idDocumentUrl: string | null;
  isKycVerified: boolean;
  rejectionNote: string | null;
  totalTrips: number;
  maxWeightPerTrip: number;
  createdAt: string;
  user: Applicant;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export type ApplicationKind = 'merchant' | 'gp';

export function usePendingApplications<
  K extends ApplicationKind,
>(kind: K, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ['admin', 'pending', kind],
    queryFn: async () => {
      const path = kind === 'merchant' ? 'merchants' : 'gps';
      const { data } = await api.get<
        Paginated<K extends 'merchant' ? PendingMerchant : PendingGp>
      >(`/api/admin/${path}/pending`);
      return data;
    },
    // Court : plusieurs administrateurs peuvent instruire en même temps, et
    // rien n'est pire que d'approuver un dossier déjà traité par un autre.
    staleTime: 10_000,
  });
}

/**
 * Approbation et rejet.
 *
 * Les deux invalident les statistiques EN PLUS de la liste : le compteur
 * « dossiers en attente » du tableau de bord vient d'une autre requête, et
 * resterait faux jusqu'à sa péremption.
 */
function useApplicationAction<TBody>(
  kind: ApplicationKind,
  action: 'approve' | 'reject',
) {
  const queryClient = useQueryClient();
  const path = kind === 'merchant' ? 'merchants' : 'gps';

  const mutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: TBody }) => {
      await api.patch(`/api/admin/${path}/${id}/${action}`, body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pending', kind] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error
      ? apiErrorMessage(mutation.error, "L'opération a échoué. Réessayez.")
      : null,
  };
}

export function useApproveApplication(kind: ApplicationKind) {
  return useApplicationAction<{ markKycVerified?: boolean }>(kind, 'approve');
}

export function useRejectApplication(kind: ApplicationKind) {
  return useApplicationAction<{ rejectionNote: string }>(kind, 'reject');
}

/**
 * URL temporaire vers une pièce d'identité.
 *
 * Demandée à la volée, jamais mise en cache : c'est le document le plus
 * sensible de la plateforme, et l'URL signée expire. La garder en mémoire
 * prolongerait artificiellement un accès que le serveur a voulu court.
 */
export function useKycDocument(kind: ApplicationKind) {
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.get<{ url: string }>(
        `/api/admin/${kind}/${id}/kyc-document`,
      );
      return data.url;
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error
      ? apiErrorMessage(mutation.error, "Impossible d'ouvrir le document.")
      : null,
  };
}
