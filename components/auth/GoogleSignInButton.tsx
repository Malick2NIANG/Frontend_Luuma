import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FormError } from '@/components/ui/FormError';
import { useGoogleSignIn } from '@/hooks/useAuth';
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * « Continuer avec Google ».
 *
 * Même bouton pour la connexion et l'inscription : un compte Google qui n'a
 * jamais servi sur Luuma en crée un, sinon il s'y reconnecte. Le numéro de
 * téléphone, que Google ne fournit pas, est demandé juste après (PhoneGate),
 * puis les conditions (TermsGate) — comme pour une inscription classique.
 */
export function GoogleSignInButton({ light = false }: { light?: boolean }) {
  const { t } = useAppLanguage();
  const { start, pending, errorMessage } = useGoogleSignIn();

  return (
    <View className="w-full gap-2">
      <View className="flex-row items-center gap-3">
        <View className={light ? 'h-px flex-1 bg-white/50' : 'h-px flex-1 bg-gray-200'} />
        <Text className={light ? 'text-xs text-white' : 'text-xs text-gray-400'}>
          {t('ou', 'or')}
        </Text>
        <View className={light ? 'h-px flex-1 bg-white/50' : 'h-px flex-1 bg-gray-200'} />
      </View>

      <Pressable
        onPress={() => void start()}
        disabled={pending}
        accessibilityRole="button"
        accessibilityState={{ disabled: pending, busy: pending }}
        accessibilityLabel={t('Continuer avec Google', 'Continue with Google')}
        className={[
          'w-full flex-row items-center justify-center gap-2 rounded-xl border py-3',
          light
            ? 'border-white/60 bg-white/10 active:bg-white/20'
            : 'border-gray-200 bg-white active:bg-gray-50',
        ].join(' ')}
      >
        {pending ? (
          <ActivityIndicator color={light ? '#FFFFFF' : '#4B5563'} />
        ) : (
          <>
            <Image
              source={require('@/assets/google-g-logo.png')}
              contentFit="contain"
              style={{ width: 20, height: 20 }}
              accessibilityElementsHidden
            />
            <Text
              className={[
                'text-sm font-semibold',
                light ? 'text-white' : 'text-gray-800',
              ].join(' ')}
            >
              {t('Continuer avec Google', 'Continue with Google')}
            </Text>
          </>
        )}
      </Pressable>

      {errorMessage ? <FormError message={errorMessage} light={light} /> : null}
    </View>
  );
}
