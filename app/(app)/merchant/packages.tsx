import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useGoBack } from '@/hooks/useGoBack';
import {
  useDropOffPackage,
  useMerchantPackages,
  PACKAGE_STATUS_LABELS,
  type MerchantPackage,
} from '@/hooks/usePackages';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUpload } from '@/hooks/useUpload';
import { firstImage } from '@/lib/media';
import type { PackageStatus } from '@/types/api.types';

/** Couleur du bandeau d'état — le rouge est réservé à ce qui a mal tourné. */
const STATUS_TONE: Record<PackageStatus, string> = {
  AWAITING_DROPOFF: 'bg-amber-50 text-amber-900',
  DROPPED_OFF: 'bg-emerald-50 text-primary',
  RECEIVED_BY_GP: 'bg-emerald-50 text-primary',
  IN_TRANSIT: 'bg-blue-50 text-blue-900',
  DELIVERED: 'bg-gray-100 text-gray-600',
  REFUSED: 'bg-red-50 text-red-900',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  });
}

function PackageCard({
  pkg,
  onDropOff,
}: {
  pkg: MerchantPackage;
  onDropOff: () => void;
}) {
  const tone = STATUS_TONE[pkg.status];
  const totalItems = pkg.items.reduce((sum, item) => sum + item.quantity, 0);

  // Le compte à rebours est l'information la plus utile de la carte : un colis
  // qui rate l'avion ne se rattrape pas.
  const daysLeft = Math.ceil(
    (new Date(pkg.trip.departureDate).getTime() - Date.now()) / 86_400_000,
  );
  const isUrgent = pkg.status === 'AWAITING_DROPOFF' && daysLeft <= 3;

  return (
    <View className="mx-3.5 mb-3 overflow-hidden rounded-xl border border-gray-200">
      <View className={['flex-row items-center justify-between px-3 py-2', tone.split(' ')[0]].join(' ')}>
        <Text className={['text-[11.5px] font-bold', tone.split(' ')[1]].join(' ')}>
          {PACKAGE_STATUS_LABELS[pkg.status]}
        </Text>
        <Text className={['text-[11px]', tone.split(' ')[1]].join(' ')}>
          {pkg.weight.toFixed(2)} kg
        </Text>
      </View>

      <View className="p-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="airplane-outline" size={14} color="#6B7280" />
          <Text className="flex-1 text-[12.5px] font-semibold text-gray-900">
            {pkg.trip.originCity} → {pkg.trip.destCity}
          </Text>
        </View>
        <Text
          className={[
            'mt-0.5 text-[11px]',
            isUrgent ? 'font-semibold text-red-600' : 'text-gray-500',
          ].join(' ')}
        >
          Départ le {formatDate(pkg.trip.departureDate)}
          {pkg.status === 'AWAITING_DROPOFF'
            ? daysLeft > 0
              ? ` · ${daysLeft} jour${daysLeft > 1 ? 's' : ''} pour remettre le colis`
              : ' · le GP part aujourd’hui'
            : ''}
        </Text>

        <View className="mt-3 gap-2">
          {pkg.items.map((item) => {
            const cover = firstImage(item.product.images);
            return (
              <View key={item.id} className="flex-row items-center gap-2.5">
                <View className="h-10 w-10 overflow-hidden rounded-md bg-gray-100">
                  {cover ? (
                    <Image
                      source={{ uri: cover }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-[12.5px] text-gray-900">
                    {item.product.name}
                  </Text>
                  {item.variantLabel ? (
                    <Text className="text-[10.5px] text-gray-500">
                      {item.variantLabel}
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[12px] font-semibold text-gray-700">
                  ×{item.quantity}
                </Text>
              </View>
            );
          })}
        </View>

        <Text className="mt-2.5 text-[10.5px] text-gray-400">
          {pkg.items.length} référence{pkg.items.length > 1 ? 's' : ''} ·{' '}
          {totalItems} article{totalItems > 1 ? 's' : ''}
        </Text>

        {pkg.status === 'AWAITING_DROPOFF' ? (
          <Pressable
            onPress={onDropOff}
            className="mt-3 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
          >
            <Ionicons name="camera-outline" size={16} color={colors.white} />
            <Text className="text-[12.5px] font-semibold text-white">
              J'ai remis le colis
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Les colis du commerçant.
 *
 * Triés en deux blocs : ce qui attend une action de sa part, puis le reste.
 * Une liste unique triée par date noierait le seul colis urgent au milieu de
 * dix colis déjà livrés.
 */
export default function MerchantPackagesScreen() {
  const goBack = useGoBack('/(app)/(tabs)/shop');
  const { isReady } = useRequireAuth('/(app)/merchant/packages');
  const { data, isLoading, isError, refetch } = useMerchantPackages();
  const dropOff = useDropOffPackage();
  const { upload, isUploading } = useUpload();

  const [target, setTarget] = useState<MerchantPackage | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  if (!isReady) return <View className="flex-1 bg-white" />;

  const closeSheet = () => {
    setTarget(null);
    setPhotoUri(null);
    setSheetError(null);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setSheetError("L'accès à l'appareil photo est nécessaire.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setSheetError(null);
    }
  };

  const confirmDropOff = async () => {
    if (!target || !photoUri) return;
    setSheetError(null);

    const uploaded = await upload({
      uri: photoUri,
      category: 'package',
      contentType: 'image/jpeg',
    });

    if (!uploaded?.fileUrl) {
      setSheetError("L'envoi de la photo a échoué. Réessayez.");
      return;
    }

    dropOff.mutate(
      { packageId: target.id, prepPhotoUrl: uploaded.fileUrl },
      { onSuccess: closeSheet },
    );
  };

  const awaiting = data?.filter((p) => p.status === 'AWAITING_DROPOFF') ?? [];
  const others = data?.filter((p) => p.status !== 'AWAITING_DROPOFF') ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-gray-900">Mes colis</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
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
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Aucun colis"
          description="Dès qu'une commande sera payée, le colis à préparer apparaîtra ici avec la date de départ du GP."
        />
      ) : (
        <ScrollView contentContainerClassName="py-3">
          {awaiting.length > 0 ? (
            <>
              <Text className="mb-2 px-3.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                À remettre ({awaiting.length})
              </Text>
              {awaiting.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onDropOff={() => setTarget(pkg)} />
              ))}
            </>
          ) : null}

          {others.length > 0 ? (
            <>
              <Text className="mb-2 mt-3 px-3.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Historique
              </Text>
              {others.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onDropOff={() => undefined} />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}

      <Modal
        visible={target !== null}
        animationType="slide"
        transparent
        onRequestClose={closeSheet}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-2xl bg-white p-5 pb-8">
            <Text className="text-[16px] font-bold text-gray-900">
              Photo du colis préparé
            </Text>
            <Text className="mt-1.5 text-[12.5px] leading-[18px] text-gray-600">
              Cette photo fait foi si le GP conteste l'état ou le contenu à la
              réception. Sans elle, votre parole vaut la sienne en cas de litige.
            </Text>

            <Pressable
              onPress={takePhoto}
              className="mt-4 h-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50"
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={26} color="#9CA3AF" />
                  <Text className="mt-1.5 text-[12px] text-gray-500">
                    Prendre la photo
                  </Text>
                </>
              )}
            </Pressable>

            {sheetError ?? dropOff.errorMessage ? (
              <Text className="mt-3 text-center text-[12.5px] text-red-500">
                {sheetError ?? dropOff.errorMessage}
              </Text>
            ) : null}

            <View className="mt-5 gap-2">
              <Button
                onPress={() => void confirmDropOff()}
                disabled={!photoUri}
                loading={isUploading || dropOff.isPending}
                fullWidth
              >
                Confirmer la remise
              </Button>
              <Button variant="secondary" onPress={closeSheet} fullWidth>
                Annuler
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
