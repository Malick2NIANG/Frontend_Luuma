import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import {
  CONTACT_EMAIL,
  CONTACT_TELEPHONE,
  CONTACT_TELEPHONE_AFFICHE,
} from '@/constants/contact';
import { useAppLanguage } from '@/lib/appLanguage';

export interface HelpSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * « Contactez-nous » : deux lignes, l'e-mail et le téléphone.
 *
 * Chaque ligne ouvre directement l'application qui convient (messagerie,
 * composeur) : recopier une adresse à la main depuis un écran de réglages est
 * exactement le genre d'effort qui fait renoncer à demander de l'aide.
 */
export function HelpSheet({ visible, onClose }: HelpSheetProps) {
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();

  const ouvrir = (url: string) => {
    onClose();
    void Linking.openURL(url);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/35">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('Fermer', 'Close')}
        />
        <View
          className="w-full max-w-2xl self-center rounded-t-3xl bg-white px-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="items-center pt-2.5">
            <View className="h-1 w-10 rounded-full bg-gray-200" />
          </View>

          <View className="flex-row items-center pb-1 pt-4">
            <Text className="text-lg font-bold text-gray-900">
              {t('Contactez-nous', 'Contact us')}
            </Text>
            <Pressable
              className="ml-auto h-9 w-9 items-center justify-center rounded-full bg-gray-100"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('Fermer', 'Close')}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>
          <Text className="pb-4 text-sm leading-5 text-gray-500">
            {t(
              "Une question, un souci avec une commande ? L'équipe Luuma vous répond.",
              'A question, an issue with an order? The Luuma team will get back to you.',
            )}
          </Text>

          <View className="gap-3">
            {CONTACT_EMAIL ? (
              <LigneContact
                icone="mail-outline"
                titre={t('Par e-mail', 'By email')}
                valeur={CONTACT_EMAIL}
                onPress={() => ouvrir(`mailto:${CONTACT_EMAIL}`)}
              />
            ) : null}
            {CONTACT_TELEPHONE ? (
              <LigneContact
                icone="call-outline"
                titre={t('Par téléphone', 'By phone')}
                valeur={CONTACT_TELEPHONE_AFFICHE || CONTACT_TELEPHONE}
                onPress={() => ouvrir(`tel:${CONTACT_TELEPHONE}`)}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LigneContact({
  icone,
  titre,
  valeur,
  onPress,
}: {
  icone: React.ComponentProps<typeof Ionicons>['name'];
  titre: string;
  valeur: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${titre} : ${valeur}`}
      className="min-h-[68px] flex-row items-center rounded-2xl border border-gray-100 bg-[#F7FAF8] px-4 py-3 active:border-primary active:bg-primary/10"
    >
      <View className="h-11 w-11 items-center justify-center rounded-full border border-gray-100 bg-white">
        <Ionicons name={icone} size={20} color={colors.primary} />
      </View>
      <View className="ml-3.5 flex-1">
        <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {titre}
        </Text>
        <Text className="mt-0.5 text-base font-semibold text-gray-900">{valeur}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color="#9CA3AF" />
    </Pressable>
  );
}
