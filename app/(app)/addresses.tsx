import { Ionicons } from '@expo/vector-icons';
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
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
  type Address,
  type AddressInput,
} from '@/hooks/useAddresses';
import { useGoBack } from '@/hooks/useGoBack';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * Carnet d'adresses.
 *
 * La table existait depuis le début, sans écran : on retapait son adresse à
 * chaque commande, et la recherche de GP demandait la ville à la main alors
 * que l'application pouvait la connaître.
 *
 * L'adresse par défaut est le cœur du dispositif : c'est elle que la liste
 * des GP utilise pour se pré-filtrer, et elle que le paiement propose.
 */
export default function AddressesScreen() {
  const { t } = useAppLanguage();
  const goBack = useGoBack('/(app)/settings');
  const { isReady } = useRequireAuth('/(app)/addresses');

  const { addresses, isLoading, isError, refetch } = useAddresses();
  const remove = useDeleteAddress();

  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);

  if (!isReady) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <Pressable
          onPress={goBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('Retour', 'Back')}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text className="text-base font-bold text-gray-900">
          {t('Mes adresses', 'My addresses')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('Chargement impossible', 'Could not load')}
          description={t(
            'Vos adresses n’ont pas pu être récupérées.',
            'Your addresses could not be loaded.',
          )}
          actionLabel={t('Réessayer', 'Try again')}
          onAction={() => void refetch()}
        />
      ) : addresses.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title={t('Aucune adresse', 'No address yet')}
          description={t(
            'Enregistrez une adresse : elle sera proposée au moment de commander, et servira à trouver les GP qui vont chez vous.',
            'Save an address: it will be offered at checkout, and used to find personal shoppers travelling to you.',
          )}
          actionLabel={t('Ajouter une adresse', 'Add an address')}
          onAction={() => setCreating(true)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {addresses.map((item) => (
            <AddressCard
              key={item.id}
              address={item}
              onEdit={() => setEditing(item)}
              onDelete={() => remove.mutate(item.id)}
              deleting={remove.isPending}
            />
          ))}

          {remove.errorMessage ? (
            <FormError message={remove.errorMessage} />
          ) : null}

          <Button onPress={() => setCreating(true)} fullWidth>
            {t('Ajouter une adresse', 'Add an address')}
          </Button>
        </ScrollView>
      )}

      <AddressFormSheet
        visible={creating || editing !== null}
        address={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </SafeAreaView>
  );
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  deleting,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { t } = useAppLanguage();

  return (
    <View className="gap-3 rounded-2xl bg-white p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text className="text-[15px] font-bold text-gray-900">
              {address.label}
            </Text>
            {address.isDefault ? (
              <View className="rounded-full bg-emerald-50 px-2 py-0.5">
                <Text className="text-[10px] font-bold uppercase text-primary">
                  {t('Par défaut', 'Default')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-[13px] leading-5 text-gray-600">
            {address.address}
          </Text>
          <Text className="text-[13px] text-gray-600">
            {address.postCode ? `${address.postCode} ` : ''}
            {address.city}, {address.country}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={t('Modifier', 'Edit')}
          className="flex-1 items-center rounded-xl border border-gray-200 py-2.5"
        >
          <Text className="text-[13px] font-semibold text-gray-700">
            {t('Modifier', 'Edit')}
          </Text>
        </Pressable>
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel={t('Supprimer', 'Delete')}
          className="flex-1 items-center rounded-xl border border-red-200 py-2.5"
        >
          <Text className="text-[13px] font-semibold text-red-600">
            {t('Supprimer', 'Delete')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddressFormSheet({
  visible,
  address,
  onClose,
}: {
  visible: boolean;
  address: Address | null;
  onClose: () => void;
}) {
  const { t } = useAppLanguage();
  const create = useCreateAddress();
  const update = useUpdateAddress();

  // La clé remonte le formulaire à chaque ouverture : sans elle, les champs
  // gardaient les valeurs de l'adresse précédemment modifiée.
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        {visible ? (
          <AddressForm
            key={address?.id ?? 'new'}
            address={address}
            onClose={onClose}
            onSubmit={(input) => {
              if (address) {
                update.mutate(
                  { id: address.id, input },
                  { onSuccess: onClose },
                );
              } else {
                create.mutate(input, { onSuccess: onClose });
              }
            }}
            pending={create.isPending || update.isPending}
            error={create.errorMessage ?? update.errorMessage}
            title={
              address
                ? t('Modifier l’adresse', 'Edit address')
                : t('Nouvelle adresse', 'New address')
            }
          />
        ) : null}
      </View>
    </Modal>
  );
}

function AddressForm({
  address,
  onClose,
  onSubmit,
  pending,
  error,
  title,
}: {
  address: Address | null;
  onClose: () => void;
  onSubmit: (input: AddressInput) => void;
  pending: boolean;
  error: string | null;
  title: string;
}) {
  const { t } = useAppLanguage();

  const [label, setLabel] = useState(address?.label ?? '');
  const [street, setStreet] = useState(address?.address ?? '');
  const [city, setCity] = useState(address?.city ?? '');
  const [country, setCountry] = useState(address?.country ?? '');
  const [postCode, setPostCode] = useState(address?.postCode ?? '');
  const [makeDefault, setMakeDefault] = useState(address?.isDefault ?? false);
  const [touched, setTouched] = useState(false);

  const labelError =
    touched && !label.trim()
      ? t('Donnez un nom à cette adresse.', 'Give this address a name.')
      : undefined;
  const streetError =
    touched && street.trim().length < 5
      ? t('L’adresse est trop courte.', 'This address is too short.')
      : undefined;
  const cityError =
    touched && city.trim().length < 2
      ? t('Ville requise.', 'City is required.')
      : undefined;
  // Deux lettres, parce que c'est ce que la recherche de GP compare au pays
  // de destination des trajets. « France » ne correspondrait à rien.
  const countryError =
    touched && country.trim().length !== 2
      ? t('Code pays à deux lettres (ex. FR).', 'Two-letter country code (e.g. FR).')
      : undefined;

  const valid =
    label.trim() &&
    street.trim().length >= 5 &&
    city.trim().length >= 2 &&
    country.trim().length === 2;

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    onSubmit({
      label: label.trim(),
      address: street.trim(),
      city: city.trim(),
      country: country.trim().toUpperCase(),
      postCode: postCode.trim() || undefined,
      isDefault: makeDefault,
    });
  };

  return (
    <View className="max-h-[88%] gap-3 rounded-t-3xl bg-white p-5 pb-8">
      <View className="flex-row items-center justify-between">
        <Text className="text-[17px] font-bold text-gray-900">{title}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('Fermer', 'Close')}
        >
          <Ionicons name="close" size={22} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ gap: 12, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={t('Nom de l’adresse', 'Address name')}
          placeholder={t('Domicile, Bureau…', 'Home, Office…')}
          value={label}
          onChangeText={setLabel}
          error={labelError}
          autoCapitalize="sentences"
        />
        <Input
          label={t('Adresse', 'Street address')}
          placeholder={t('12 rue des Lilas, apt. 3', '12 Lilac Street, apt. 3')}
          value={street}
          onChangeText={setStreet}
          error={streetError}
          multiline
        />
        <View className="flex-row gap-3">
          <View className="flex-[2]">
            <Input
              label={t('Ville', 'City')}
              placeholder="Paris"
              value={city}
              onChangeText={setCity}
              error={cityError}
            />
          </View>
          <View className="flex-1">
            <Input
              label={t('Pays', 'Country')}
              placeholder="FR"
              value={country}
              onChangeText={(value) => setCountry(value.toUpperCase())}
              error={countryError}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>
        <Input
          label={t('Code postal (facultatif)', 'Post code (optional)')}
          placeholder="75011"
          value={postCode}
          onChangeText={setPostCode}
        />

        {/* Masqué quand l'adresse est DÉJÀ celle par défaut : la décocher ne
            ferait rien — le serveur refuse de laisser un carnet sans adresse
            proposée. Un interrupteur sans effet est pire que pas
            d'interrupteur. */}
        {address?.isDefault ? null : (
          <Pressable
            onPress={() => setMakeDefault((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: makeDefault }}
            className="flex-row items-center gap-2.5 py-1"
          >
            <View
              className={[
                'h-5 w-5 items-center justify-center rounded-md border',
                makeDefault ? 'border-primary bg-primary' : 'border-gray-300',
              ].join(' ')}
            >
              {makeDefault ? (
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              ) : null}
            </View>
            <Text className="flex-1 text-[13px] text-gray-700">
              {t(
                'Utiliser cette adresse par défaut',
                'Use this address by default',
              )}
            </Text>
          </Pressable>
        )}

        {error ? <FormError message={error} /> : null}
      </ScrollView>

      <Button onPress={submit} loading={pending} fullWidth>
        {t('Enregistrer', 'Save')}
      </Button>
    </View>
  );
}
