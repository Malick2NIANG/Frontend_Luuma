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
import { AuthBackgroundCarousel } from '@/components/auth/AuthBackgroundCarousel';
import { AuthFooter } from '@/components/auth/AuthFooter';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Screen } from '@/components/ui/Screen';
import { DEFAULT_COUNTRY_ISO, findCountry } from '@/constants/countries';
import { useRegister } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import {
  isValidEmail,
  isValidPhone,
  PASSWORD_MIN_LENGTH,
  toE164,
} from '@/lib/validators';
import { useAppLanguage } from '@/lib/appLanguage';
import { useAuthStore } from '@/store/auth.store';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const { t } = useAppLanguage();
  const register = useRegister();
  // Jamais `router.back()` en direct : arrivé par lien, par notification ou
  // après un rechargement de page, l'historique est vide et l'action échoue
  // en silence — la flèche est là, elle ne fait rien.
  const goBack = useGoBack('/login');
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!firstName.trim()) {
      nextErrors.firstName = t('Le prénom est requis.', 'First name is required.');
    }
    if (!lastName.trim()) {
      nextErrors.lastName = t('Le nom est requis.', 'Last name is required.');
    }
    if (!email.trim()) {
      nextErrors.email = t("L'email est requis.", 'Email is required.');
    } else if (!isValidEmail(email)) {
      nextErrors.email = t('Adresse email invalide.', 'Invalid email address.');
    }
    if (!phone.trim()) {
      nextErrors.phone = t('Le téléphone est requis.', 'Phone number is required.');
    } else if (!isValidPhone(toE164(findCountry(countryIso).dial, phone))) {
      // Le message ne parle plus de format international : l'indicatif est
      // choisi à part, la personne n'a qu'un numéro local à taper.
      nextErrors.phone = t(
        'Numéro invalide. Vérifiez les chiffres saisis.',
        'Invalid number. Check the digits you entered.',
      );
    }
    if (!password) {
      nextErrors.password = t('Le mot de passe est requis.', 'Password is required.');
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = t(
        `Minimum ${PASSWORD_MIN_LENGTH} caractères.`,
        `At least ${PASSWORD_MIN_LENGTH} characters.`,
      );
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = t(
        'Les mots de passe ne correspondent pas.',
        'Passwords do not match.',
      );
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const first = firstName.trim();
    const last = lastName.trim();

    register.mutate({
      // `name` reste envoyé : better-auth l'exige et tout l'affichage de
      // l'application s'appuie dessus. Les deux champs séparés s'ajoutent,
      // ils ne le remplacent pas.
      name: `${first} ${last}`,
      firstName: first,
      lastName: last,
      email: email.trim(),
      phone: toE164(findCountry(countryIso).dial, phone),
      password,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthBackgroundCarousel />
      <Screen scroll contentMaxWidth={520} transparent style={{ zIndex: 1 }}>
        {/* Flèche de retour explicite : l'écran est atteint depuis la
            connexion, et le geste de retour n'existe pas sur le web. */}
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Retour', 'Back')}
          className="self-start py-1"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        <View className="flex-1 justify-center gap-5 pb-6">
          <View className="items-center gap-4">
            {/* Même logo que la connexion et l'écran d'accueil. L'icône carrée
                à coins arrondis faisait « raccourci d'application ». */}
            <BrandLogo width={80} height={56} light />
            <View className="w-full gap-1">
              <Text className="text-center text-2xl font-bold text-white">
                {t('Créer un compte', 'Create an account')}
              </Text>
              <Text className="text-center text-sm text-white">
                {t('Rejoignez la communauté Luuma', 'Join the Luuma community')}
              </Text>
            </View>
          </View>

          <View className="w-full gap-4">
            {/* Deux champs étiquetés plutôt qu'un « nom complet ».
                L'ordre nom/prénom varie selon les contextes au Sénégal :
                c'est précisément l'argument pour deux champs nommés, là où un
                champ unique laisse chacun deviner. */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label={t('Prénom', 'First name')}
                  appearance="light"
                  placeholder="Awa"
                  autoCapitalize="words"
                  autoComplete="given-name"
                  value={firstName}
                  onChangeText={setFirstName}
                  error={errors.firstName}
                />
              </View>
              <View className="flex-1">
                <Input
                  label={t('Nom', 'Last name')}
                  appearance="light"
                  placeholder="Diop"
                  autoCapitalize="words"
                  autoComplete="family-name"
                  value={lastName}
                  onChangeText={setLastName}
                  error={errors.lastName}
                />
              </View>
            </View>
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
            <PhoneInput
              countryIso={countryIso}
              appearance="light"
              onCountryChange={setCountryIso}
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
            />
            <Input
              label={t('Mot de passe', 'Password')}
              appearance="light"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />
            <Input
              label={t('Confirmer le mot de passe', 'Confirm password')}
              appearance="light"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
            />

            {/* Mention passive, sans case à cocher.
                L'acceptation formelle se fait à la première ouverture, sur un
                écran bloquant où le texte est réellement affiché — une case
                cochée à côté d'un lien qu'on n'ouvre jamais ne vaut pas un
                consentement éclairé. Mais l'information doit être donnée AU
                MOMENT DE LA COLLECTE, d'où cette mention et ces liens. */}
            <Text className="text-center text-[11.5px] leading-[17px] text-white">
              {t(
                'En créant un compte, vous acceptez nos',
                'By creating an account, you agree to our',
              )}{' '}
              <Link href="/legal/terms" className="font-semibold text-white underline">
                {t('conditions générales', 'terms of service')}
              </Link>{' '}
              {t('et notre', 'and our')}{' '}
              <Link
                href="/legal/privacy"
                className="font-semibold text-white underline"
              >
                {t('politique de confidentialité', 'privacy policy')}
              </Link>
              {t(
                ', que nous vous ferons lire à la première ouverture.',
                ', which we will ask you to read the first time you open the app.',
              )}
            </Text>

            {register.errorMessage ? (
              <Text className="text-center text-sm text-white">
                {register.errorMessage}
              </Text>
            ) : null}

            <Button
              onPress={handleSubmit}
              loading={register.isPending}
              fullWidth
            >
              {t('Créer mon compte', 'Create my account')}
            </Button>
          </View>

          <GoogleSignInButton light />

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-white">
              {t('Déjà un compte ?', 'Already have an account?')}
            </Text>
            <Link
              href={{
                pathname: '/login',
                params: returnTo ? { returnTo } : {},
              }}
              className="text-sm font-semibold text-white underline"
            >
              {t('Se connecter', 'Sign in')}
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
                'Explore Luuma without creating an account',
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
        <AuthFooter light />
      </Screen>
    </KeyboardAvoidingView>
  );
}
