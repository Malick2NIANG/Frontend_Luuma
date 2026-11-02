/** Miroir de GpsService.list / findById. */

export interface GpTrip {
  id: string;
  originCity: string;
  destCity: string;
  destCountry: string;
  departureDate: string;
  pricePerKg: number;
  maxWeight: number;
  usedWeight: number;
}

export interface GpSummary {
  id: string;
  rating: number;
  totalReviews: number;
  totalTrips: number;
  maxWeightPerTrip: number;
  createdAt: string;
  /** `user.id` sert à ouvrir une conversation directe, pas `id`. */
  user: { id: string; name: string; avatar: string | null };
  followersCount: number;
  isFollowedByMe: boolean;
  trips: GpTrip[];
}
