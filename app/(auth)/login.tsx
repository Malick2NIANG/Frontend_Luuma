import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthBackgroundCarousel } from '@/components/auth/AuthBackgroundCarousel';
import { AuthFooter } from '@/components/auth/AuthFooter';
import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useLogin } from '@/hooks/useAuth';
import { useAppLanguage } from '@/lib/appLanguage';
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
  const { t } = useAppLanguage();
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const hasSavedSession = useAuthStore((state) => state.hasSavedSession);
  const biometricEnabled = useAuthStore((state) => state.biometricEnabled);
  const unlockWithBiometrics = useAuthStore(
    (state) => state.unlockWithBiometrics,
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [biometricError, setBiometricError] = useState('');
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const greeting =
    currentHour >= 5 && currentHour < 12
      ? t('Bonjour', 'Good morning')
      : currentHour < 18 && currentHour >= 12
        ? t('Bon après\u2011midi', 'Good afternoon')
        : t('Bonsoir', 'Good evening');

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) {
      nextErrors.email = t("L'email est requis.", 'Email is required.');
    } else if (!isValidEmail(email)) {
      nextErrors.email = t('Adresse email invalide.', 'Invalid email address.');
    }
    if (!password) {
      nextErrors.password = t(
        'Le mot de passe est requis.',
        'Password is required.',
      );
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    login.mutate({ email: email.trim(), password });
  };

  const handleBiometricUnlock = async () => {
    setBiometricError('');
    const result = await unlockWithBiometrics();
    if (result === 'success') {
      router.replace(
        (returnTo?.startsWith('/') ? returnTo : '/(app)/(tabs)') as Href,
      );
    } else if (result === 'failed' || result === 'unavailable') {
      setBiometricError(
        t(
          'Déverrouillage impossible. Connectez-vous avec votre email et votre mot de passe.',
          'Could not unlock. Sign in with your email and password.',
        ),
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthBackgroundCarousel />
      <Screen
        scroll
        contentContainerClassName="flex-grow"
        contentMaxWidth={520}
        transparent
        style={{ zIndex: 1 }}
      >
        <View className="flex-1">
            <View className="flex-1 items-center justify-center gap-4">
              <BrandLogo width={80} height={56} light />

              <View className="w-full gap-1">
                <Text className="text-center text-2xl font-bold text-white">
                  {greeting}
                </Text>
                <Text className="text-center text-sm text-white">
                  {t(
                    'Connectez-vous pour continuer sur Luuma',
                    'Sign in to continue to Luuma',
                  )}
                </Text>
              </View>

              <View className="w-full gap-3">
                <Input
                  label="Email"
                  appearance="light"
                  placeholder={t('vous@exemple.com', 'you@example.com')}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                />
                <View className="w-full gap-1.5">
                  <Input
                    label={t('Mot de passe', 'Password')}
                    appearance="light"
                    placeholder="••••••••"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                    error={errors.password}
                  />
                  <Link href="/forgot-password" asChild>
                    <Pressable
                      accessibilityRole="link"
                      className="min-h-11 min-w-11 self-end justify-center px-2"
                    >
                      <Text className="text-[13px] font-semibold text-white underline">
                        {t('Mot de passe oublié ?', 'Forgot password?')}
                      </Text>
                    </Pressable>
                  </Link>
                </View>

                {login.errorMessage ? (
                  <Text className="text-center text-sm text-white">
                    {login.errorMessage}
                  </Text>
                ) : null}

                <View className="w-full flex-row items-center gap-2">
                  <View className="flex-1">
                    <Button
                      onPress={handleSubmit}
                      loading={login.isPending}
                      fullWidth
                    >
                      {t('Se connecter', 'Sign in')}
                    </Button>
                  </View>
                  {hasSavedSession && biometricEnabled ? (
                    <Pressable
                      onPress={() => void handleBiometricUnlock()}
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        'Déverrouiller avec vos données biométriques',
                        'Unlock with biometrics',
                      )}
                      className="h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/10"
                    >
                      <Ionicons
                        name="finger-print-outline"
                        size={23}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  ) : null}
                </View>
                {biometricError ? (
                  <Text className="text-center text-xs text-white">
                    {biometricError}
                  </Text>
                ) : null}
              </View>

              <GoogleSignInButton light />

              <View className="flex-row items-center justify-center gap-1">
                <Text className="text-sm text-white">
                  {t('Pas encore de compte ?', 'Don’t have an account?')}
                </Text>
                <Link
                  href={{
                    pathname: '/register',
                    params: returnTo ? { returnTo } : {},
                  }}
                  className="text-sm font-semibold text-white underline"
                >
                  {t('Créer un compte', 'Create an account')}
                </Link>
              </View>

              <View className="items-center">
                <Pressable
                  onPress={() => {
                    continueAsGuest();
                    router.replace('/(app)/(tabs)');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    'Découvrir Luuma sans créer de compte',
                    'Explore Luuma without an account',
                  )}
                  className="flex-row items-center gap-1 py-1"
                >
                  <Text className="text-xs font-medium text-white">
                    {t('Découvrir sans compte', 'Explore without an account')}
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                </Pressable>
              </View>
              <LanguageToggle light />
            </View>
          <View className="mt-3">
            <AuthFooter light />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
