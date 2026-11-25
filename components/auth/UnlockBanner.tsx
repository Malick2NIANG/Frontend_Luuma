import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAppLanguage } from '@/lib/appLanguage';
import { useAuthStore } from '@/store/auth.store';

/**
 * Bandeau « Déverrouiller », quand la demande d'empreinte du lancement a été
 * annulée ou a échoué.
 *
 * L'application s'ouvre quand même en visiteur : le catalogue ne doit jamais
 * être retenu par un capteur. Mais sans ce bandeau, annuler le prompt
 * revenait à perdre sa session sans le savoir, et il fallait retaper email et
 * mot de passe — précisément ce que la biométrie devait éviter.
 *
 * Posé au-dessus du contenu, en haut, et écartable : on peut vouloir
 * parcourir sans se déverrouiller.
 */
export function UnlockBanner() {
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const locked = useAuthStore((s) => s.locked);
  const token = useAuthStore((s) => s.token);
  const unlock = useAuthStore((s) => s.unlockWithBiometrics);
  const dismiss = useAuthStore((s) => s.dismissLock);
  const [visage, setVisage] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void LocalAuthentication.supportedAuthenticationTypesAsync()
      .then((types) => {
        const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        const doigt = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
        setVisage(face && !doigt);
      })
      .catch(() => undefined);
  }, []);

  if (!locked || token) return null;

  const deverrouiller = async () => {
    setEnCours(true);
    setEchec(false);
    const resultat = await unlock();
    setEnCours(false);
    if (resultat === 'failed' || resultat === 'unavailable') setEchec(true);
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 50 }}
    >
      <View
        className="flex-row items-center gap-3 rounded-2xl bg-white px-3.5 py-3"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.14,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
          <Ionicons
            name={visage ? 'scan-outline' : 'finger-print-outline'}
            size={21}
            color={colors.primary}
          />
        </View>
        <View className="flex-1">
          <Text className="text-[13.5px] font-semibold text-gray-900">
            {t('Votre session est verrouillée', 'Your session is locked')}
          </Text>
          <Text className="text-xs text-gray-500">
            {echec
              ? t(
                  'Échec. Réessayez, ou connectez-vous depuis le profil.',
                  'Failed. Try again, or sign in from your profile.',
                )
              : t('Vous naviguez en visiteur.', 'You are browsing as a guest.')}
          </Text>
        </View>
        <Pressable
          onPress={() => void deverrouiller()}
          disabled={enCours}
          accessibilityRole="button"
          className="h-9 items-center justify-center rounded-full bg-primary px-3.5 active:opacity-80"
        >
          {enCours ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text className="text-[13px] font-semibold text-white">
              {t('Déverrouiller', 'Unlock')}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Fermer', 'Close')}
        >
          <Ionicons name="close" size={18} color="#9CA3AF" />
        </Pressable>
      </View>
    </View>
  );
}
