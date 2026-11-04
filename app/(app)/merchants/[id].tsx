import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGoBack } from '@/hooks/useGoBack';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExpandableText } from '@/components/ui/ExpandableText';
import { RoleMark } from '@/components/ui/RoleMark';
import { Skeleton, SkeletonCircle } from '@/components/ui/Skeleton';
import { colors } from '@/constants/colors';
import { useMerchant } from '@/hooks/useCatalog';
import { useOpenDirectChat } from '@/hooks/useDirectChat';
import { useToggleFollow } from '@/hooks/useFollow';
import { formatDate, formatXof } from '@/lib/format';
import { useAppLanguage } from '@/lib/appLanguage';

type Tab = 'products' | 'reviews' | 'about';

/** Écart entre les vignettes de la grille, en points. */
const GRID_GAP = 2;

/**
 * Page publique d'une boutique.
 *
 * Disposition de profil social — avatar, statistiques, bio, actions, onglets,
 * grille — et non liste de produits. La différence n'est pas décorative : sur
 * Luuma on achète à quelqu'un, pas à un catalogue. La grille montre l'étendue
 * de l'offre d'un coup d'œil, là où une liste verticale n'en laisse voir que
 * trois articles.
 */
export default function MerchantScreen() {
  const { t } = useAppLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goBack = useGoBack('/(app)/(tabs)/search');

  const { data: merchant, isLoading, isError, refetch } = useMerchant(id);
  const { toggle } = useToggleFollow();
  const { open: openChat } = useOpenDirectChat();

  const [tab, setTab] = useState<Tab>('products');


  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <MerchantSkeleton />
      </SafeAreaView>
    );
  }

  if (isError || !merchant) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <Header title={t('Boutique', 'Shop')} onBack={goBack} />
        <EmptyState
          icon="storefront-outline"
          title={t('Boutique introuvable', 'Shop not found')}
          description={t("Cette boutique n'existe plus ou n'est pas encore validée.", 'This shop no longer exists or has not been approved yet.')}
          actionLabel={t('Réessayer', 'Try again')}
          onAction={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const products = merchant.products;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <Header
        title={merchant.shopName}
        onBack={goBack}
        onShare={() => {
          // `Share` est natif à React Native : aucune dépendance, et l'échec
          // est absorbé — sur le navigateur de développement, il n'existe pas.
          void Share.share({
            message: t(
              `${merchant.shopName} sur Luuma — ${merchant.city}, ${merchant.country}`,
              `${merchant.shopName} on Luuma — ${merchant.city}, ${merchant.country}`,
            ),
          }).catch(() => undefined);
        }}
      />

      <ScrollView contentContainerClassName="pb-8">
        {/* Bloc d'identité CENTRÉ, conforme à la maquette 11. J'étais passé
            à la disposition d'Instagram — avatar à gauche, statistiques à sa
            droite — c'était une sur-interprétation : la référence validée est
            la maquette. */}
        <View className="items-center px-4 pb-3 pt-4">
          {/* Anneau autour de l'avatar, comme sur la maquette. Teinte pleine
              plutôt que dégradé : le dégradé demanderait une dépendance de
              plus pour un liseré de deux points. */}
          <View
            className="rounded-full p-[3px]"
            style={{ backgroundColor: colors.accent }}
          >
            <View className="rounded-full border-[3px] border-white">
              <Avatar
                uri={merchant.user.avatar}
                name={merchant.shopName}
                size={82}
              />
            </View>
          </View>

          <View className="mt-2.5 flex-row items-center gap-1.5">
            <Text className="text-base font-bold text-gray-900">
              {merchant.shopName}
            </Text>
            <RoleMark type="merchant" size={13} />
          </View>

          <View className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text className="text-[11px] text-gray-500">
              {merchant.city}, {merchant.country}
            </Text>
          </View>

          <View className="mt-3.5 flex-row justify-center gap-9">
            <Stat value={String(products.length)} label={t('produits', 'products')} />
            <Stat value={String(merchant.followersCount)} label={t('abonnés', 'followers')} />
            <Stat
              // Une note de 0 sur 0 avis ne veut rien dire : afficher « 0,0 »
              // punirait une boutique neuve pour n'avoir pas encore vendu —
              // et au lancement, elles le sont toutes.
              value={
                merchant.totalReviews > 0
                  ? merchant.rating.toFixed(1).replace('.', ',')
                  : '—'
              }
              label={
                merchant.totalReviews > 0
                  ? t(`★ ${merchant.totalReviews} avis`, `★ ${merchant.totalReviews} reviews`)
                  : t('aucun avis', 'no reviews')
              }
            />
          </View>

          {/* La bio revient à gauche : un paragraphe centré se lit mal dès
              qu'il dépasse une ligne. C'est aussi ce que fait la maquette. */}
          {merchant.description ? (
            <View className="mt-3.5 self-stretch">
              <ExpandableText
                text={merchant.description}
                lines={3}
                className="text-[11.5px] leading-5 text-gray-700"
              />
            </View>
          ) : null}

          <View className="mt-3.5 flex-row gap-2 self-stretch">
            <Pressable
              onPress={() =>
                toggle({
                  target: 'merchant',
                  targetId: merchant.id,
                  isFollowing: merchant.isFollowedByMe,
                })
              }
              accessibilityRole="button"
              accessibilityState={{ selected: merchant.isFollowedByMe }}
              className={[
                'flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5',
                merchant.isFollowedByMe
                  ? 'border border-gray-200 bg-white'
                  : 'bg-primary',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-[13px] font-bold',
                  merchant.isFollowedByMe ? 'text-gray-600' : 'text-white',
                ].join(' ')}
              >
                {merchant.isFollowedByMe ? t('Abonné', 'Following') : t("S'abonner", 'Follow')}
              </Text>
              <Ionicons
                name="notifications"
                size={12}
                color={merchant.isFollowedByMe ? '#6B7280' : colors.white}
              />
            </Pressable>

            <Pressable
              onPress={() =>
                openChat(merchant.user.id, `/(app)/merchants/${merchant.id}`)
              }
              accessibilityRole="button"
              className="flex-1 items-center rounded-lg border border-primary bg-white py-2.5"
            >
              <Text className="text-[13px] font-bold text-primary">{t('Message', 'Message')}</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row border-b border-gray-100">
          <TabButton
            icon="grid-outline"
            label={t('Produits', 'Products')}
            active={tab === 'products'}
            onPress={() => setTab('products')}
          />
          <TabButton
            icon="star-outline"
            label={t('Avis', 'Reviews')}
            active={tab === 'reviews'}
            onPress={() => setTab('reviews')}
          />
          <TabButton
            icon="information-circle-outline"
            label={t('Infos', 'About')}
            active={tab === 'about'}
            onPress={() => setTab('about')}
          />
        </View>

        {tab === 'products' ? (
          products.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title={t('Aucun produit', 'No products yet')}
              description={t("Cette boutique n'a rien mis en ligne pour l'instant.", 'This shop has not listed anything yet.')}
            />
          ) : (
            // Largeur en POURCENTAGE et non en points calculés : mesurer la
            // fenêtre pour en déduire la colonne donnait une valeur trop
            // grande — le conteneur réel est plus étroit que l'écran — et la
            // troisième vignette passait à la ligne. Un tiers de la largeur
            // disponible est juste quel que soit le parent.
            <View className="flex-row flex-wrap">
              {products.map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => router.push(`/(app)/products/${product.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${product.name}, ${formatXof(product.price)}`}
                  // Le rembourrage EST l'écart entre vignettes : deux cellules
                  // voisines laissent ainsi 2 points de blanc, sans que la
                  // somme des largeurs puisse dépasser la ligne.
                  style={{ width: '33.333%', aspectRatio: 1, padding: GRID_GAP / 2 }}
                >
                  <View className="flex-1 overflow-hidden">
                    {product.images[0] ? (
                      <Image
                        source={{ uri: product.images[0] }}
                        contentFit="cover"
                        transition={140}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <View className="h-full w-full items-center justify-center bg-gray-100">
                        <Ionicons name="image-outline" size={22} color="#9CA3AF" />
                      </View>
                    )}

                    {/* Le prix en surimpression : sur une grille de photos, il
                        est ce qu'on cherche en second, juste après l'image. */}
                    <View className="absolute bottom-0 left-0 right-0 bg-black/45 px-1.5 py-1">
                      <Text
                        numberOfLines={1}
                        className="text-[10px] font-bold text-white"
                      >
                        {formatXof(product.price)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : tab === 'reviews' ? (
          <EmptyState
            icon="star-outline"
            title={t('Aucun avis', 'No reviews yet')}
            description={t('Les avis apparaîtront ici après les premières livraisons.', 'Reviews will appear here after the first deliveries.')}
          />
        ) : (
          <View className="px-4 pt-4">
            <AboutRow
              icon="location-outline"
              label={t('Adresse', 'Address')}
              value={`${merchant.city}, ${merchant.country}`}
            />
            <AboutRow
              icon="calendar-outline"
              label={t('Sur Luuma depuis', 'On Luuma since')}
              value={formatDate(merchant.createdAt)}
            />
            <AboutRow
              icon="person-outline"
              label={t('Responsable', 'Owner')}
              value={merchant.user.name}
            />
            {merchant.description ? (
              <AboutRow
                icon="document-text-outline"
                label={t('À propos', 'About')}
                value={merchant.description}
              />
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * En-tête : retour à gauche, nom CENTRÉ, menu à droite — comme la maquette.
 *
 * Le menu partage le lien de la boutique. Il n'est rendu que si un partage
 * est réellement possible : un bouton présent mais inerte est pire qu'un
 * bouton absent, on l'appuie et on doute d'avoir bien visé.
 */
function Header({
  title,
  onBack,
  onShare,
}: {
  title: string;
  onBack: () => void;
  onShare?: () => void;
}) {
  const { t } = useAppLanguage();
  return (
    <View className="flex-row items-center border-b border-gray-100 px-3.5 pb-2.5 pt-1">
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('Retour', 'Back')}
      >
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      <Text
        numberOfLines={1}
        className="flex-1 px-3 text-center text-[15px] font-bold text-gray-900"
      >
        {title}
      </Text>

      {onShare ? (
        <Pressable
          onPress={onShare}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('Partager cette boutique', 'Share this shop')}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
        </Pressable>
      ) : (
        // Réserve la même largeur que le bouton, pour que le titre reste
        // réellement centré et ne se décale pas d'un écran à l'autre.
        <View style={{ width: 20 }} />
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="items-center">
      <Text className="text-base font-bold text-gray-900">{value}</Text>
      <Text className="text-[10px] text-gray-500">{label}</Text>
    </View>
  );
}

/**
 * Onglet en icône seule, comme sur un profil Instagram.
 *
 * Le libellé passe en `accessibilityLabel` plutôt qu'à l'écran : trois mots
 * sous trois icônes alourdiraient une barre qui doit rester une simple règle
 * entre l'identité et la grille. Les lecteurs d'écran, eux, gardent le mot.
 */
function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={[
        'flex-1 flex-row items-center justify-center gap-1.5 py-2.5',
        active ? 'border-b-2 border-primary' : '',
      ].join(' ')}
    >
      <Ionicons
        name={icon}
        size={15}
        color={active ? colors.primary : '#9CA3AF'}
      />
      <Text
        className={[
          'text-[13px] font-semibold',
          active ? 'text-primary' : 'text-gray-400',
        ].join(' ')}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AboutRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View className="mb-4 flex-row gap-3">
      <Ionicons name={icon} size={17} color="#9CA3AF" />
      <View className="flex-1">
        <Text className="text-[10px] uppercase tracking-wide text-gray-400">
          {label}
        </Text>
        <Text className="mt-0.5 text-[13px] leading-5 text-gray-800">
          {value}
        </Text>
      </View>
    </View>
  );
}

/** Reproduit la disposition réelle : en-tête centré puis grille à trois. */
function MerchantSkeleton() {
  return (
    <View>
      <View className="px-4 pb-3 pt-4">
        <View className="flex-row items-center">
          <SkeletonCircle size={86} />
          <View className="ml-5 flex-1 flex-row justify-around">
            {[0, 1, 2].map((i) => (
              <View key={i} className="items-center">
                <Skeleton width={30} height={16} mb={5} />
                <Skeleton width={46} height={9} />
              </View>
            ))}
          </View>
        </View>

        <View className="mt-4">
          <Skeleton width={150} height={15} mb={9} />
          <Skeleton height={12} mb={6} />
          <Skeleton width="65%" height={12} mb={9} />
          <Skeleton width={110} height={11} />
        </View>

        <View className="mt-4 flex-row gap-1.5">
          <Skeleton height={32} radius={8} />
          <Skeleton height={32} radius={8} />
        </View>
      </View>

      <View className="flex-row flex-wrap">
        {Array.from({ length: 9 }).map((_, i) => (
          <View
            key={i}
            style={{ width: '33.333%', aspectRatio: 1, padding: GRID_GAP / 2 }}
          >
            <Skeleton width="100%" height="100%" radius={0} />
          </View>
        ))}
      </View>
    </View>
  );
}
