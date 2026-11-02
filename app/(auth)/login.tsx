import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useLogin } from '@/hooks/useAuth';
import { isValidEmail } from '@/lib/validators';
import { useAuthStore } from '@/store/auth.store';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const login = useLogin();
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) {
      nextErrors.email = "L'email est requis.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Adresse email invalide.';
    }
    if (!password) {
      nextErrors.password = 'Le mot de passe est requis.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    login.mutate({ email: email.trim(), password });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Pas de défilement : la connexion tient sur un écran, et une barre de
          défilement sur un formulaire de six éléments donne l'impression
          qu'il manque quelque chose plus bas. Les marges et le logo ont été
          resserrés pour que ça reste vrai sur les petits écrans. */}
      <Screen>
        <View className="flex-1 items-center justify-center gap-5">
          <BrandLogo width={88} height={62} />

          <View className="w-full gap-1">
            <Text className="text-center text-2xl font-bold text-gray-900">Bon retour</Text>
            <Text className="text-center text-sm text-gray-500">
              Connectez-vous pour continuer sur Luuma
            </Text>
          </View>

          <View className="w-full gap-4">
            <Input
              label="Email"
              placeholder="vous@exemple.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            <View className="w-full gap-1.5">
              <Input
                label="Mot de passe"
                placeholder="••••••••"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />
              {/* Aligné à droite sous le champ : c'est là qu'on le cherche
                  après avoir échoué à se connecter. Le vert de marque suffit
                  à le signaler comme cliquable — c'est déjà la convention de
                  « Créer un compte » plus bas. */}
              <Link
                href="/forgot-password"
                className="self-end text-[12.5px] font-semibold text-primary"
              >
                Mot de passe oublié ?
              </Link>
            </View>

            {login.errorMessage ? (
              <Text className="text-center text-sm text-red-500">{login.errorMessage}</Text>
            ) : null}

            <Button onPress={handleSubmit} loading={login.isPending} fullWidth>
              Se connecter
            </Button>
          </View>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-gray-500">Pas encore de compte ?</Text>
            {/* `returnTo` est transmis : quelqu'un interrompu au panier et qui
                bascule sur l'inscription doit y revenir malgré le détour. */}
            <Link
              href={{ pathname: '/register', params: returnTo ? { returnTo } : {} }}
              className="text-sm font-semibold text-primary"
            >
              Créer un compte
            </Link>
          </View>

          {/* Porte entrouverte : on peut regarder le catalogue sans compte,
              mais aucune action n'est possible — panier, commande, message,
              abonnement passent tous par `useRequireAuth` et ramènent ici.
              La visite ne survit pas au redémarrage : l'application rouvre sur
              cet écran.

              Dessiné comme un bouton bordé, et non comme du texte : c'est le
              troisième choix de l'écran, il doit se voir sans concurrencer
              « Se connecter ». */}
          <View className="w-full items-center gap-1.5">
            <Pressable
              onPress={() => {
                continueAsGuest();
                router.replace('/(app)/(tabs)');
              }}
              accessibilityRole="button"
              accessibilityLabel="Découvrir Luuma sans créer de compte"
              className="w-full flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3"
            >
              <Text className="text-sm font-semibold text-gray-700">
                Découvrir sans compte
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#374151" />
            </Pressable>
            <Text className="text-center text-[11px] text-gray-400">
              Un compte sera demandé au moment de commander.
            </Text>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
