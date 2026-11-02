import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TripStatus } from '@/types/api.types';

export interface OwnTrip {
  id: string;
  originCity: string;
  originCountry: string;
  destCity: string;
  destCountry: string;
  departureDate: string;
  arrivalDate: string | null;
  pricePerKg: number;
  maxWeight: number;
  usedWeight: number;
  status: TripStatus;
  createdAt: string;
  packageCount: number;
  /** Calculé par le serveur : la même soustraction qu'à la commande. */
  remainingWeight: number;
}

export interface GpStats {
  upcomingTrips: number;
  completedTrips: number;
  toCollectCount: number;
  deliveredCount: number;
  estimatedEarningsEur: number;
  maxWeightPerTrip: number;
  rating: number;
  totalReviews: number;
  isApproved: boolean;
}

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  UPCOMING: 'À venir',
  COLLECTING: 'Collecte en cours',
  IN_TRANSIT: 'En voyage',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export function useOwnTrips() {
  return useQuery({
    queryKey: ['gp', 'trips'],
    queryFn: async () => {
      const { data } = await api.get<OwnTrip[]>('/api/gps/me/trips');
      return data;
    },
  });
}

export function useGpStats() {
  return useQuery({
    queryKey: ['gp', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<GpStats>('/api/gps/me/stats');
      return data;
    },
    staleTime: 30_000,
  });
}
