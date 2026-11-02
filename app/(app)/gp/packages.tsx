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
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useGoBack } from '@/hooks/useGoBack';
import {
  PACKAGE_STATUS_LABELS,
  useGpPackageAction,
  useGpPackages,
  type MerchantPackage,
} from '@/hooks/usePackages';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUpload } from '@/hooks/useUpload';
import { firstImage } from '@/lib/media';
import type { PackageStatus } from '@/types/api.types';

type GpAction = 'receive' | 'deliver' | 'refuse';

const STATUS_TONE: Record<PackageStatus, { bg: string; text: string }> = {
  AWAITING_DROPOFF: { bg: 'bg-gray-100', text: 'text-gray-600' },
  DROPPED_OFF: { bg: 'bg-amber-50', text: 'text-amber-900' },
  RECEIVED_BY_GP: { bg: 'bg-emerald-50', text: 'text-primary' },
  IN_TRANSIT: { bg: 'bg-blue-50', text: 'text-blue-900' },
  DELIVERED: { bg: 'bg-gray-100', text: 'text-gray-600' },
  REFUSED: { bg: 'bg-red-50', text: 'text-red-900' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500' },
};

const ACTION_COPY: Record<
  GpAction,
  { title: string; body: string; confirm: string }
> = {
  receive: {
    title: 'Réception du colis',
    body: "Photographiez le colis tel que vous le recevez. C'est cette photo qui fait foi si le contenu est contesté à l'arrivée.",
    confirm: 'Confirmer la réception',
  },
  deliver: {
    title: 'Remise au client',
    body: 'Photographiez le colis au moment de la remise. Elle atteste que la livraison a bien eu lieu.',
    confirm: 'Confirmer la livraison',
  },
  refuse: {
    title: 'Refuser ce colis',
    body: "Le motif est transmis au client et au commerçant, et sert de preuve si un litige est ouvert. Le client sera remboursé au prorata de ce colis.",
    confirm: 'Refuser le colis',
  },
};

function PackageCard({
  pkg,
  onAction,
}: {
  pkg: MerchantPackage;
  onAction: (action: GpAction) => void;
}) {
  const tone = STATUS_TONE[pkg.status];
  const canReceive = pkg.status === 'DROPPED_OFF';
  const canDeliver = pkg.status === 'RECEIVED_BY_GP' || pkg.status === 'IN_TRANSIT';

  return (
    <View className="mx-3.5 mb-3 overflow-hidden rounded-xl border border-gray-200">
      <View className={['flex-row items-center justify-between px-3 py-2', tone.bg].join(' ')}>
        <Text className={['text-[11.5px] font-bold', tone.text].join(' ')}>
          {PACKAGE_STATUS_LABELS[pkg.status]}
        </Text>
        <Text className={['text-[11px]', tone.text].join(' ')}>
          {pkg.weight.toFixed(2)} kg
        </Text>
      </View>

      <View className="p-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="storefront-outline" size={14} color="#6B7280" />
          <Text className="flex-1 text-[12.5px] font-semibold text-gray-900">
            {pkg.merchant.shopName}
          </Text>
        </View>
        <Text className="mt-0.5 text-[11px] text-gray-500">
          {pkg.merchant.city} · {pkg.trip.originCity} → {pkg.trip.destCity}
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

        {canReceive || canDeliver ? (
          <View className="mt-3 flex-row gap-2">
            {canReceive ? (
              <>
                <Pressable
                  onPress={() => onAction('refuse')}
                  className="flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 py-2.5"
                >
                  <Text className="text-[12.5px] font-semibold text-red-600">
                    Refuser
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onAction('receive')}
                  className="flex-[2] flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
                >
                  <Ionicons name="camera-outline" size={16} color={colors.white} />
                  <Text className="text-[12.5px] font-semibold text-white">
                    J'ai récupéré le colis
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => onAction('deliver')}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5"
              >
                <Ionicons name="camera-outline" size={16} color={colors.white} />
                <Text className="text-[12.5px] font-semibold text-white">
                  J'ai livré le colis
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Les colis confiés au GP.
 *
 * Le refus n'est proposé qu'à la réception, pas après : une fois le colis
 * emporté, le refuser n'aurait plus de sens — il est déjà dans la valise, et
 * la question devient un litige, pas un refus.
 */
export default function GpPackagesScreen() {
  const goBack = useGoBack('/(app)/(tabs)/gp');
  const { isReady } = useRequireAuth('/(app)/gp/packages');
  const { data, isLoading, isError, refetch } = useGpPackages();
  const act = useGpPackageAction();
  const { upload, isUploading } = useUpload();

  const [target, setTarget] = useState<{
    pkg: MerchantPackage;
    action: GpAction;
  } | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [sheetError, setSheetError] = useState<string | null>(null);

  if (!isReady) return <View className="flex-1 bg-white" />;

  const closeSheet = () => {
    setTarget(null);
    setPhotoUri(null);
    setReason('');
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

  const confirm = async () => {
    if (!target) return;
    setSheetError(null);

    if (target.action === 'refuse') {
      act.mutate(
        {
          packageId: target.pkg.id,
          action: 'refuse',
          refusalReason: reason.trim(),
        },
        { onSuccess: closeSheet },
      );
      return;
    }

    if (!photoUri) return;

    const uploaded = await upload({
      uri: photoUri,
      category: 'package',
      contentType: 'image/jpeg',
    });

    if (!uploaded?.fileUrl) {
      setSheetError("L'envoi de la photo a échoué. Réessayez.");
      return;
    }

    act.mutate(
      {
        packageId: target.pkg.id,
        action: target.action,
        photoUrl: uploaded.fileUrl,
      },
      { onSuccess: closeSheet },
    );
  };

  const pending =
    data?.filter(
      (p) =>
        p.status === 'DROPPED_OFF' ||
        p.status === 'RECEIVED_BY_GP' ||
        p.status === 'IN_TRANSIT',
    ) ?? [];
  const others = data?.filter((p) => !pending.includes(p)) ?? [];

  const copy = target ? ACTION_COPY[target.action] : null;
  const canConfirm =
    target?.action === 'refuse' ? reason.trim().length > 0 : photoUri !== null;

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
          description="Les colis apparaîtront ici dès qu'un commerçant en aura déposé un pour l'un de vos trajets."
        />
      ) : (
        <ScrollView contentContainerClassName="py-3">
          {pending.length > 0 ? (
            <>
              <Text className="mb-2 px-3.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                En cours ({pending.length})
              </Text>
              {pending.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onAction={(action) => setTarget({ pkg, action })}
                />
              ))}
            </>
          ) : null}

          {others.length > 0 ? (
            <>
              <Text className="mb-2 mt-3 px-3.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Historique
              </Text>
              {others.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} onAction={() => undefined} />
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
              {copy?.title}
            </Text>
            <Text className="mt-1.5 text-[12.5px] leading-[18px] text-gray-600">
              {copy?.body}
            </Text>

            {target?.action === 'refuse' ? (
              <View className="mt-4">
                <Input
                  label="Motif du refus"
                  placeholder="Colis trop volumineux, contenu non conforme…"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={3}
                  style={{ height: 80, textAlignVertical: 'top' }}
                />
              </View>
            ) : (
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
            )}

            {sheetError ?? act.errorMessage ? (
              <Text className="mt-3 text-center text-[12.5px] text-red-500">
                {sheetError ?? act.errorMessage}
              </Text>
            ) : null}

            <View className="mt-5 gap-2">
              <Button
                onPress={() => void confirm()}
                disabled={!canConfirm}
                loading={isUploading || act.isPending}
                fullWidth
              >
                {copy?.confirm ?? 'Confirmer'}
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
