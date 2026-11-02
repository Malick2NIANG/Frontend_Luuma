import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors } from '@/constants/colors';
import { useGoBack } from '@/hooks/useGoBack';
import { useLegalDocument, type LegalDocumentId } from '@/hooks/useLegal';

/**
 * Lecture d'un document légal.
 *
 * Vit à la RACINE, hors des groupes `(app)` et `(auth)`, et c'est structurel :
 * ces textes doivent être lisibles sans compte — l'inscription demande de les
 * accepter, une case renvoyant vers un mur de connexion ne vaudrait rien.
 *
 * Les sortir de `(app)` permet à ce groupe de porter UNE garde de session
 * unique et sans exception. Tant qu'ils vivaient dedans, la garde devait être
 * posée plus bas, sur les onglets, ce qui laissait plusieurs mécanismes
 * réagir en même temps à une perte de session.
 */
export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{ document: string }>();
  const goBack = useGoBack('/(app)/settings');

  const { data, isLoading, isError, refetch } = useLegalDocument(
    document as LegalDocumentId,
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 border-b border-gray-100 px-3.5 pb-2.5 pt-1">
        <Pressable
          onPress={goBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} className="flex-1 text-lg font-bold text-gray-900">
          {data?.title ?? 'Document'}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError || !data ? (
        <EmptyState
          icon="document-text-outline"
          title="Document indisponible"
          description="Impossible de charger ce document. Vérifiez votre connexion."
          actionLabel="Réessayer"
          onAction={() => void refetch()}
        />
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-10 pt-4">
          <Text className="mb-4 text-[11px] text-gray-400">
            Version {data.version} · mise à jour le{' '}
            {new Date(data.updatedAt).toLocaleDateString('fr-FR')}
          </Text>

          {/* Rendu minimal : les lignes commençant par « ## » deviennent des
              titres, le reste est un paragraphe. Un vrai moteur Markdown
              serait une dépendance de plus pour deux documents dont on
              maîtrise le format. */}
          {data.body.split('\n\n').map((block, index) => {
            const trimmed = block.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('## ')) {
              return (
                <Text
                  key={index}
                  className="mb-2 mt-5 text-[15px] font-bold text-gray-900"
                >
                  {trimmed.slice(3)}
                </Text>
              );
            }

            return (
              <Text
                key={index}
                className="mb-3 text-[13px] leading-6 text-gray-700"
              >
                {/* Les retours à la ligne internes viennent du formatage du
                    fichier source, pas du texte : on les remplace par des
                    espaces pour laisser le paragraphe se recomposer. */}
                {trimmed.replace(/\n/g, ' ')}
              </Text>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
