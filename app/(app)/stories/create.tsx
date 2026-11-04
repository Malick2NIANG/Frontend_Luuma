import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { api } from '@/lib/api';
import { useMe } from '@/hooks/useMe';
import { useUpload } from '@/hooks/useUpload';
import type { RoleType, StoryMediaType } from '@/types/api.types';
import { useAppLanguage } from '@/lib/appLanguage';

/** Fonds proposés pour une story texte — la palette de la marque. */
const BACKGROUNDS = [
  colors.primary,
  colors.accent,
  '#1A1A1A',
  '#B45309',
  '#7C3AED',
  '#DC2626',
];

const MAX_TEXT = 280;

export default function CreateStoryScreen() {
  const { t } = useAppLanguage();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)');
  const queryClient = useQueryClient();

  const { me, can, isLoading: rolesLoading } = useMe();
  const { upload, isUploading } = useUpload();

  const [mode, setMode] = useState<'TEXT' | 'IMAGE'>('TEXT');
  const [text, setText] = useState('');
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Déclaré ici, avant tout retour anticipé : un `useState` placé après une
  // condition changerait le nombre de hooks selon le rendu, ce que React
  // interdit. `null` signifie « pas encore choisi », d'où la valeur par
  // défaut calculée plus bas une fois les profils connus.
  const [role, setRole] = useState<RoleType | null>(null);

  const publish = useMutation({
    mutationFn: async (payload: {
      authorRole: RoleType;
      mediaType: StoryMediaType;
      text?: string;
      background?: string;
      mediaKey?: string;
    }) => {
      const { data } = await api.post('/api/stories', payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stories'] });
      goBack();
    },
    onError: () => setError(t("La publication a échoué. Réessayez.", 'Publishing failed. Please try again.')),
  });

  if (rolesLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Une story engage un compte professionnel : c'est une vitrine, pas une
  // publication personnelle. Un client n'en publie pas — mieux vaut le dire
  // franchement que de laisser le serveur renvoyer un refus opaque.
  if (!can.publishStory) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Header onClose={goBack} />
        <EmptyState
          icon="storefront-outline"
          title={t('Réservé aux boutiques et aux GP', 'For shops and personal shoppers only')}
          description={t(
            'Les stories servent à annoncer une arrivée de stock ou un départ. Ouvrez une boutique ou devenez GP pour en publier.',
            'Stories are for announcing new stock or an upcoming trip. Open a shop or become a personal shopper to publish one.',
          )}
          actionLabel={t('Voir mon profil', 'View my profile')}
          onAction={() => router.replace('/(app)/(tabs)/profile')}
        />
      </SafeAreaView>
    );
  }

  // Quand le compte porte les deux casquettes, il faut choisir sous laquelle
  // publier : l'anneau du bandeau affiche un badge différent selon le cas.
  const canChooseRole =
    me?.merchant?.state === 'approved' && me?.gp?.state === 'approved';
  const activeRole: RoleType =
    role ?? (me?.merchant?.state === 'approved' ? 'MERCHANT' : 'GP');

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t("L'accès à vos photos est nécessaire pour publier une image.", 'Photo library access is required to publish an image.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setMode('IMAGE');
      setError(null);
    }
  };

  const handlePublish = async () => {
    setError(null);

    if (mode === 'TEXT') {
      if (!text.trim()) {
        setError(t('Écrivez quelque chose avant de publier.', 'Write something before publishing.'));
        return;
      }
      publish.mutate({
        authorRole: activeRole,
        mediaType: 'TEXT',
        text: text.trim(),
        background,
      });
      return;
    }

    if (!imageUri) {
      setError(t('Choisissez une image.', 'Choose an image.'));
      return;
    }

    const uploaded = await upload({
      uri: imageUri,
      category: 'story',
      contentType: 'image/jpeg',
    });

    if (!uploaded) {
      setError(t("L'envoi de l'image a échoué.", 'Image upload failed.'));
      return;
    }

    publish.mutate({
      authorRole: activeRole,
      mediaType: 'IMAGE',
      mediaKey: uploaded.key,
      // Le texte devient une légende par-dessus l'image.
      ...(text.trim() ? { text: text.trim() } : {}),
    });
  };

  const busy = isUploading || publish.isPending;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <Header onClose={goBack} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="pb-6">
          {canChooseRole && (
            <View className="flex-row gap-2 px-4 pb-1 pt-3">
              <RolePill
                label={t('Ma boutique', 'My shop')}
                active={activeRole === 'MERCHANT'}
                onPress={() => setRole('MERCHANT')}
              />
              <RolePill
                label={t('Mon profil GP', 'My personal shopper profile')}
                active={activeRole === 'GP'}
                onPress={() => setRole('GP')}
              />
            </View>
          )}

          <View className="px-4 pt-3">
            {mode === 'IMAGE' && imageUri ? (
              <Pressable onPress={pickImage}>
                <Image
                  source={{ uri: imageUri }}
                  contentFit="cover"
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 16 }}
                />
              </Pressable>
            ) : (
              <View
                className="items-center justify-center rounded-2xl px-6"
                style={{ backgroundColor: background, aspectRatio: 3 / 4 }}
              >
                <TextInput
                  value={text}
                  onChangeText={(value) => setText(value.slice(0, MAX_TEXT))}
                  placeholder={t('Écrivez votre annonce…', 'Write your story…')}
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  multiline
                  textAlign="center"
                  className="w-full text-xl font-bold text-white"
                  style={{ lineHeight: 30 }}
                />
              </View>
            )}
          </View>

          {mode === 'TEXT' ? (
            <View className="flex-row flex-wrap gap-2.5 px-4 pt-4">
              {BACKGROUNDS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setBackground(color)}
                  style={{ backgroundColor: color }}
                  className={[
                    'h-9 w-9 rounded-full',
                    background === color ? 'border-2 border-gray-900' : '',
                  ].join(' ')}
                />
              ))}
            </View>
          ) : (
            <View className="px-4 pt-4">
              <TextInput
                value={text}
                onChangeText={(value) => setText(value.slice(0, MAX_TEXT))}
                placeholder={t('Légende (facultatif)', 'Caption (optional)')}
                placeholderTextColor="#9CA3AF"
                className="rounded-xl bg-gray-100 px-3 py-3 text-base text-gray-900"
              />
            </View>
          )}

          <View className="flex-row gap-2 px-4 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => {
                setMode('TEXT');
                setImageUri(null);
              }}
            >
              {t('Texte', 'Text')}
            </Button>
            <Button variant="secondary" className="flex-1" onPress={pickImage}>
              {t('Photo', 'Photo')}
            </Button>
          </View>

          {error ? (
            <Text className="px-4 pt-3 text-sm text-red-600">{error}</Text>
          ) : null}
        </ScrollView>

        <View className="border-t border-gray-100 px-4 pt-3">
          <Button fullWidth disabled={busy} onPress={() => void handlePublish()}>
            {busy ? t('Publication…', 'Publishing…') : t('Publier ma story', 'Publish my story')}
          </Button>
          <Text className="mt-2 text-center text-[11px] text-gray-500">
            {t(
              'Visible 24 heures par vos abonnés et vos clients en cours de commande.',
              'Visible for 24 hours to your followers and customers with ongoing orders.',
            )}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  const { t } = useAppLanguage();
  return (
    <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
      <Text className="text-base font-bold text-gray-900">{t('Nouvelle story', 'New story')}</Text>
      <Pressable onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

function RolePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={[
        'rounded-full border px-3.5 py-1.5',
        active ? 'border-primary bg-primary' : 'border-gray-200 bg-white',
      ].join(' ')}
    >
      <Text
        className={[
          'text-sm font-medium',
          active ? 'text-white' : 'text-gray-700',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}
