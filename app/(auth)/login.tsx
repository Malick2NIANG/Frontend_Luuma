import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { FormError } from '@/components/ui/FormError';
import { Input, type InputHandle } from '@/components/ui/Input';
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

  // Permet à « Suivant » du clavier d'amener au mot de passe plutôt que
  // d'obliger à viser le champ du doigt.
  const passwordRef = useRef<InputHandle>(null);

  /**
   * Quelle biométrie cet appareil propose-t-il réellement ?
   *
   * L'icône était une empreinte pour tout le monde, y compris sur un iPhone
   * qui n'a que Face ID depuis huit ans. Présenter un doigt à quelqu'un à qui
   * on va demander son visage, c'est lui faire chercher un capteur qui
   * n'existe pas sur son téléphone.
   */
  const [biometricIcon, setBiometricIcon] = useState<
    'finger-print-outline' | 'scan-outline'
  >('finger-print-outline');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;

    void LocalAuthentication.supportedAuthenticationTypesAsync()
      .then((types) => {
        if (!active) return;
        const hasFace = types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        );
        const hasFingerprint = types.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT,
        );
        // La reconnaissance faciale l'emporte quand les deux existent : c'est
        // elle que le système tente en premier.
        if (hasFace) setBiometricIcon('scan-outline');
        else if (hasFingerprint) setBiometricIcon('finger-print-outline');
      })
      .catch(() => {
        // L'icône par défaut reste affichée : savoir quel capteur équipe
        // l'appareil est un confort, pas une condition de fonctionnement.
      });

    return () => {
      active = false;
    };
  }, []);

  /**
   * Les erreurs ne se recalculent QU'APRÈS une première tentative.
   *
   * Valider pendant la toute première saisie reviendrait à afficher
   * « Adresse email invalide » dès la première lettre tapée, ce qui est à la
   * fois faux et décourageant. En revanche, une fois l'erreur montrée, elle
   * doit disparaître dès que la personne corrige : la laisser jusqu'au
   * prochain appui donne l'impression que la correction n'a pas été prise.
   */
  const [submitted, setSubmitted] = useState(false);

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

  const computeErrors = (): FormErrors => {
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
    return nextErrors;
  };

  // Après la première tentative, l'affichage suit la saisie en direct.
  useEffect(() => {
    if (!submitted) return;
    setErrors(computeErrors());
    // `t` change avec la langue : les messages déjà affichés doivent suivre.
  }, [submitted, email, password, t]);

  const handleSubmit = () => {
    setSubmitted(true);
    const nextErrors = computeErrors();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
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
                  // « Suivant » amène au mot de passe ; `blurOnSubmit={false}`
                  // évite que le clavier se referme entre les deux champs.
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <View className="w-full gap-1.5">
                  <Input
                    ref={passwordRef}
                    label={t('Mot de passe', 'Password')}
                    appearance="light"
                    placeholder="••••••••"
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                    error={errors.password}
                    // Valider depuis le clavier soumet le formulaire : c'est
                    // le réflexe de tout le monde, et il ne marchait pas.
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
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
                  <FormError message={login.errorMessage} light />
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
                      accessibilityLabel={
                        biometricIcon === 'scan-outline'
                          ? t(
                              'Déverrouiller avec la reconnaissance faciale',
                              'Unlock with face recognition',
                            )
                          : t(
                              'Déverrouiller avec votre empreinte',
                              'Unlock with your fingerprint',
                            )
                      }
                      className="h-12 w-12 items-center justify-center rounded-full border border-white/50 bg-white/10"
                    >
                      <Ionicons name={biometricIcon} size={23} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </View>
                {biometricError ? (
                  <FormError message={biometricError} light />
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

              {/* Plus de bouton « Découvrir sans compte » : il n'a plus
                  d'objet. L'application s'ouvre désormais SUR le fil, et cet
                  écran n'est atteint que lorsqu'on choisit de se connecter,
                  ou qu'une action l'exige — commander, écrire à un vendeur,
                  ouvrir une boutique. La visite n'est plus une dérogation à
                  demander, c'est l'état par défaut. */}
              <View className="items-center">
                <LanguageToggle light />
              </View>
            </View>
          <View className="mt-3">
            <AuthFooter light />
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
