import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { colors } from '@/constants/colors';
import { COUNTRIES, DEFAULT_COUNTRY_ISO, findCountry } from '@/constants/countries';
import { useLogout } from '@/hooks/useAuth';
import type { Me } from '@/hooks/useMe';
import { api } from '@/lib/api';
import { useAppLanguage } from '@/lib/appLanguage';
import { isValidPhone, toE164 } from '@/lib/validators';
import { useOnboardingStore } from '@/store/onboarding.store';

/**
 * Écran bloquant : le numéro de téléphone d'un compte créé par Google.
 *
 * Google donne le nom et l'email, jamais le numéro. Or c'est par téléphone
 * que le GP ou le livreur joint le client au moment de remettre un colis : un
 * compte sans numéro ne pourrait pas être livré. On le demande donc une fois,
 * avant tout le reste, comme l'inscription par email le demande d'emblée.
 *
 * Indicatif pré-réglé sur le pays choisi au premier lancement : quelqu'un à
 * Paris n'a pas à chercher la France dans la liste.
 */
export function PhoneGate() {
  const { t } = useAppLanguage();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const paysOnboarding = useOnboardingStore((s) => s.pays);

  const [countryIso, setCountryIso] = useState(
    paysOnboarding && COUNTRIES.some((c) => c.iso === paysOnboarding)
      ? paysOnboarding
      : DEFAULT_COUNTRY_ISO,
  );
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();

  const enregistrer = useMutation({
    mutationFn: async (e164: string) => {
      const { data } = await api.post<Me>('/api/me/phone', { phone: e164 });
      return data;
    },
    onSuccess: (me) => {
      // La réponse est le profil à jour : l'écran se ferme sans attendre de
      // nouvelle lecture, et l'écran suivant (conditions) s'enchaîne.
      queryClient.setQueryData(['me'], me);
    },
  });

  const erreurServeur = (() => {
    const error = enregistrer.error;
    if (!error) return null;
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      return t(
        'Ce numéro est déjà associé à un autre compte.',
        'This number is already linked to another account.',
      );
    }
    return t(
      "Le numéro n'a pas pu être enregistré. Réessayez.",
      'The number could not be saved. Please try again.',
    );
  })();

  const valider = () => {
    const e164 = toE164(findCountry(countryIso).dial, phone);
    if (!phone.trim()) {
      setFieldError(t('Le téléphone est requis.', 'Phone number is required.'));
      return;
    }
    if (!isValidPhone(e164)) {
      setFieldError(t('Ce numéro semble incomplet.', 'This number looks incomplete.'));
      return;
    }
    setFieldError(undefined);
    enregistrer.mutate(e164);
  };

  return (
    <Modal visible animationType="fade" onRequestClose={() => undefined}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="w-full max-w-lg flex-1 self-center px-6">
            <View className="flex-1 justify-center">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="call-outline" size={26} color={colors.primary} />
              </View>
              <Text className="mt-5 text-2xl font-extrabold leading-8 text-gray-900">
                {t('Votre numéro de téléphone', 'Your phone number')}
              </Text>
              <Text className="mt-2 text-base leading-6 text-gray-500">
                {t(
                  'Le GP ou le livreur vous appellera à ce numéro pour vous remettre vos colis.',
                  'Your GP or courier will call this number to hand over your packages.',
                )}
              </Text>

              <View className="mt-7">
                <PhoneInput
                  countryIso={countryIso}
                  onCountryChange={setCountryIso}
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value);
                    if (fieldError) setFieldError(undefined);
                  }}
                  error={fieldError}
                />
              </View>

              {erreurServeur ? (
                <View className="mt-3">
                  <FormError message={erreurServeur} />
                </View>
              ) : null}
            </View>

            <View className="gap-3 pb-4">
              <Button fullWidth loading={enregistrer.isPending} onPress={valider}>
                {t('Continuer', 'Continue')}
              </Button>
              <Pressable
                onPress={() => logout.mutate()}
                disabled={logout.isPending}
                accessibilityRole="button"
                hitSlop={8}
                className="items-center py-1"
              >
                <Text className="text-[13px] text-gray-500">
                  {t('Se déconnecter', 'Log out')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
