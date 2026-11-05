import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BrandLogo } from '@/components/BrandLogo';
import { AuthBackgroundCarousel } from '@/components/auth/AuthBackgroundCarousel';
import { AuthFooter } from '@/components/auth/AuthFooter';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
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
  const { t } = useAppLanguage();
  const register = useRegister();
  // Jamais `router.back()` en direct : arrivé par lien, par notification ou
  // après un rechargement de page, l'historique est vide et l'action échoue
  // en silence — la flèche est là, elle ne fait rien.
  const goBack = useGoBack('/login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Sept champs, et aucun enchaînement : il fallait viser chacun du doigt.
   * « Suivant » descend maintenant le formulaire jusqu'au bout, où la touche
   * de validation soumet directement.
   *
   * Le téléphone manque à cette chaîne : `PhoneInput` enveloppe son champ
   * avec un sélecteur de pays et n'expose pas de référence. On enchaîne donc
   * email → mot de passe, et le numéro se saisit à la main — c'est le seul
   * maillon manquant, à reprendre si l'on touche un jour à ce composant.
   */
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  /** Les erreurs n'apparaissent qu'après une première tentative. */
  const [submitted, setSubmitted] = useState(false);

  const computeErrors = (): FormErrors => {
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

    return nextErrors;
  };

  // Après la première tentative, les erreurs suivent la saisie : sans cela,
  // on corrigeait un champ sans que le message disparaisse, et sept erreurs
  // affichées d'un coup restaient affichées jusqu'au prochain appui.
  useEffect(() => {
    if (!submitted) return;
    setErrors(computeErrors());
  }, [
    submitted,
    firstName,
    lastName,
    email,
    phone,
    countryIso,
    password,
    confirmPassword,
    t,
  ]);

  const handleSubmit = () => {
    setSubmitted(true);
    const nextErrors = computeErrors();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
        {/* Retour à gauche, langue à droite : le sélecteur était tout en bas,
            après « Découvrir sans compte ». Quelqu'un qui ne lit pas le
            français devait traverser un formulaire entier en français pour
            trouver comment en changer. */}
        <View className="w-full flex-row items-center justify-between">
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('Retour', 'Back')}
            className="py-1"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <LanguageToggle light />
        </View>

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
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View className="flex-1">
                <Input
                  ref={lastNameRef}
                  label={t('Nom', 'Last name')}
                  appearance="light"
                  placeholder="Diop"
                  autoCapitalize="words"
                  autoComplete="family-name"
                  value={lastName}
                  onChangeText={setLastName}
                  error={errors.lastName}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>
            <Input
              ref={emailRef}
              label="Email"
              appearance="light"
              placeholder={t('vous@exemple.com', 'you@example.com')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
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
              ref={passwordRef}
              label={t('Mot de passe', 'Password')}
              appearance="light"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              // La règle était annoncée APRÈS l'échec : on l'apprenait en la
              // violant. Elle est désormais visible pendant la saisie.
              hint={t(
                `${PASSWORD_MIN_LENGTH} caractères minimum`,
                `At least ${PASSWORD_MIN_LENGTH} characters`,
              )}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <Input
              ref={confirmRef}
              label={t('Confirmer le mot de passe', 'Confirm password')}
              appearance="light"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
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
              <FormError message={register.errorMessage} light />
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

          {/* « Découvrir sans compte » retiré ici aussi. Le sélecteur de
              langue est déjà en haut, à côté de la flèche de retour : en
              afficher un second ici ne ferait que dédoubler le réglage. */}
        </View>
        <AuthFooter light />
      </Screen>
    </KeyboardAvoidingView>
  );
}
