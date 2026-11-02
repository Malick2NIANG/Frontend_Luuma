import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { PostHeader } from '@/components/feed/PostHeader';
import { colors } from '@/constants/colors';
import { daysUntil, formatDate, formatWeight, formatXof } from '@/lib/format';
import type { FeedAuthor, FeedTrip } from '@/types/feed.types';

export interface TripPostProps {
  trip: FeedTrip;
  author: FeedAuthor;
  publishedAt: string;
}

/**
 * Une annonce de trajet dans le fil.
 *
 * Pas d'image : un trajet n'a rien à montrer, et une photo de valise
 * générique n'apporterait rien. À la place, l'itinéraire occupe la surface
 * que le produit donne à sa photo — c'est l'information qu'on vient chercher.
 */
export function TripPost({ trip, author, publishedAt }: TripPostProps) {
  const router = useRouter();

  const detailPath = `/(app)/trips/${trip.id}`;
  const days = daysUntil(trip.departureDate);
  const fillRatio =
    trip.maxWeight > 0 ? trip.usedWeight / trip.maxWeight : 0;

  return (
    <View className="border-b border-gray-100 bg-white pb-2">
      <PostHeader author={author} publishedAt={publishedAt} />

      {/* La zone cliquable s'arrête à la carte : englober aussi les boutons
          les rendrait inopérants, l'appui déclenchant en même temps la
          navigation du parent. C'est ce qui empêchait « Message » d'ouvrir
          une conversation. */}
      <Pressable onPress={() => router.push(detailPath)} className="px-3">
        <View className="rounded-2xl bg-emerald-50 px-4 py-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-[17px] font-extrabold text-gray-900">
              {trip.originCity}
            </Text>
            <Ionicons name="airplane" size={16} color={colors.accent} />
            <Text className="text-[17px] font-extrabold text-gray-900">
              {trip.destCity}
            </Text>
            <Text className="text-[13px] text-gray-500">
              {trip.destCountry}
            </Text>
          </View>

          <Text className="mt-1 text-[12px] text-gray-600">
            Départ le {formatDate(trip.departureDate)}
            {/* Le compte à rebours prime sur la date : c'est lui qui dit s'il
                reste le temps de commander. */}
            {days >= 0 ? ` · dans ${days} jour${days > 1 ? 's' : ''}` : ''}
          </Text>

          <View className="mt-3 flex-row items-center gap-4">
            <Metric
              label="Tarif"
              value={`${formatXof(trip.pricePerKg)} / kg`}
            />
            <Metric
              label="Reste"
              value={formatWeight(trip.remainingWeight)}
            />
          </View>

          <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.round(fillRatio * 100))}%`,
                backgroundColor: colors.accent,
              }}
            />
          </View>
        </View>
      </Pressable>

      {/* Un seul bouton, comme sur les publications produit : le fil montre,
          la fiche décide. Le bouton « Message » vivait ici alors qu'écrire à
          un GP se décide après avoir lu son profil et ses avis — il est donc
          passé sur la fiche du trajet. */}
      <Pressable
        onPress={() => router.push(detailPath)}
        accessibilityRole="button"
        accessibilityLabel={`Voir le trajet ${trip.originCity} vers ${trip.destCity}`}
        className="mx-3 mb-1 mt-2.5 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
      >
        <Text className="text-[13px] font-bold text-white">Voir plus</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.white} />
      </Pressable>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </Text>
      <Text className="text-[13px] font-bold text-gray-900">{value}</Text>
    </View>
  );
}
