import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import {
  type ApplicationKind,
  type PendingGp,
  type PendingMerchant,
  useApproveApplication,
  useKycDocument,
  usePendingApplications,
  useRejectApplication,
} from '@/hooks/useAdmin';
import { useAdminAccessState } from '@/hooks/useAdminAccess';
import { useGoBack } from '@/hooks/useGoBack';
import { useMe } from '@/hooks/useMe';

/**
 * Instruction des dossiers : commerçants et GP en attente de validation.
 *
 * Aucune garde ici en plus de celles du serveur — il refuse ces routes sans
 * élévation. L'écran se contente de renvoyer au tableau de bord si l'accès
 * n'est pas ouvert, plutôt que d'afficher une suite de 403.
 */
export default function AdminApplicationsScreen() {
  const { can, isLoading: meLoading } = useMe();
  const access = useAdminAccessState(can.administrate);
  const goBack = useGoBack('/(app)/admin');

  const [kind, setKind] = useState<ApplicationKind>('merchant');

  const elevated = access.data?.elevated ?? false;
  const list = usePendingApplications(kind, elevated);

  if (meLoading || access.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!can.administrate || !elevated) {
    return <Redirect href="/(app)/admin" />;
  }

  const items = list.data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Revenir au tableau de bord"
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">
          Dossiers en attente
        </Text>
      </View>

      <View className="flex-row gap-2 bg-white px-4 pb-3">
        <Tab
          label="Commerçants"
          active={kind === 'merchant'}
          onPress={() => setKind('merchant')}
        />
        <Tab label="GP" active={kind === 'gp'} onPress={() => setKind('gp')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {list.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : list.isError ? (
          <Text className="text-center text-sm text-red-500">
            Impossible de charger les dossiers.
          </Text>
        ) : items.length === 0 ? (
          <View className="items-center gap-2 py-16">
            <Ionicons name="checkmark-done" size={32} color="#9CA3AF" />
            <Text className="text-center text-[13.5px] text-gray-400">
              Aucun dossier en attente.
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <ApplicationCard key={item.id} kind={kind} item={item} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={[
        'rounded-full px-4 py-1.5',
        active ? 'bg-primary' : 'bg-gray-100',
      ].join(' ')}
    >
      <Text
        className={[
          'text-[13px] font-semibold',
          active ? 'text-white' : 'text-gray-600',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ApplicationCard({
  kind,
  item,
}: {
  kind: ApplicationKind;
  item: PendingMerchant | PendingGp;
}) {
  const approve = useApproveApplication(kind);
  const reject = useRejectApplication(kind);
  const kyc = useKycDocument(kind);

  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  // Confirmer que la pièce a été consultée est un ACTE, pas une case par
  // défaut : la cocher engage l'administrateur sur une vérification qu'il
  // dit avoir faite.
  const [kycChecked, setKycChecked] = useState(false);

  // Discrimination sur la DONNÉE, pas sur `kind`. Tester `kind` ne réduit pas
  // le type de `item` pour TypeScript : l'assertion `as PendingMerchant` que
  // j'avais écrite compilait sans rien vérifier, et un désaccord futur entre
  // les deux serait passé inaperçu.
  const merchant = 'shopName' in item ? item : null;
  const gp = 'totalTrips' in item ? item : null;

  const openDocument = () => {
    kyc.mutate(item.id, {
      onSuccess: (url) => {
        void Linking.openURL(url);
      },
    });
  };

  const error = approve.errorMessage ?? reject.errorMessage ?? kyc.errorMessage;

  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <View className="gap-1">
        <Text className="text-[15px] font-bold text-gray-900">
          {merchant ? merchant.shopName : item.user.name}
        </Text>
        <Text className="text-[12.5px] text-gray-500">
          {merchant
            ? `${item.user.name} · ${merchant.city}, ${merchant.country}`
            : `${item.user.email}`}
        </Text>
        <Text className="text-[11.5px] text-gray-400">
          Déposé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
        </Text>
      </View>

      {merchant?.description ? (
        <Text className="text-[13px] leading-5 text-gray-600">
          {merchant.description}
        </Text>
      ) : null}

      <View className="gap-1.5 rounded-xl bg-gray-50 p-3">
        <Detail label="Email" value={item.user.email} />
        <Detail label="Téléphone" value={item.user.phone ?? 'Non renseigné'} />
        {merchant ? (
          <>
            <Detail label="Adresse" value={merchant.address} />
            <Detail label="Produits déjà saisis" value={String(merchant._count.products)} />
          </>
        ) : gp ? (
          <>
            <Detail label="Voyages effectués" value={String(gp.totalTrips)} />
            <Detail
              label="Capacité par trajet"
              value={`${gp.maxWeightPerTrip} kg`}
            />
          </>
        ) : null}
      </View>

      {/* Le motif du rejet précédent, s'il y en a un : ce dossier a déjà été
          refusé et représenté. L'ignorer ferait reprendre l'instruction à
          zéro alors que la question a déjà été tranchée une fois. */}
      {item.rejectionNote ? (
        <View className="gap-1 rounded-xl bg-amber-50 p-3">
          <Text className="text-[11px] font-semibold uppercase text-amber-700">
            Rejeté précédemment
          </Text>
          <Text className="text-[12.5px] leading-4 text-amber-900">
            {item.rejectionNote}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={openDocument}
        disabled={!item.idDocumentUrl || kyc.isPending}
        accessibilityRole="button"
        accessibilityLabel="Consulter la pièce d'identité"
        className={[
          'flex-row items-center justify-center gap-2 rounded-xl border py-2.5',
          item.idDocumentUrl ? 'border-gray-200' : 'border-gray-100',
        ].join(' ')}
      >
        <Ionicons
          name="document-text-outline"
          size={16}
          color={item.idDocumentUrl ? '#374151' : '#D1D5DB'}
        />
        <Text
          className={[
            'text-[13px] font-semibold',
            item.idDocumentUrl ? 'text-gray-700' : 'text-gray-300',
          ].join(' ')}
        >
          {item.idDocumentUrl
            ? "Voir la pièce d'identité"
            : "Aucune pièce d'identité fournie"}
        </Text>
      </Pressable>

      {/* La case n'existe QUE si une pièce a été fournie. Sans ce garde-fou on
          pouvait affirmer avoir consulté un document inexistant, et écrire
          `isKycVerified` en base sur cette affirmation — exactement le cas du
          seul dossier réellement en attente aujourd'hui. */}
      {item.idDocumentUrl ? (
        <Pressable
          onPress={() => setKycChecked((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: kycChecked }}
          className="flex-row items-center gap-2.5 py-1"
        >
          <View
            className={[
              'h-5 w-5 items-center justify-center rounded-md border',
              kycChecked ? 'border-primary bg-primary' : 'border-gray-300',
            ].join(' ')}
          >
            {kycChecked ? (
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            ) : null}
          </View>
          <Text className="flex-1 text-[12.5px] leading-4 text-gray-600">
            J'ai consulté la pièce d'identité et elle correspond au postulant.
          </Text>
        </Pressable>
      ) : (
        <Text className="text-[12px] leading-4 text-amber-700">
          Sans pièce d'identité, l'approbation reste possible mais l'identité
          ne sera pas marquée comme vérifiée.
        </Text>
      )}

      {error ? (
        <Text className="text-[12.5px] text-red-500">{error}</Text>
      ) : null}

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setRejecting(true)}
          accessibilityRole="button"
          accessibilityLabel="Rejeter le dossier"
          className="flex-1 items-center rounded-xl border border-red-200 py-3"
        >
          <Text className="text-[13.5px] font-semibold text-red-600">
            Rejeter
          </Text>
        </Pressable>
        <View className="flex-1">
          <Button
            onPress={() =>
              approve.mutate({
                id: item.id,
                // Jamais vrai sans document : la case peut rester cochée d'un
                // rendu précédent si la pièce disparaît entre-temps.
                body: {
                  markKycVerified: Boolean(item.idDocumentUrl) && kycChecked,
                },
              })
            }
            loading={approve.isPending}
            fullWidth
          >
            Approuver
          </Button>
        </View>
      </View>

      <Modal
        visible={rejecting}
        animationType="slide"
        transparent
        onRequestClose={() => setRejecting(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="gap-4 rounded-t-3xl bg-white p-5 pb-8">
            <Text className="text-[17px] font-bold text-gray-900">
              Motif du rejet
            </Text>
            {/* Obligatoire côté serveur, et c'est la bonne règle : un dossier
                refusé sans explication laisse quelqu'un sans recours et sans
                savoir quoi corriger pour repostuler. */}
            <Text className="text-[12.5px] leading-4 text-gray-500">
              Ce texte sera lu par le postulant. Dites-lui ce qu'il doit
              corriger pour représenter son dossier.
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              placeholder="Pièce d'identité illisible, adresse incomplète…"
              placeholderTextColor="#9CA3AF"
              style={{ textAlignVertical: 'top' }}
              className="min-h-24 rounded-xl bg-gray-50 p-3 text-[14px] text-gray-900"
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setRejecting(false)}
                accessibilityRole="button"
                className="flex-1 items-center rounded-xl border border-gray-200 py-3"
              >
                <Text className="text-[13.5px] font-semibold text-gray-600">
                  Annuler
                </Text>
              </Pressable>
              <View className="flex-1">
                <Button
                  onPress={() =>
                    reject.mutate(
                      { id: item.id, body: { rejectionNote: note.trim() } },
                      {
                        onSuccess: () => {
                          setRejecting(false);
                          setNote('');
                        },
                      },
                    )
                  }
                  disabled={note.trim().length === 0}
                  loading={reject.isPending}
                  fullWidth
                >
                  Confirmer le rejet
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-[12.5px] text-gray-500">{label}</Text>
      <Text className="flex-1 text-right text-[12.5px] font-medium text-gray-800">
        {value}
      </Text>
    </View>
  );
}
