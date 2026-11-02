import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { RoleMark } from '@/components/ui/RoleMark';
import { useOpenDirectChat } from '@/hooks/useDirectChat';
import { formatWeight } from '@/lib/format';
import type { GpSummary } from '@/types/gp.types';

/** Nombre de voyages en dessous duquel on parle de « nouveau GP ». */
const NEWCOMER_THRESHOLD = 3;

/**
 * Une ligne de l'annuaire des GP.
 *
 * Deux boutons plutôt qu'un : réserver et écrire ne sont pas la même étape.
 * On contacte souvent un GP avant de commander — « vous passez par Lyon ? »,
 * « vous prenez du fragile ? » — et c'est là que la confiance se construit.
 */
export function GpCard({ gp }: { gp: GpSummary }) {
  const router = useRouter();
  const { open: openChat } = useOpenDirectChat();

  const profilePath = `/(app)/gps/${gp.id}`;
  const isNewcomer = gp.totalTrips < NEWCOMER_THRESHOLD;

  // Les itinéraires distincts, sans doublon : un GP qui fait trois fois
  // Dakar → Paris ne doit pas afficher trois fois la même pastille.
  const routes = [
    ...new Set(gp.trips.map((t) => `${t.originCity} → ${t.destCity}`)),
  ].slice(0, 3);

  return (
    <View className="flex-row gap-3 border-b border-gray-100 px-3.5 py-3">
      <Pressable onPress={() => router.push(profilePath)}>
        <Avatar uri={gp.user.avatar} name={gp.user.name} size={48} />
      </Pressable>

      <View className="flex-1">
        <Pressable onPress={() => router.push(profilePath)}>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-bold text-gray-900">
              {gp.user.name}
            </Text>
            <RoleMark type="gp" />
          </View>

          <Text className="mt-0.5 text-[11px] text-gray-500">
            {isNewcomer ? (
              // Sans historique, la note vaut zéro et afficherait « ★ 0,0 » —
              // pire qu'un mauvais avis. On annonce plutôt la capacité, qui
              // est l'information utile pour un débutant.
              `Nouveau GP · ${formatWeight(gp.maxWeightPerTrip)} max`
            ) : (
              `★ ${gp.rating.toFixed(1)} · ${gp.totalTrips} voyages`
            )}
            {gp.followersCount > 0 ? ` · ${gp.followersCount} abonnés` : ''}
          </Text>

          <View className="mt-1.5 flex-row flex-wrap gap-1.5">
            {routes.map((route) => (
              <View
                key={route}
                className="rounded-full bg-emerald-50 px-2 py-1"
              >
                <Text className="text-[10px] font-semibold text-primary">
                  {route}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>

        <View className="mt-2 flex-row gap-1.5">
          <Pressable
            onPress={() => router.push(profilePath)}
            className="rounded-lg bg-primary px-3 py-1.5"
          >
            <Text className="text-[11px] font-bold text-white">Réserver</Text>
          </Pressable>
          <Pressable
            onPress={() => openChat(gp.user.id, '/(app)/(tabs)/search')}
            className="rounded-lg border border-primary bg-white px-3 py-1.5"
          >
            <Text className="text-[11px] font-bold text-primary">Message</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
