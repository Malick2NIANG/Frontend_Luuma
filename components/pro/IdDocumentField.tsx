import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { useUpload } from '@/hooks/useUpload';
import { useAppLanguage } from '@/lib/appLanguage';

export interface IdDocumentFieldProps {
  /** Clé de stockage une fois l'envoi terminé. Null tant qu'il n'y a rien. */
  value: string | null;
  onChange: (key: string | null) => void;
}

/**
 * Envoi de la pièce d'identité.
 *
 * Le fichier part directement vers le stockage privé et l'API ne reçoit que
 * sa CLÉ — jamais les octets, jamais une URL publique. C'est ce qui garantit
 * qu'un document d'identité ne devienne pas accessible par lien : le bucket
 * `luum-private` ne se lit que par URL signée à durée courte, réservée aux
 * administrateurs qui examinent le dossier.
 */
export function IdDocumentField({ value, onChange }: IdDocumentFieldProps) {
  const { t } = useAppLanguage();
  const { upload, isUploading } = useUpload();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        t(
          "L'accès à vos photos est nécessaire pour envoyer le document.",
          'Photo library access is required to upload the document.',
        ),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // L'aperçu s'affiche avant la fin de l'envoi : sur un réseau sénégalais,
    // une photo de 3 Mo prend plusieurs secondes, et un écran figé sans
    // retour visuel donne l'impression que rien ne se passe.
    setPreview(asset.uri);

    const uploaded = await upload({
      uri: asset.uri,
      category: 'kyc',
      contentType: 'image/jpeg',
    });

    if (!uploaded) {
      setPreview(null);
      setError(
        t(
          "L'envoi du document a échoué. Réessayez.",
          'The document upload failed. Try again.',
        ),
      );
      return;
    }

    onChange(uploaded.key);
  };

  return (
    <View>
      <Text className="mb-1 text-sm font-semibold text-gray-900">
        {t("Pièce d'identité", 'Identity document')}
      </Text>
      <Text className="mb-3 text-xs text-gray-500">
        {t(
          "Carte d'identité ou passeport. Visible uniquement par l'équipe Luuma pendant l'examen de votre dossier.",
          'ID card or passport. Only visible to the Luuma team while reviewing your application.',
        )}
      </Text>

      {value && preview ? (
        <View className="overflow-hidden rounded-xl border border-gray-200">
          <Image
            source={{ uri: preview }}
            contentFit="cover"
            style={{ width: '100%', height: 180 }}
          />
          <View className="flex-row items-center gap-2 border-t border-gray-100 bg-emerald-50 px-3 py-2.5">
            <Ionicons name="checkmark-circle" size={17} color={colors.accent} />
            <Text className="flex-1 text-xs text-emerald-900">
              {t('Document envoyé', 'Document uploaded')}
            </Text>
            <Pressable
              onPress={() => {
                onChange(null);
                setPreview(null);
              }}
            >
              <Text className="text-xs font-semibold text-primary">
                {t('Remplacer', 'Replace')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => void pick()}
          disabled={isUploading}
          accessibilityRole="button"
          accessibilityLabel={t(
            "Ajouter une pièce d'identité",
            'Add an identity document',
          )}
          className="items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-8"
        >
          {isUploading ? (
            <>
              <ActivityIndicator color={colors.primary} />
              <Text className="mt-2 text-xs text-gray-500">
                {t('Envoi en cours…', 'Uploading…')}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="camera-outline" size={26} color="#9CA3AF" />
              <Text className="mt-2 text-sm font-medium text-gray-700">
                {t('Ajouter une photo', 'Add a photo')}
              </Text>
            </>
          )}
        </Pressable>
      )}

      {error ? (
        <Text className="mt-2 text-xs text-red-600">{error}</Text>
      ) : null}
    </View>
  );
}
