import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import {
  TRIP_STATUS_LABELS,
  useGpStats,
  useOwnTrips,
  type OwnTrip,
} from '@/hooks/useGpSpace';
import { useMe } from '@/hooks/useMe';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import type { TripStatus } from '@/types/api.types';

/** Le rouge reste réservé à ce qui a mal tourné. */
const STATUS_TONE: Record<TripStatus, { bg: string; text: string }> = {
  UPCOMING: { bg: 'bg-amber-50', text: 'text-amber-900' },
  COLLECTING: { bg: 'bg-emerald-50', text: 'text-primary' },
  IN_TRANSIT: { bg: 'bg-blue-50', text: 'text-blue-900' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-600' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-900' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-[17px] font-bold text-gray-900">{value}</Text>
      <Text className="mt-0.5 text-center text-[10px] text-gray-500">{label}</Text>
    </View>
  );
}

function TripCard({ trip }: { trip: OwnTrip }) {
  const router = useRouter();
  const tone = STATUS_TONE[trip.status];

  // La valise remplie à 100 % n'accepte plus de colis : c'est l'information
  // qui décide si le GP doit relancer sa publication ou non.
  const fillRatio =
    trip.maxWeight > 0 ? Math.min(1, trip.usedWeight / trip.maxWeight) : 0;
  const isFull = trip.remainingWeight <= 0;

  return (
    <Pressable
      onPress={() => router.push(`/(app)/trips/${trip.id}`)}
      className="mx-3.5 mb-3 overflow-hidden rounded-xl border border-gray-200"
    >
      <View className={['flex-row items-center justify-between px-3 py-2', tone.bg].join(' ')}>
        <Text className={['text-[11.5px] font-bold', tone.text].join(' ')}>
          {TRIP_STATUS_LABELS[trip.status]}
        </Text>
        <Text className={['text-[11px]', tone.text].join(' ')}>
          {trip.pricePerKg.toFixed(2)} € / kg
        </Text>
      </View>

      <View className="p-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="airplane-outline" size={14} color="#6B7280" />
          <Text className="flex-1 text-[13px] font-semibold text-gray-900">
            {trip.originCity} → {trip.destCity}
          </Text>
        </View>
        <Text className="mt-0.5 text-[11px] text-gray-500">
          Départ le {formatDate(trip.departureDate)}
          {trip.packageCount > 0
            ? ` · ${trip.packageCount} colis`
            : ' · aucun colis'}
        </Text>

        <View className="mt-3">
          <View className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <View
              style={{ width: `${fillRatio * 100}%` }}
              className={isFull ? 'h-full bg-red-400' : 'h-full bg-primary'}
            />
          </View>
          <Text className="mt-1 text-[10.5px] text-gray-500">
            {trip.usedWeight.toFixed(1)} / {trip.maxWeight.toFixed(1)} kg utilisés
            {isFull
              ? ' · valise pleine'
              : ` · ${trip.remainingWeight.toFixed(1)} kg disponibles`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Espace GP — onglet permanent, pendant exact de l'espace commerçant.
 *
 * L'onglet n'apparaît que si le compte a un profil GP. Un compte qui cumule
 * boutique et GP voit les deux : les rôles s'additionnent, la barre s'allonge,
 * rien ne bascule.
 */
export default function GpSpaceScreen() {
  const router = useRouter();
  const { isReady } = useRequireAuth('/(app)/(tabs)/gp');
  const { me } = useMe();

  const { data: stats } = useGpStats();
  const { data: trips, isLoading, isError, refetch } = useOwnTrips();

  if (!isReady) return <View className="flex-1 bg-white" />;

  if (me && !me.gp) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <EmptyState
          icon="airplane-outline"
          title="Vous n'êtes pas encore GP"
          description="Déclarez vos voyages et rentabilisez les kilos que vous ne remplissez pas."
          actionLabel="Devenir GP"
          onAction={() => router.replace('/(app)/gp/onboarding')}
        />
      </SafeAreaView>
    );
  }

  const isPending = me?.gp?.state === 'pending';
  const isRejected = me?.gp?.state === 'rejected';

  const upcoming = trips?.filter((t) => t.status === 'UPCOMING' || t.status === 'COLLECTING') ?? [];
  const past = trips?.filter((t) => t.status !== 'UPCOMING' && t.status !== 'COLLECTING') ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Text className="text-lg font-bold text-gray-900">Mes voyages</Text>
      </View>

      <ScrollView contentContainerClassName="pb-24">
        {isPending ? (
          <View className="mx-3.5 mt-3 flex-row gap-2.5 rounded-xl bg-amber-50 p-3">
            <Ionicons name="time-outline" size={18} color="#B45309" />
            <Text className="flex-1 text-[12px] leading-[17px] text-amber-900">
              Votre profil GP est en cours de validation. Vous pouvez déjà
              préparer un trajet : il ne sera proposé aux acheteurs qu'après
              l'approbation.
            </Text>
          </View>
        ) : null}

        {isRejected ? (
          <View className="mx-3.5 mt-3 flex-row gap-2.5 rounded-xl bg-red-50 p-3">
            <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
            <Text className="flex-1 text-[12px] leading-[17px] text-red-900">
              Votre dossier a été refusé. Contactez le support pour connaître les
              corrections attendues.
            </Text>
          </View>
        ) : null}

        <View className="flex-row border-b border-gray-100 px-3.5 py-4">
          <Stat value={stats?.upcomingTrips ?? 0} label="À venir" />
          <Stat value={stats?.toCollectCount ?? 0} label="À récupérer" />
          <Stat value={stats?.completedTrips ?? 0} label="Voyages faits" />
          <Stat
            value={stats ? `${stats.maxWeightPerTrip} kg` : '—'}
            label="Capacité"
          />
        </View>

        {/* Le palier de confiance se mérite : l'annoncer explicitement évite
            que le GP prenne la limite pour une brimade arbitraire. */}
        {stats && stats.completedTrips < 5 ? (
          <Text className="px-3.5 pt-2.5 text-[10.5px] leading-4 text-gray-400">
            Période d'essai : {stats.maxWeightPerTrip} kg par voyage jusqu'à 5
            voyages validés. La limite augmente ensuite.
          </Text>
        ) : null}

        <View className="flex-row gap-2 px-3.5 py-3">
          <Pressable
            onPress={() => router.push('/(app)/gp/packages')}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2.5"
          >
            <Ionicons name="cube-outline" size={15} color={colors.text} />
            <Text className="text-[12.5px] font-semibold text-gray-900">
              Mes colis
            </Text>
            {stats && stats.toCollectCount > 0 ? (
              <View className="ml-0.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="text-[10px] font-bold text-white">
                  {stats.toCollectCount}
                </Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => router.push('/(app)/gp/trips/new')}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
          >
            <Ionicons name="add" size={17} color={colors.white} />
            <Text className="text-[12.5px] font-semibold text-white">
              Nouveau trajet
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Chargement impossible"
            description="Vérifiez votre connexion puis réessayez."
            actionLabel="Réessayer"
            onAction={() => void refetch()}
          />
        ) : !trips || trips.length === 0 ? (
          <EmptyState
            icon="airplane-outline"
            title="Aucun trajet"
            description="Déclarez votre prochain voyage pour que les acheteurs puissent vous confier leurs colis."
            actionLabel="Publier un trajet"
            onAction={() => router.push('/(app)/gp/trips/new')}
          />
        ) : (
          <>
            {upcoming.length > 0 ? (
              <>
                <Text className="mb-2 px-3.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  À venir ({upcoming.length})
                </Text>
                {upcoming.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </>
            ) : null}

            {past.length > 0 ? (
              <>
                <Text className="mb-2 mt-3 px-3.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Historique
                </Text>
                {past.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
