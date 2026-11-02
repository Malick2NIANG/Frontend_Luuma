import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/CodeInput';
import { colors } from '@/constants/colors';
import { useAuth, useLogout } from '@/hooks/useAuth';
import {
  CODE_EXPIRY_MINUTES,
  RESEND_COOLDOWN_SECONDS,
  useSendVerificationCode,
  useVerifyEmail,
} from '@/hooks/useEmailVerification';

/**
 * Vérification de l'adresse email, bloquante, à la première ouverture.
 *
 * Placée AVANT l'acceptation des conditions, et ce n'est pas cosmétique :
 * l'email est le seul moyen de récupérer un compte. S'il comporte une faute de
 * frappe, on enregistrerait une acceptation de CGU sur un compte que personne
 * ne pourra jamais récupérer — ni se reconnecter, ni réinitialiser son mot de
 * passe. Le vérifier d'abord, c'est le vérifier pendant que la personne se
 * souvient encore de ce qu'elle a tapé.
 *
 * Le code part déjà à l'inscription (better-auth, `sendVerificationOnSignUp`).
 * Cet écran ne le redemande donc pas à l'ouverture : il attend la saisie, et
 * ne renvoie qu'à la demande.
 */
export function EmailVerificationGate() {
  const { user } = useAuth();
  const send = useSendVerificationCode();
  const verify = useVerifyEmail();
  const logout = useLogout();

  const [code, setCode] = useState('');
  // Le code a été envoyé à l'inscription : on démarre donc en attente, comme
  // si un envoi venait d'avoir lieu, plutôt que d'inviter à en redemander un
  // immédiatement et à gâcher le quota.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = () => {
    if (code.length < CODE_LENGTH) return;
    verify.mutate(code, { onError: () => setCode('') });
  };

  const resend = () => {
    if (cooldown > 0) return;
    setCode('');
    send.mutate(undefined, {
      onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
    });
  };

  const error = verify.errorMessage ?? send.errorMessage;

  return (
    <Modal visible animationType="fade" onRequestClose={() => undefined}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center gap-7 px-5">
          <View className="items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <Ionicons name="mail-outline" size={26} color={colors.primary} />
            </View>
            <Text className="text-center text-[22px] font-bold text-gray-900">
              Vérifiez votre adresse
            </Text>
            <Text className="text-center text-[13.5px] leading-5 text-gray-500">
              Nous avons envoyé un code à 6 chiffres à{'\n'}
              <Text className="font-semibold text-gray-700">{user?.email}</Text>
            </Text>
          </View>

          <CodeInput
            value={code}
            onChange={setCode}
            onComplete={(full) => verify.mutate(full, { onError: () => setCode('') })}
            error={error ?? undefined}
          />

          <View className="gap-3">
            <Button
              onPress={submit}
              disabled={code.length < CODE_LENGTH}
              loading={verify.isPending}
              fullWidth
            >
              Vérifier
            </Button>

            <Pressable
              onPress={resend}
              disabled={cooldown > 0 || send.isPending}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Renvoyer le code"
              className="self-center py-1"
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

          <Text className="text-center text-[11px] leading-4 text-gray-400">
            Le code est valable {CODE_EXPIRY_MINUTES} minutes. Pensez à
            regarder vos indésirables.
          </Text>

          {/* Porte de sortie. Une adresse mal saisie ne se corrige pas depuis
              ici — il n'existe pas encore d'écran pour changer son email — donc
              la seule issue est de repartir et de recréer un compte. Mieux vaut
              le dire que d'enfermer quelqu'un sur un écran sans solution. */}
          <Pressable
            onPress={() => logout.mutate()}
            disabled={logout.isPending}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
            className="self-center"
          >
            <Text className="text-[12px] text-gray-500">
              Ce n'est pas la bonne adresse ? Se déconnecter
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
