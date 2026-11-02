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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IdDocumentField } from '@/components/pro/IdDocumentField';
import { PayoutField } from '@/components/pro/PayoutField';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useMe } from '@/hooks/useMe';
import {
  GP_PAYOUT_METHODS,
  useCreateGp,
  type GpPayoutMethod,
} from '@/hooks/useProfessional';
import { useRequireAuth } from '@/hooks/useRequireAuth';

/**
 * Paliers de confiance, repris de `common/gp-capacity.ts`.
 *
 * Annoncés dès l'inscription : découvrir après coup qu'on est plafonné à 5 kg
 * ressemblerait à une brimade, alors que c'est la contrepartie de la confiance
 * qu'on demande aux clients — ils confient de l'argent à un inconnu.
 */
const TRUST_TIERS = [
  { trips: '0 à 2 voyages', weight: '5 kg' },
  { trips: '3 à 4 voyages', weight: '10 kg' },
  { trips: '5 à 9 voyages', weight: '20 kg' },
  { trips: '10 voyages et plus', weight: '30 kg' },
];

export default function GpOnboardingScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/profile');
  const { isReady } = useRequireAuth('/(app)/gp/onboarding');
  const { me, can } = useMe();
  const createGp = useCreateGp();

  const [idDocument, setIdDocument] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<GpPayoutMethod | null>(null);
  const [payoutAccount, setPayoutAccount] = useState('');
  const [touched, setTouched] = useState(false);

  if (!isReady) return <View className="flex-1 bg-white" />;

  // Succès testé en premier : l'envoi rafraîchit `me`, qui porte alors le
  // profil GP tout juste créé. Dans l'autre ordre, la confirmation serait
  // remplacée par « Vous êtes déjà GP ».
  if (createGp.isSuccess) {
    return (
      <Outcome
        icon="checkmark-circle"
        title="Dossier déposé"
        description="Nous vérifions votre pièce d'identité sous 48 heures. Vous pouvez déjà enregistrer vos trajets : ils seront visibles dès la validation."
        actionLabel="Préparer mes trajets"
        onAction={() => router.replace('/(app)/(tabs)/profile')}
      />
    );
  }

  if (me?.gp) {
    return (
      <Outcome
        icon="airplane"
        title="Vous êtes déjà GP"
        description="Retrouvez votre espace depuis votre profil."
        actionLabel="Aller au profil"
        onAction={() => router.replace('/(app)/(tabs)/profile')}
      />
    );
  }

  if (!can.becomeGp) {
    return (
      <Outcome
        icon="mail-outline"
        title="Vérifiez d'abord votre email"
        description="Transporter les achats d'inconnus engage votre responsabilité : nous devons pouvoir vous joindre."
        actionLabel="Retour au profil"
        onAction={() => router.replace('/(app)/(tabs)/profile')}
      />
    );
  }

  // La pièce d'identité n'est pas optionnelle en pratique : sans elle, aucun
  // administrateur ne peut valider le dossier, il resterait en attente
  // indéfiniment. Le serveur l'accepte, l'interface l'exige.
  const documentValid = Boolean(idDocument);
  const payoutValid = Boolean(payoutMethod) && payoutAccount.trim().length >= 4;
  const formValid = documentValid && payoutValid;

  const handleSubmit = () => {
    setTouched(true);
    if (!formValid) return;

    createGp.mutate({
      idDocumentUrl: idDocument ?? undefined,
      payoutMethod: payoutMethod ?? undefined,
      payoutAccount: payoutAccount.trim(),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Devenir GP</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="px-4 pb-8 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-5 text-[13px] leading-5 text-gray-600">
            Vous voyagez entre le Sénégal et l'Europe ? Rentabilisez les kilos
            libres de votre valise en transportant les achats de la diaspora.
          </Text>

          <View className="mb-6 rounded-2xl border border-gray-100 p-4">
            <Text className="mb-2.5 text-sm font-semibold text-gray-900">
              Combien pouvez-vous transporter ?
            </Text>
            <Text className="mb-3 text-xs leading-4 text-gray-600">
              La capacité augmente avec vos voyages honorés. Elle ne redescend
              jamais.
            </Text>
            {TRUST_TIERS.map((tier) => (
              <View
                key={tier.trips}
                className="flex-row justify-between border-t border-gray-50 py-1.5"
              >
                <Text className="text-xs text-gray-600">{tier.trips}</Text>
                <Text className="text-xs font-semibold text-gray-900">
                  {tier.weight}
                </Text>
              </View>
            ))}
          </View>

          <IdDocumentField value={idDocument} onChange={setIdDocument} />
          {touched && !documentValid ? (
            <Text className="mt-2 text-xs text-red-600">
              La pièce d'identité est obligatoire pour valider votre dossier.
            </Text>
          ) : null}

          <View className="mt-6">
            <PayoutField
              methods={GP_PAYOUT_METHODS}
              method={payoutMethod}
              account={payoutAccount}
              onMethodChange={setPayoutMethod}
              onAccountChange={setPayoutAccount}
            />
            {touched && !payoutValid ? (
              <Text className="mt-2 text-xs text-red-600">
                Renseignez le compte qui recevra vos gains.
              </Text>
            ) : null}
          </View>

          {createGp.errorMessage ? (
            <Text className="mt-4 text-center text-sm text-red-600">
              {createGp.errorMessage}
            </Text>
          ) : null}
        </ScrollView>

        <View className="border-t border-gray-100 px-4 pt-3">
          <Button fullWidth loading={createGp.isPending} onPress={handleSubmit}>
            Déposer mon dossier
          </Button>
          <Text className="mt-2 text-center text-[11px] text-gray-500">
            Examen sous 48 h. Vous pourrez enregistrer vos trajets entre-temps.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
