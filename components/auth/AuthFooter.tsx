import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Pressable,
  Platform,
  Text,
  View,
} from 'react-native';
import { colors } from '@/constants/colors';
import { useAppLanguage } from '@/lib/appLanguage';

const SUPPORT_EMAIL = 'luum221.contact@gmail.com';
const SUPPORT_PHONE = '+221775278980';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function AuthFooter({ light = false }: { light?: boolean }) {
  const { t } = useAppLanguage();
  const [helpVisible, setHelpVisible] = useState(false);
  const [supportError, setSupportError] = useState(false);
  const sheetOffset = useRef(
    new Animated.Value(Platform.OS === 'web' ? 0 : 56),
  ).current;

  useEffect(() => {
    if (!helpVisible) return;

    if (Platform.OS === 'web') {
      sheetOffset.setValue(0);
      return;
    }

    sheetOffset.setValue(56);
    Animated.timing(sheetOffset, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [helpVisible, sheetOffset]);

  const handleSupportLink = async (url: string) => {
    setSupportError(false);
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Unable to open the support link:', error);
      setSupportError(true);
    }
  };

  const dismissHelp = () => {
    if (Platform.OS === 'web') {
      setHelpVisible(false);
      return;
    }

    Animated.timing(sheetOffset, {
      toValue: 56,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setHelpVisible(false);
    });
  };

  return (
    <>
      <View className="w-full flex-row items-center justify-between px-1 py-3">
        <Text
          className={[
            'text-[11px]',
            light ? 'text-white' : 'text-gray-400',
          ].join(' ')}
        >
          v{APP_VERSION}
        </Text>
        <Pressable
          onPress={() => {
            setSupportError(false);
            sheetOffset.setValue(Platform.OS === 'web' ? 0 : 56);
            setHelpVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('Ouvrir les options d’aide', 'Open help options')}
          className="px-1 py-0.5"
        >
          <Text
            className={[
              'text-[11px] underline',
              light ? 'text-white' : 'text-gray-500',
            ].join(' ')}
          >
            {t('Besoin d’aide ?', 'Need help?')}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={helpVisible}
        transparent
        animationType="none"
        onRequestClose={dismissHelp}
      >
        <View className="flex-1 justify-end">
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
          />
          <Pressable
            className="absolute inset-0"
            onPress={dismissHelp}
            accessibilityRole="button"
            accessibilityLabel={t('Fermer', 'Close')}
          />
          <Animated.View
            style={{
              transform: [{ translateY: sheetOffset }],
              alignSelf: 'stretch',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 32,
            }}
          >
            <View
              className={[
                'mb-4 h-1 w-10 self-center rounded-full',
                'bg-gray-300',
              ].join(' ')}
            />
            <View className="mb-4 flex-row items-center justify-between">
              <Text style={{ color: colors.primary }} className="text-lg font-bold">
                {t('Nous contacter', 'Contact us')}
              </Text>
              <Pressable
                onPress={dismissHelp}
                accessibilityRole="button"
                accessibilityLabel={t('Fermer', 'Close')}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.primary} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => void handleSupportLink(`mailto:${SUPPORT_EMAIL}`)}
              accessibilityRole="link"
              accessibilityLabel={t(
                'Envoyer un e-mail au support',
                'Email support',
              )}
              className={[
                'mb-3 flex-row items-center gap-3 rounded-xl border px-4 py-3.5',
                'border-gray-200',
              ].join(' ')}
            >
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <View className="flex-1">
                <Text style={{ color: colors.primary }} className="text-sm font-semibold">
                  Email
                </Text>
                <Text style={{ color: colors.primary }} className="text-xs">
                  {SUPPORT_EMAIL}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => void handleSupportLink(`tel:${SUPPORT_PHONE}`)}
              accessibilityRole="link"
              accessibilityLabel={t('Appeler le support', 'Call support')}
              className={[
                'flex-row items-center gap-3 rounded-xl border px-4 py-3.5',
                'border-gray-200',
              ].join(' ')}
            >
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <View className="flex-1">
                <Text style={{ color: colors.primary }} className="text-sm font-semibold">
                  {t('Téléphone', 'Phone')}
                </Text>
                <Text style={{ color: colors.primary }} className="text-xs">
                  +221 77 527 89 80
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </Pressable>
            {supportError ? (
              <Text
                accessibilityLiveRegion="polite"
                className="mt-3 text-center text-xs text-red-600"
              >
                {t(
                  'Impossible d’ouvrir ce lien. Écrivez-nous à luum221.contact@gmail.com.',
                  'Could not open this link. Email us at luum221.contact@gmail.com.',
                )}
              </Text>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
