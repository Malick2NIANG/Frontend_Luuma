import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { colors } from '@/constants/colors';
import { useLogout } from '@/hooks/useAuth';
import {
  useAcceptTerms,
  useLegalDocument,
  type LegalDocumentId,
} from '@/hooks/useLegal';
import { useMe } from '@/hooks/useMe';
import { useAppLanguage } from '@/lib/appLanguage';

const TABS: { id: LegalDocumentId }[] = [
  { id: 'terms' },
  { id: 'privacy' },
];

/**
 * Rendu minimal du texte : « ## » devient un titre, le reste un paragraphe.
 * Même règle que l'écran de lecture — on maîtrise le format de nos deux
 * documents, un moteur Markdown serait une dépendance pour rien.
 */
function LegalBody({ id }: { id: LegalDocumentId }) {
  const { language, t } = useAppLanguage();
  const { data, isLoading, isError, refetch } = useLegalDocument(id);

  if (isLoading) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="items-center gap-3 py-10">
        <Text className="text-center text-[13px] text-gray-500">
          {t(
            'Impossible de charger le texte. Vérifiez votre connexion.',
            'Unable to load the text. Check your connection.',
          )}
        </Text>
        <Pressable onPress={() => void refetch()} accessibilityRole="button">
          <Text className="text-[13px] font-semibold text-primary">
            {t('Réessayer', 'Try again')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text className="mb-3 text-[11px] text-gray-400">
        {t(
          `Version ${data.version} · mise à jour le`,
          `Version ${data.version} · updated on`,
        )}{' '}
        {new Date(data.updatedAt).toLocaleDateString(
          language === 'fr' ? 'fr-FR' : 'en-US',
        )}
      </Text>

      {data.body.split('\n\n').map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('## ')) {
          return (
            <Text
              key={index}
              className="mb-1.5 mt-4 text-[14px] font-bold text-gray-900"
            >
              {trimmed.slice(3)}
            </Text>
          );
        }

        return (
          <Text key={index} className="mb-2.5 text-[12.5px] leading-5 text-gray-700">
            {trimmed.replace(/\n/g, ' ')}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Écran d'acceptation des conditions, bloquant.
 *
 * S'affiche à la première ouverture d'un compte, et de nouveau à chaque
 * changement de version — c'est `legal.needsAcceptance`, calculé par le
 * serveur, qui le déclenche. Sans cet écran, ce signal ne servait à rien : on
 * savait qu'il fallait refaire accepter, sans jamais le demander.
 *
 * Le texte est AFFICHÉ ici et non derrière un lien. Un lien ferait sortir de
 * l'écran bloquant, et surtout une case cochée à côté d'un lien qu'on n'ouvre
 * jamais ne vaut pas un consentement éclairé.
 *
 * `onRequestClose` est volontairement inerte : le bouton retour d'Android ne
 * doit pas permettre de passer outre.
 */
export function TermsGate() {
  const { language, t } = useAppLanguage();
  const { me } = useMe();
  const accept = useAcceptTerms();
  const logout = useLogout();

  const [tab, setTab] = useState<LegalDocumentId>('terms');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Décochée par défaut, et elle doit le rester : un accord commercial
  // pré-coché n'est pas un accord. Elle est aussi dégroupée de l'acceptation
  // des conditions — les lier rendrait le consentement marketing obligatoire,
  // donc nul.
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);

  const version = me?.legal.currentVersion;
  const isUpdate = me?.legal.acceptedVersion !== null;

  return (
    <Modal visible animationType="fade" onRequestClose={() => undefined}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="border-b border-gray-100 px-4 pb-3 pt-2">
          <Text className="text-[20px] font-bold text-gray-900">
            {isUpdate
              ? t('Nos conditions ont changé', 'Our terms have changed')
              : t('Avant de commencer', 'Before you begin')}
          </Text>
          <Text className="mt-1 text-[13px] leading-5 text-gray-500">
            {isUpdate
              ? t(
                  'Merci de relire et d’accepter la nouvelle version pour continuer à utiliser Luuma.',
                  'Please review and accept the new version to continue using Luuma.',
                )
              : t(
                  'Prenez un instant pour lire nos conditions et notre politique de confidentialité.',
                  'Please take a moment to read our terms and privacy policy.',
                )}
          </Text>

          <View className="mt-3.5 flex-row gap-2">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setTab(item.id)}
                  className={[
                    'rounded-full px-3 py-1.5',
                    active ? 'bg-gray-900' : 'bg-gray-100',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-[12px] font-semibold',
                      active ? 'text-white' : 'text-gray-600',
                    ].join(' ')}
                  >
                    {item.id === 'terms'
                      ? t('Conditions générales', 'Terms of service')
                      : t('Confidentialité', 'Privacy')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          <LegalBody id={tab} />
        </ScrollView>

        <View className="gap-3 border-t border-gray-100 px-4 pb-2 pt-3.5">
          <Checkbox
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
            accessibilityLabel={t(
              "J'accepte les conditions générales et la politique de confidentialité",
              'I accept the terms of service and privacy policy',
            )}
          >
            <Text className="text-[13px] leading-5 text-gray-700">
              {t(
                "J'ai lu et j'accepte les conditions générales et la politique de confidentialité de Luuma.",
                'I have read and accept Luuma’s terms of service and privacy policy.',
              )}
            </Text>
          </Checkbox>

          <Checkbox
            checked={acceptedMarketing}
            onChange={setAcceptedMarketing}
            accessibilityLabel={t(
              'Recevoir les nouveautés et offres de Luuma',
              'Receive Luuma updates and offers',
            )}
          >
            <Text className="text-[13px] leading-5 text-gray-600">
              {t(
                'Je souhaite recevoir les nouveautés et bons plans de Luuma.',
                'I would like to receive Luuma updates and special offers.',
              )}
              <Text className="text-gray-400">
                {t(' (facultatif)', ' (optional)')}
              </Text>
            </Text>
          </Checkbox>

          {accept.isError ? (
            <Text className="text-center text-[12.5px] text-red-500">
              {t(
                "L'enregistrement a échoué. Vérifiez votre connexion puis réessayez.",
                'Saving failed. Check your connection and try again.',
              )}
            </Text>
          ) : null}

          <Button
            onPress={() => {
              if (!version) return;
              accept.mutate({ version, marketingConsent: acceptedMarketing });
            }}
            disabled={!acceptedTerms || !version}
            loading={accept.isPending}
            fullWidth
          >
            {t('Continuer', 'Continue')}
          </Button>

          {/* Porte de sortie. Un écran qu'on ne peut ni accepter ni quitter
              enferme dans un compte inutilisable : refuser doit rester
              possible, quitte à se déconnecter. */}
          <Pressable
            onPress={() => logout.mutate()}
            disabled={logout.isPending}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t(
              'Refuser et se déconnecter',
              'Decline and log out',
            )}
            className="self-center py-1"
          >
            <Text className="text-[12px] text-gray-500">
              {t('Refuser et se déconnecter', 'Decline and log out')}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
