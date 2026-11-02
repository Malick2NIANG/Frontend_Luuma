import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { CODE_LENGTH, CodeInput } from '@/components/ui/CodeInput';
import { colors } from '@/constants/colors';
import {
  useRequestAdminCode,
  useVerifyAdminCode,
} from '@/hooks/useAdminAccess';

/**
 * Demande du code d'accès à l'administration.
 *
 * Ce n'est PAS un écran bloquant comme la vérification d'email : on y entre
 * volontairement, et on doit pouvoir faire demi-tour. D'où la flèche de
 * retour plutôt qu'une modale sans issue.
 *
 * Il ne protège rien par lui-même — le serveur refuse les routes
 * d'administration sans élévation, que cet écran existe ou non. Il sert à
 * rendre le refus compréhensible et à donner le moyen de le lever.
 */
export function AdminAccessGate({
  onCancel,
  codePending = false,
  resendInSeconds = 0,
}: {
  onCancel: () => void;
  /** Un code est déjà parti et reste valide — état porté par le serveur. */
  codePending?: boolean;
  resendInSeconds?: number;
}) {
  const request = useRequestAdminCode();
  const verify = useVerifyAdminCode();

  const [code, setCode] = useState('');
  // Le délai vient du serveur : quitter l'écran et revenir ne doit pas
  // remettre le compteur à zéro, sinon le bouton invite à une demande que le
  // serveur refusera en 429.
  const [cooldown, setCooldown] = useState(resendInSeconds);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = () => {
    if (cooldown > 0) return;
    setCode('');
    request.mutate(undefined, { onSuccess: () => setCooldown(60) });
  };

  // Soit on vient d'en demander un, soit le serveur dit qu'il en reste un
  // valide : dans les deux cas c'est la saisie qu'il faut montrer, pas une
  // invitation à en redemander un.
  const sent = request.isSuccess || codePending;
  const error = verify.errorMessage ?? request.errorMessage;

  return (
    <View className="flex-1 bg-white px-5">
      <Pressable
        onPress={onCancel}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Revenir en arrière"
        className="py-4"
      >
        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
      </Pressable>

      <View className="flex-1 justify-center gap-7 pb-16">
        <View className="items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
          </View>
          <Text className="text-center text-[22px] font-bold text-gray-900">
            Espace d'administration
          </Text>
          <Text className="text-center text-[13.5px] leading-5 text-gray-500">
            {sent ? (
              request.data?.sentTo ? (
                <>
                  Saisissez le code envoyé à{'\n'}
                  <Text className="font-semibold text-gray-700">
                    {request.data.sentTo}
                  </Text>
                </>
              ) : (
                // Code encore valide d'une visite précédente : on ne connaît
                // pas l'adresse masquée, elle n'est renvoyée qu'à l'envoi.
                "Saisissez le code reçu par email."
              )
            ) : (
              "Votre mot de passe ne suffit pas ici. Nous allons envoyer un code à l'adresse de votre compte."
            )}
          </Text>
        </View>

        {sent ? (
          <>
            <CodeInput
              value={code}
              onChange={setCode}
              onComplete={(full) =>
                verify.mutate(full, { onError: () => setCode('') })
              }
              error={error ?? undefined}
            />

            <View className="gap-3">
              <Button
                onPress={() =>
                  verify.mutate(code, { onError: () => setCode('') })
                }
                disabled={code.length < CODE_LENGTH}
                loading={verify.isPending}
                fullWidth
              >
                Entrer
              </Button>

              <Pressable
                onPress={send}
                disabled={cooldown > 0 || request.isPending}
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
              Le code expire dans {request.data?.expiresInMinutes ?? 10} minutes.
              Trois essais.
            </Text>
          </>
        ) : (
          <View className="gap-3">
            <Button onPress={send} loading={request.isPending} fullWidth>
              Recevoir un code
            </Button>
            {error ? (
              <Text className="text-center text-sm text-red-500">{error}</Text>
            ) : null}
            {/* Dit à quoi sert cette étape. Un contrôle dont on ne comprend
                pas la raison finit par être vécu comme une tracasserie, et
                contourné dès que c'est possible. */}
            <Text className="text-center text-[11.5px] leading-4 text-gray-400">
              Cette étape protège les dossiers d'identité des commerçants et des
              GP si quelqu'un mettait la main sur votre session.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
