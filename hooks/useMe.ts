import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { RoleType } from '@/types/api.types';

/** Miroir de MeService (Backend/src/me/me.service.ts). */
export type ProfileState = 'none' | 'pending' | 'approved' | 'rejected';

export interface Capabilities {
  pay: boolean;
  openShop: boolean;
  becomeGp: boolean;
  manageShop: boolean;
  publishProduct: boolean;
  manageTrips: boolean;
  publishTrip: boolean;
  publishStory: boolean;
  administrate: boolean;
}

export interface LegalState {
  acceptedVersion: string | null;
  acceptedAt: string | null;
  currentVersion: string;
  needsAcceptance: boolean;
  marketingConsent: boolean;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  emailVerified: boolean;
  roles: RoleType[];
  merchant: { id: string; shopName: string; state: ProfileState } | null;
  gp: { id: string; state: ProfileState } | null;
  can: Capabilities;
  legal: LegalState;
}

/** Aucun droit — l'état d'un visiteur, et le repli pendant le chargement. */
const NO_CAPABILITIES: Capabilities = {
  pay: false,
  openShop: false,
  becomeGp: false,
  manageShop: false,
  publishProduct: false,
  manageTrips: false,
  publishTrip: false,
  publishStory: false,
  administrate: false,
};

/**
 * Qui est l'utilisateur, et ce qu'il a le droit de faire.
 *
 * Remplace l'ancien `useMyRoles`, qui interrogeait `/merchants/me` et
 * `/gps/me` en absorbant leurs 404, ignorait le rôle administrateur, et
 * surtout recomposait côté client des règles qui vivent dans les services.
 * C'est ce dernier point qui posait problème : la règle dupliquée finit
 * toujours par diverger, et l'écart se manifeste par un bouton actif suivi
 * d'un 403 incompréhensible.
 *
 * Ici le serveur répond directement aux questions de l'interface.
 */
export function useMe() {
  const { isAuthenticated, isHydrated } = useAuth();

  const query = useQuery({
    enabled: isAuthenticated,
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<Me>('/api/me');
      return data;
    },
    // Les droits changent à l'approbation d'un dossier ou à la vérification
    // d'un email — deux événements dont le client n'est pas prévenu. Une
    // minute de fraîcheur évite qu'un commerçant fraîchement validé reste
    // bloqué derrière un écran « en attente ».
    staleTime: 60_000,
  });

  return {
    ...query,
    me: query.data ?? null,
    /**
     * Toujours défini, même déconnecté ou pendant le chargement : sans cela,
     * chaque écran devrait écrire `me?.can?.publishProduct ?? false`, et
     * l'oubli d'un `?? false` afficherait brièvement un bouton interdit.
     */
    can: query.data?.can ?? NO_CAPABILITIES,
    isVisitor: isHydrated && !isAuthenticated,
  };
}
