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
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/colors';
import { DEFAULT_COUNTRY_ISO, findCountry } from '@/constants/countries';
import { useRegister } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import {
  isValidEmail,
  isValidPhone,
  PASSWORD_MIN_LENGTH,
  toE164,
} from '@/lib/validators';
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
      nextErrors.firstName = 'Le prénom est requis.';
    }
    if (!lastName.trim()) {
      nextErrors.lastName = 'Le nom est requis.';
    }
    if (!email.trim()) {
      nextErrors.email = "L'email est requis.";
    } else if (!isValidEmail(email)) {
      nextErrors.email = 'Adresse email invalide.';
    }
    if (!phone.trim()) {
      nextErrors.phone = 'Le téléphone est requis.';
    } else if (!isValidPhone(toE164(findCountry(countryIso).dial, phone))) {
      // Le message ne parle plus de format international : l'indicatif est
      // choisi à part, la personne n'a qu'un numéro local à taper.
      nextErrors.phone = 'Numéro invalide. Vérifiez les chiffres saisis.';
    }
    if (!password) {
      nextErrors.password = 'Le mot de passe est requis.';
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = `Minimum ${PASSWORD_MIN_LENGTH} caractères.`;
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
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
      <Screen scroll>
        {/* Flèche de retour explicite : l'écran est atteint depuis la
            connexion, et le geste de retour n'existe pas sur le web. */}
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          className="self-start py-1"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View className="flex-1 justify-center gap-5 pb-6">
          <View className="items-center gap-4">
            {/* Même logo que la connexion et l'écran d'accueil. L'icône carrée
                à coins arrondis faisait « raccourci d'application ». */}
            <BrandLogo width={80} height={56} />
            <View className="w-full gap-1">
              <Text className="text-center text-2xl font-bold text-gray-900">
                Créer un compte
              </Text>
              <Text className="text-center text-sm text-gray-500">
                Rejoignez la communauté Luuma
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
                  label="Prénom"
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
                  label="Nom"
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
              placeholder="vous@exemple.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
            />
            <PhoneInput
              countryIso={countryIso}
              onCountryChange={setCountryIso}
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
            />
            <Input
              label="Mot de passe"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
            />
            <Input
              label="Confirmer le mot de passe"
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
            <Text className="text-center text-[11.5px] leading-[17px] text-gray-400">
              En créant un compte, vous acceptez nos{' '}
              <Link href="/legal/terms" className="font-semibold text-gray-600">
                conditions générales
              </Link>{' '}
              et notre{' '}
              <Link href="/legal/privacy" className="font-semibold text-gray-600">
                politique de confidentialité
              </Link>
              , que nous vous ferons lire à la première ouverture.
            </Text>

            {register.errorMessage ? (
              <Text className="text-center text-sm text-red-500">{register.errorMessage}</Text>
            ) : null}

            <Button
              onPress={handleSubmit}
              loading={register.isPending}
              fullWidth
            >
              Créer mon compte
            </Button>
          </View>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-sm text-gray-500">Déjà un compte ?</Text>
            <Link
              href={{ pathname: '/login', params: returnTo ? { returnTo } : {} }}
              className="text-sm font-semibold text-primary"
            >
              Se connecter
            </Link>
          </View>

          {/* Même porte de sortie que sur la connexion : quelqu'un qui recule
              devant un formulaire de cinq champs doit pouvoir regarder avant
              de décider, plutôt que de fermer l'application. */}
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
