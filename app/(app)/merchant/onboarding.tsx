import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IdDocumentField } from '@/components/pro/IdDocumentField';
import { PayoutField } from '@/components/pro/PayoutField';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useMe } from '@/hooks/useMe';
import {
  PAYOUT_METHODS,
  useCreateMerchant,
  type PayoutMethod,
} from '@/hooks/useProfessional';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAppLanguage } from '@/lib/appLanguage';

/** Villes proposées — mêmes valeurs que le filtre de recherche. */
const CITIES = ['Dakar', 'Thiès', 'Saint-Louis', 'Touba'];

export default function MerchantOnboardingScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/profile');
  const { isReady } = useRequireAuth('/(app)/merchant/onboarding');
  const { me, can } = useMe();
  const createMerchant = useCreateMerchant();

  const [shopName, setShopName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(CITIES[0]);
  const [idDocument, setIdDocument] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod | null>(null);
  const [payoutAccount, setPayoutAccount] = useState('');
  const [touched, setTouched] = useState(false);

  if (!isReady) return <View className="flex-1 bg-white" />;

  // Le succès est testé EN PREMIER, avant le doublon : l'envoi invalide
  // `['me']`, donc au rendu suivant le compte possède déjà une boutique —
  // celle qu'on vient de créer. Dans l'autre ordre, l'utilisateur voyait
  // « Vous avez déjà une boutique » à la place de sa confirmation.
  if (createMerchant.isSuccess) {
    return (
      <Outcome
        icon="checkmark-circle"
        title={t('Dossier déposé', 'Application submitted')}
        description={t(
          "Nous examinons votre pièce d'identité sous 48 heures. En attendant, vous pouvez déjà préparer vos produits : ils seront publiés dès la validation.",
          'We will review your identity document within 48 hours. In the meantime, you can prepare your products; they will be published once approved.',
        )}
        actionLabel={t('Préparer ma boutique', 'Set up my shop')}
        onAction={() => router.replace('/(app)/(tabs)/profile')}
      />
    );
  }

  // Dossier préexistant : on renvoie vers le profil plutôt que d'afficher un
  // formulaire dont l'envoi échouerait sur « Vous avez déjà une boutique ».
  if (me?.merchant) {
    return (
      <Outcome
        icon="storefront"
        title={t('Vous avez déjà une boutique', 'You already have a shop')}
        description={t('Retrouvez-la depuis votre profil.', 'Open it from your profile.')}
        actionLabel={t('Aller au profil', 'Go to profile')}
        onAction={() => router.replace('/(app)/(tabs)/profile')}
      />
    );
  }

  // L'email non vérifié est bloqué par le serveur : mieux vaut le dire ici
  // que de laisser remplir un formulaire de six champs pour rien.
  if (!can.openShop) {
    return (
      <Outcome
        icon="mail-outline"
        title={t("Vérifiez d'abord votre email", 'Verify your email first')}
        description={t(
          'Ouvrir une boutique engage des paiements : nous devons pouvoir vous joindre de façon fiable.',
          'Opening a shop involves payments, so we need to be able to contact you reliably.',
        )}
        actionLabel={t('Retour au profil', 'Back to profile')}
        onAction={() => router.replace('/(app)/(tabs)/profile')}
      />
    );
  }

  const nameValid = shopName.trim().length >= 2;
  const addressValid = address.trim().length >= 5;
  const payoutValid = !payoutMethod || payoutAccount.trim().length >= 4;
  const formValid = nameValid && addressValid && payoutValid;

  const handleSubmit = () => {
    setTouched(true);
    if (!formValid) return;

    createMerchant.mutate({
      shopName: shopName.trim(),
      description: description.trim() || undefined,
      address: address.trim(),
      city,
      country: 'SN',
      idDocumentUrl: idDocument ?? undefined,
      payoutMethod: payoutMethod ?? undefined,
      payoutAccount: payoutAccount.trim() || undefined,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <Header title={t('Ouvrir une boutique', 'Open a shop')} onBack={goBack} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="px-4 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-5 text-[13px] leading-5 text-gray-600">
            {t(
              'Vendez vos produits à la diaspora sénégalaise. Les GP se chargent du transport ; vous préparez le colis et le remettez.',
              'Sell your products to the Senegalese diaspora. Personal shoppers handle the shipping; you prepare and hand over the package.',
            )}
          </Text>

          <Field
            label={t('Nom de la boutique', 'Shop name')}
            value={shopName}
            onChangeText={setShopName}
            placeholder={t('Chez Awa Couture', 'Awa Couture')}
            error={touched && !nameValid ? t('Au moins 2 caractères.', 'At least 2 characters.') : null}
          />

          <Field
            label={t('Description', 'Description')}
            hint={t('Ce que vous vendez, en une phrase.', 'What you sell, in one sentence.')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('Bazin brodé main, coupe traditionnelle et moderne', 'Hand-embroidered bazin, traditional and modern styles')}
            multiline
          />

          <View className="mt-4">
            <Text className="mb-2 text-sm font-semibold text-gray-900">
              {t('Ville', 'City')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CITIES.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCity(item)}
                  className={[
                    'rounded-full px-3.5 py-2',
                    city === item ? 'bg-primary' : 'bg-gray-100',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-[13px]',
                      city === item ? 'font-semibold text-white' : 'text-gray-700',
                    ].join(' ')}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Field
            label={t('Adresse', 'Address')}
            hint={t('Là où le GP viendra chercher les colis.', 'Where the personal shopper will pick up packages.')}
            value={address}
            onChangeText={setAddress}
            placeholder={t('Rue 12 x Avenue Bourguiba, Médina', '12 Avenue Bourguiba, Medina')}
            error={touched && !addressValid ? t('Adresse trop courte.', 'Address is too short.') : null}
          />

          <View className="mt-6">
            <IdDocumentField value={idDocument} onChange={setIdDocument} />
          </View>

          <View className="mt-6">
            <PayoutField
              methods={PAYOUT_METHODS}
              method={payoutMethod}
              account={payoutAccount}
              onMethodChange={setPayoutMethod}
              onAccountChange={setPayoutAccount}
            />
            {touched && !payoutValid ? (
              <Text className="mt-2 text-xs text-red-600">
                {t('Renseignez le compte qui recevra vos paiements.', 'Enter the account where you would like to receive payments.')}
              </Text>
            ) : null}
          </View>

          {createMerchant.errorMessage ? (
            <Text className="mt-4 text-center text-sm text-red-600">
              {createMerchant.errorMessage}
            </Text>
          ) : null}
        </ScrollView>

        <View className="border-t border-gray-100 px-4 pt-3">
          <Button
            fullWidth
            loading={createMerchant.isPending}
            onPress={handleSubmit}
          >
            {t('Déposer mon dossier', 'Submit my application')}
          </Button>
          {/* Dit avant l'envoi, pas après : personne n'aime découvrir une
              attente une fois le formulaire validé. */}
          <Text className="mt-2 text-center text-[11px] text-gray-500">
            {t('Examen sous 48 h. Vous pourrez préparer vos produits entre-temps.', 'Review takes up to 48 hours. You can prepare your products in the meantime.')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
      <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Retour">
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      <Text className="text-lg font-bold text-gray-900">{title}</Text>
    </View>
  );
}

function Field({
  label,
  hint,
  error,
  multiline = false,
  ...input
}: {
  label: string;
  hint?: string;
  error?: string | null;
  multiline?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-1 text-sm font-semibold text-gray-900">{label}</Text>
      {hint ? (
        <Text className="mb-2 text-xs text-gray-500">{hint}</Text>
      ) : null}
      <TextInput
        {...input}
        multiline={multiline}
        placeholderTextColor="#9CA3AF"
        accessibilityLabel={label}
        className={[
          'rounded-xl border px-3.5 py-3 text-sm text-gray-900',
          error ? 'border-red-400' : 'border-gray-200',
          multiline ? 'h-24' : '',
        ].join(' ')}
        style={multiline ? { textAlignVertical: 'top' } : undefined}
      />
      {error ? (
        <Text className="mt-1 text-xs text-red-600">{error}</Text>
      ) : null}
    </View>
  );
}

/** Écran de fin de parcours : succès, doublon, ou condition manquante. */
function Outcome({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name={icon} size={52} color={colors.accent} />
        <Text className="mt-4 text-center text-lg font-bold text-gray-900">
          {title}
        </Text>
        <Text className="mt-2 text-center text-sm leading-5 text-gray-600">
          {description}
        </Text>
        <Button fullWidth className="mt-7" onPress={onAction}>
          {actionLabel}
        </Button>
      </View>
    </SafeAreaView>
  );
}
