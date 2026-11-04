import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useAppLanguage } from '@/lib/appLanguage';

export interface AuthPromptProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  /** Écran auquel revenir une fois connecté. */
  returnTo: string;
}

/**
 * Invitation à se connecter, affichée dans un onglet plutôt qu'une redirection.
 *
 * Rediriger depuis un onglet piège l'utilisateur : il tape « Commandes », se
 * retrouve sur un formulaire de connexion, et n'a plus de retour évident.
 * Ici il reste dans l'app, voit pourquoi un compte est utile, et décide.
 */
export function AuthPrompt({
  icon = 'lock-closed-outline',
  title,
  description,
  returnTo,
}: AuthPromptProps) {
  const router = useRouter();
  const { t } = useAppLanguage();

  const goTo = (pathname: '/(auth)/login' | '/(auth)/register') => {
    router.push({ pathname, params: { returnTo } });
  };

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Ionicons name={icon} size={44} color="#9CA3AF" />
      <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
        {title}
      </Text>
      <Text className="mt-1 text-center text-sm text-gray-500">{description}</Text>

      <Button fullWidth className="mt-6" onPress={() => goTo('/(auth)/register')}>
        {t('Créer un compte', 'Create an account')}
      </Button>
      <Button
        variant="ghost"
        fullWidth
        className="mt-1"
        onPress={() => goTo('/(auth)/login')}
      >
        {t("J'ai déjà un compte", 'I already have an account')}
      </Button>
    </View>
  );
}
