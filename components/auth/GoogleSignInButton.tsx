import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * Connexion Google — annoncée, pas encore opérationnelle.
 *
 * Le bouton avait l'apparence exacte d'une option disponible : on cliquait,
 * et un message expliquait que ce n'était pas branché. Quelqu'un qui tente
 * trois fois pense que l'application est cassée, pas qu'une fonctionnalité
 * arrive.
 *
 * Il est donc désormais visiblement indisponible AVANT le clic — opacité
 * réduite, mention « Bientôt », `accessibilityState.disabled` pour les
 * lecteurs d'écran. La promesse reste affichée, ce qui a une valeur pour qui
 * cherche cette option, mais elle ne se fait plus passer pour un chemin
 * ouvert.
 *
 * À remplacer par un vrai `onPress` le jour où GOOGLE_CLIENT_ID est renseigné
 * et où l'écran de complétion (téléphone, conditions) existe.
 */
export function GoogleSignInButton({ light = false }: { light?: boolean }) {
  const [showSetupMessage, setShowSetupMessage] = useState(false);
  const { t } = useAppLanguage();

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
        onPress={() => setShowSetupMessage(true)}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityLabel={t(
          'Continuer avec Google — bientôt disponible',
          'Continue with Google — coming soon',
        )}
        style={{ opacity: 0.55 }}
        className={[
          'w-full flex-row items-center justify-center gap-2 rounded-xl border py-3',
          light
            ? 'border-white/60 bg-white/10'
            : 'border-gray-200 bg-white',
        ].join(' ')}
      >
        <Image
          source={require('@/assets/google-g-logo.png')}
          contentFit="contain"
          style={{ width: 20, height: 20 }}
          accessibilityLabel="Google"
        />
        <Text
          className={[
            'text-sm font-semibold',
            light ? 'text-white' : 'text-gray-800',
          ].join(' ')}
        >
          {t('Continuer avec Google', 'Continue with Google')}
        </Text>
        <View
          className="rounded-full px-2 py-0.5"
          style={{
            backgroundColor: light
              ? 'rgba(255,255,255,0.25)'
              : 'rgba(0,0,0,0.06)',
          }}
        >
          <Text
            className={[
              'text-[10px] font-bold uppercase tracking-wide',
              light ? 'text-white' : 'text-gray-600',
            ].join(' ')}
          >
            {t('Bientôt', 'Soon')}
          </Text>
        </View>
      </Pressable>
      {showSetupMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          className={light ? 'text-center text-xs text-white' : 'text-center text-xs text-gray-500'}
        >
          {t(
            'La connexion Google sera disponible après sa configuration et l’ajout du numéro de téléphone au compte.',
            'Google sign-in will be available after setup and adding a phone number to the account.',
          )}
        </Text>
      ) : null}
    </View>
  );
}
