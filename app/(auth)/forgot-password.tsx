import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/CodeInput';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { colors } from '@/constants/colors';
import { useGoBack } from '@/hooks/useGoBack';
import {
  CODE_EXPIRY_MINUTES,
  RESEND_COOLDOWN_SECONDS,
  useRequestResetCode,
  useResetPassword,
} from '@/hooks/usePasswordReset';
import { isValidEmail, PASSWORD_MIN_LENGTH } from '@/lib/validators';

type Step = 'identify' | 'code' | 'password';

/**
 * Récupération de mot de passe, en trois étapes sur un seul écran.
 *
 * Un écran et non trois : l'adresse saisie à la première étape est nécessaire
 * aux deux suivantes, et la faire voyager en paramètre d'URL l'exposerait dans
 * l'historique de navigation. Ici elle ne quitte jamais l'état du composant.
 *
 * Le canal est l'email uniquement pour l'instant. Le SMS et WhatsApp passeront
 * par Twilio : l'aiguillage existe déjà côté serveur dans `OtpDeliveryService`,
 * il ne manque que le fournisseur. Le choix du canal apparaîtra ici le jour où
 * le serveur le déclarera disponible — pas avant, pour ne pas proposer une
 * option qui ne mène à rien.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('identify');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const request = useRequestResetCode();
  const reset = useResetPassword();

  // Compte à rebours du bouton « Renvoyer ». Purement indicatif : la vraie
  // limite est appliquée par le serveur, celle-ci évite seulement de faire
  // appuyer sur un bouton qui sera refusé.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = () => {
    if (!email.trim() || !isValidEmail(email)) {
      setError('Adresse email invalide.');
      return;
    }
    setError(null);

    request.mutate(email, {
      onSuccess: () => {
        setStep('code');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      },
    });
  };

  const resend = () => {
    if (cooldown > 0) return;
    setCode('');
    setError(null);
    request.mutate(email, { onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS) });
  };

  const submitPassword = () => {
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setError(null);

    reset.mutate(
      { email, otp: code, password },
      {
        onSuccess: () => router.replace('/(app)/(tabs)'),
        onError: () => {
          // Un code refusé ne se corrige pas depuis l'écran du mot de passe :
          // on renvoie à la saisie du code, vidée, plutôt que de laisser
          // réappuyer sur un bouton qui échouera pareil.
          if (reset.errorMessage?.includes('Code')) {
            setCode('');
            setStep('code');
          }
        },
      },
    );
  };

  // La flèche recule d'abord DANS le parcours — trois étapes sur un écran, le
  // retour doit donc défaire une étape avant de quitter l'écran.
  const leaveScreen = useGoBack('/login');

  const goBack = () => {
    setError(null);
    if (step === 'password') return setStep('code');
    if (step === 'code') return setStep('identify');
    leaveScreen();
  };

  const displayedError = error ?? request.errorMessage ?? reset.errorMessage;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          className="self-start py-1"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View className="flex-1 justify-center gap-6">
          {step === 'identify' ? (
            <>
              <View className="gap-1.5">
                <Text className="text-2xl font-bold text-gray-900">
                  Mot de passe oublié
                </Text>
                <Text className="text-sm leading-5 text-gray-500">
                  Indiquez l'adresse de votre compte. Nous vous enverrons un
                  code à 6 chiffres pour en choisir un nouveau.
                </Text>
              </View>

              <Input
                label="Email"
                placeholder="vous@exemple.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Button onPress={sendCode} loading={request.isPending} fullWidth>
                Envoyer le code
              </Button>
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <View className="gap-1.5">
                <Text className="text-2xl font-bold text-gray-900">
                  Entrez le code
                </Text>
                {/* Formulation neutre : « si un compte existe ». Confirmer que
                    l'adresse est inscrite ferait de cet écran un annuaire. */}
                <Text className="text-sm leading-5 text-gray-500">
                  Si un compte existe avec {email.trim()}, un code à 6 chiffres
                  vient d'être envoyé. Il est valable {CODE_EXPIRY_MINUTES}{' '}
                  minutes.
                </Text>
              </View>

              <CodeInput
                value={code}
                onChange={setCode}
                onComplete={() => setStep('password')}
              />

              <View className="gap-3">
                <Button
                  onPress={() => setStep('password')}
                  disabled={code.length < CODE_LENGTH}
                  fullWidth
                >
                  Continuer
                </Button>

                <Pressable
                  onPress={resend}
                  disabled={cooldown > 0 || request.isPending}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Renvoyer le code"
                  className="self-center"
                >
                  <Text
                    className={[
                      'text-[12.5px] font-semibold',
                      cooldown > 0 ? 'text-gray-400' : 'text-primary',
                    ].join(' ')}
                  >
                    {cooldown > 0
                      ? `Renvoyer le code dans ${cooldown} s`
                      : 'Renvoyer le code'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 'password' ? (
            <>
              <View className="gap-1.5">
                <Text className="text-2xl font-bold text-gray-900">
                  Nouveau mot de passe
                </Text>
                <Text className="text-sm leading-5 text-gray-500">
                  Choisissez un mot de passe d'au moins {PASSWORD_MIN_LENGTH}{' '}
                  caractères. Vous serez connecté aussitôt.
                </Text>
              </View>

              <View className="gap-4">
                <Input
                  label="Mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password-new"
                  value={password}
                  onChangeText={setPassword}
                />
                <Input
                  label="Confirmer le mot de passe"
                  placeholder="••••••••"
                  secureTextEntry
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <Button
                onPress={submitPassword}
                loading={reset.isPending}
                fullWidth
              >
                Valider et se connecter
              </Button>
            </>
          ) : null}

          {displayedError ? (
            <Text className="text-center text-[12.5px] text-red-500">
              {displayedError}
            </Text>
          ) : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
