import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { HelpSheet } from '@/components/HelpSheet';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useFollowing, useToggleFollow } from '@/hooks/useFollow';
import { useMe } from '@/hooks/useMe';
import { useSearchMerchants } from '@/hooks/useSearch';
import { useAppLanguage } from '@/lib/appLanguage';

/** Nombre de boutiques proposées : assez pour choisir, sans faire défiler. */
const NB_SUGGESTIONS = 5;

/**
 * Colonne de droite du fil, sur grand écran — le modèle d'Instagram :
 * le compte en haut, des suggestions, puis le pied de page.
 *
 * Elle n'existe que là : sur téléphone et tablette, ces mêmes accès sont
 * dans le profil et les paramètres. Rien d'indispensable ne vit donc ici.
 */
export function FeedAside() {
  const [aideOuverte, setAideOuverte] = useState(false);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-8 pt-6"
    >
      <Compte />
      <BoutiquesSuggerees />
      <PiedDePage onAide={() => setAideOuverte(true)} />
      <HelpSheet visible={aideOuverte} onClose={() => setAideOuverte(false)} />
    </ScrollView>
  );
}

function Compte() {
  const { t } = useAppLanguage();
  const { isAuthenticated } = useAuth();
  const { me } = useMe();

  if (!isAuthenticated) {
    return (
      <View className="mb-7 rounded-2xl bg-gray-50 p-4">
        <Text className="text-[15px] font-bold text-gray-900">
          {t('Bienvenue sur Luuma', 'Welcome to Luuma')}
        </Text>
        <Text className="mt-1 text-[13px] leading-5 text-gray-500">
          {t(
            'Connectez-vous pour suivre des boutiques, enregistrer vos favoris et commander.',
            'Sign in to follow shops, save favorites and order.',
          )}
        </Text>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
          className="mt-3 h-10 items-center justify-center rounded-xl bg-primary active:opacity-80"
        >
          <Text className="text-sm font-semibold text-white">
            {t('Se connecter', 'Sign in')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="mb-7 flex-row items-center gap-3">
      <Pressable
        onPress={() => router.push('/(app)/(tabs)/profile')}
        accessibilityRole="link"
        className="flex-1 flex-row items-center gap-3"
      >
        <Avatar uri={me?.avatar} name={me?.name} size={48} />
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[14px] font-semibold text-gray-900">
            {me?.name ?? ' '}
          </Text>
          <Text numberOfLines={1} className="text-[13px] text-gray-500">
            {me?.merchant?.shopName ?? me?.email ?? ' '}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={() => router.push('/(app)/settings')} accessibilityRole="link">
        <Text className="text-xs font-semibold text-primary">
          {t('Paramètres', 'Settings')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Boutiques à découvrir : celles que la personne ne suit pas encore, et pas
 * la sienne. Le tri est celui de la recherche (pertinence, puis note).
 */
function BoutiquesSuggerees() {
  const { t } = useAppLanguage();
  const { isAuthenticated } = useAuth();
  const { me } = useMe();
  const { data: boutiques } = useSearchMerchants('');
  const { data: suivis } = useFollowing(isAuthenticated);
  const { toggle } = useToggleFollow();

  const dejaSuivies = new Set(suivis?.merchants.map((m) => m.id) ?? []);
  const suggestions = (boutiques ?? [])
    .filter((b) => !dejaSuivies.has(b.id) && b.id !== me?.merchant?.id)
    .slice(0, NB_SUGGESTIONS);

  if (suggestions.length === 0) return null;

  return (
    <View className="mb-7">
      <View className="mb-3 flex-row items-center">
        <Text className="text-[14px] font-semibold text-gray-500">
          {t('Boutiques à découvrir', 'Shops to discover')}
        </Text>
        <Pressable
          className="ml-auto"
          accessibilityRole="link"
          onPress={() =>
            router.push({ pathname: '/(app)/(tabs)/search', params: { segment: 'merchants' } })
          }
        >
          <Text className="text-xs font-semibold text-gray-900">
            {t('Voir tout', 'See all')}
          </Text>
        </Pressable>
      </View>

      <View className="gap-3.5">
        {suggestions.map((b) => (
          <View key={b.id} className="flex-row items-center gap-3">
            <Pressable
              onPress={() => router.push(`/(app)/merchants/${b.id}`)}
              accessibilityRole="link"
              className="flex-1 flex-row items-center gap-3"
            >
              <Avatar uri={b.user.avatar} name={b.shopName} size={40} />
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[14px] font-semibold text-gray-900">
                  {b.shopName}
                </Text>
                <Text numberOfLines={1} className="text-xs text-gray-500">
                  {b.city}
                  {b._count.products > 0
                    ? ` · ${t(
                        `${b._count.products} produit${b._count.products > 1 ? 's' : ''}`,
                        `${b._count.products} product${b._count.products === 1 ? '' : 's'}`,
                      )}`
                    : ''}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() =>
                toggle({ target: 'merchant', targetId: b.id, isFollowing: false })
              }
              accessibilityRole="button"
              accessibilityLabel={t(`Suivre ${b.shopName}`, `Follow ${b.shopName}`)}
            >
              <Text className="text-xs font-semibold text-primary">
                {t('Suivre', 'Follow')}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

function PiedDePage({ onAide }: { onAide: () => void }) {
  const { t } = useAppLanguage();

  const liens: { label: string; onPress: () => void }[] = [
    { label: t('Aide', 'Help'), onPress: onAide },
    { label: t('Conditions', 'Terms'), onPress: () => router.push('/legal/terms') },
    {
      label: t('Confidentialité', 'Privacy'),
      onPress: () => router.push('/legal/privacy'),
    },
    {
      label: t('Pays et devise', 'Country & currency'),
      onPress: () => router.push('/onboarding?modifier=1'),
    },
    { label: t('Paramètres', 'Settings'), onPress: () => router.push('/(app)/settings') },
  ];

  return (
    <View>
      <View className="flex-row flex-wrap">
        {liens.map((lien, i) => (
          <View key={lien.label} className="flex-row">
            {i > 0 ? <Text className="text-[11px] text-gray-400"> · </Text> : null}
            <Pressable onPress={lien.onPress} accessibilityRole="link">
              <Text className="text-[11px] text-gray-400 hover:underline">{lien.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text className="mt-4 text-[11px] uppercase tracking-wide text-gray-400">
        © {new Date().getFullYear()} Luuma
      </Text>
    </View>
  );
}
