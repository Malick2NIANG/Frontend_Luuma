import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useFinishGoogleWebSignIn } from '@/hooks/useAuth';
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * Retour de Google, sur le web.
 *
 * Google renvoie ici après la connexion ; le serveur a déjà posé la session
 * en cookie. On la convertit en jeton — l'application ne s'authentifie que
 * par jeton, sur le web comme sur téléphone — puis on repart là où la
 * personne allait.
 *
 * Sur téléphone, cette page ne s'affiche jamais : le navigateur
 * d'authentification se referme dès qu'il voit l'adresse `luuma://auth/google`.
 */
export default function GoogleReturnScreen() {
  const router = useRouter();
  const { t } = useAppLanguage();
  const finish = useFinishGoogleWebSignIn();
  const { returnTo, error } = useLocalSearchParams<{
    returnTo?: string;
    error?: string;
  }>();
  const [echec, setEchec] = useState(Boolean(error));
  const lance = useRef(false);

  useEffect(() => {
    if (error || lance.current) return;
    lance.current = true;

    void finish()
      .then((ok) => {
        if (!ok) return setEchec(true);
        // Chemin interne seulement : une valeur de l'URL ne doit pas pouvoir
        // emmener ailleurs.
        const destination =
          returnTo && returnTo.startsWith('/') ? returnTo : '/(app)/(tabs)';
        router.replace(destination as Href);
      })
      .catch(() => setEchec(true));
  }, [error, finish, returnTo, router]);

  if (echec) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-white px-8">
        <Ionicons name="alert-circle-outline" size={40} color={colors.primary} />
        <Text className="text-center text-lg font-bold text-gray-900">
          {t('Connexion Google interrompue', 'Google sign-in interrupted')}
        </Text>
        <Text className="text-center text-sm leading-5 text-gray-500">
          {error === 'access_denied'
            ? t(
                "Vous avez refusé l'accès à votre compte Google.",
                'You declined access to your Google account.',
              )
            : t(
                "La connexion n'a pas pu aboutir. Réessayez.",
                'Sign-in could not be completed. Please try again.',
              )}
        </Text>
        <Button fullWidth onPress={() => router.replace('/(auth)/login')}>
          {t('Retour à la connexion', 'Back to sign-in')}
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white">
      <ActivityIndicator color={colors.primary} />
      <Text className="text-sm text-gray-500">
        {t('Connexion en cours…', 'Signing you in…')}
      </Text>
    </View>
  );
}
