import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import {
  useMarkNotificationsRead,
  useNotificationsList,
  type AppNotification,
  type NotifCategorie,
} from '@/hooks/useNotifications';
import { useAppLanguage } from '@/lib/appLanguage';
import { formatRelative } from '@/lib/format';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Au-delà, le texte est replié derrière « Voir plus ». */
const LIGNES_REPLIEES = 2;
const LONGUEUR_REPLIABLE = 90;

const ICONES: Record<string, IconName> = {
  ORDER_CONFIRMED: 'receipt-outline',
  ORDER_DELIVERED: 'checkmark-done-outline',
  ORDER_CANCELLED: 'close-circle-outline',
  PAYMENT_RELEASED: 'wallet-outline',
  PACKAGE_HANDED_TO_GP: 'cube-outline',
  PACKAGE_RECEIVED_BY_GP: 'hand-left-outline',
  GP_IN_TRANSIT: 'airplane-outline',
  PACKAGE_REFUSED: 'alert-circle-outline',
  GP_CANCELLED_TRIP: 'airplane-outline',
  KYC_APPROVED: 'shield-checkmark-outline',
  KYC_REJECTED: 'shield-outline',
  DISPUTE_OPENED: 'chatbubbles-outline',
  DISPUTE_RESOLVED: 'chatbubbles-outline',
};

export interface NotificationsSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Le panneau des notifications.
 *
 * LES POINTS ET LE BADGE S'ÉTEIGNENT À LA FERMETURE, PAS À L'OUVERTURE. Tant
 * que le panneau est ouvert, on voit ce qui est nouveau ; on referme, tout
 * passe en lu. Marquer lu dès l'ouverture effacerait les repères au moment
 * précis où on en a besoin.
 *
 * La lecture est bornée à la plus récente notification affichée : une autre
 * arrivée pendant la consultation reste non lue, puisque personne ne l'a vue.
 */
export function NotificationsSheet({ visible, onClose }: NotificationsSheetProps) {
  const { t } = useAppLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState<NotifCategorie | undefined>();

  // Une requête par frappe ferait clignoter la liste : on attend une pause.
  useEffect(() => {
    const timer = setTimeout(() => setRecherche(saisie.trim()), 300);
    return () => clearTimeout(timer);
  }, [saisie]);

  const filtres = useMemo(
    () => ({ q: recherche || undefined, categorie }),
    [recherche, categorie],
  );
  const liste = useNotificationsList(filtres, visible);
  const items = useMemo(
    () => liste.data?.pages.flatMap((page) => page.items) ?? [],
    [liste.data],
  );

  /** Plus récente notification affichée pendant cette ouverture. */
  const plusRecente = useRef<string | undefined>(undefined);
  useEffect(() => {
    const premiere = items[0]?.createdAt;
    if (premiere && (!plusRecente.current || premiere > plusRecente.current)) {
      plusRecente.current = premiere;
    }
  }, [items]);

  const marquerLu = useMarkNotificationsRead();

  const fermer = () => {
    if (plusRecente.current) marquerLu.mutate(plusRecente.current);
    plusRecente.current = undefined;
    setSaisie('');
    setRecherche('');
    setCategorie(undefined);
    onClose();
  };

  const ouvrir = (notif: AppNotification) => {
    const lien = notif.data?.lien;
    fermer();
    if (lien) router.push(lien as never);
  };

  const filtresDisponibles: { id: NotifCategorie | undefined; label: string }[] = [
    { id: undefined, label: t('Tout', 'All') },
    { id: 'COMMANDES', label: t('Commandes', 'Orders') },
    { id: 'COLIS', label: t('Colis', 'Packages') },
    { id: 'COMPTE', label: t('Compte', 'Account') },
  ];

  const filtreActif = Boolean(recherche || categorie);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={fermer}>
      <View className="flex-1 justify-end bg-black/35">
        <Pressable
          className="flex-1"
          onPress={fermer}
          accessibilityRole="button"
          accessibilityLabel={t('Fermer les notifications', 'Close notifications')}
        />

        <View
          className="h-[85%] w-full max-w-2xl self-center rounded-t-3xl bg-white"
          style={{ paddingBottom: insets.bottom }}
        >
          {/* Poignée : dit qu'il s'agit d'un panneau qu'on peut refermer. */}
          <View className="items-center pt-2.5">
            <View className="h-1 w-10 rounded-full bg-gray-200" />
          </View>

          <View className="flex-row items-center px-5 pb-3 pt-3">
            <Text className="text-lg font-bold text-gray-900">
              {t('Notifications', 'Notifications')}
            </Text>
            <Pressable
              className="ml-auto h-9 w-9 items-center justify-center rounded-full bg-gray-100"
              onPress={fermer}
              accessibilityRole="button"
              accessibilityLabel={t('Fermer', 'Close')}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View className="px-5">
            <View className="h-11 flex-row items-center rounded-2xl bg-gray-100 px-3.5">
              <Ionicons name="search" size={17} color="#9CA3AF" />
              <TextInput
                value={saisie}
                onChangeText={setSaisie}
                placeholder={t('Rechercher une notification', 'Search notifications')}
                placeholderTextColor="#9CA3AF"
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel={t('Rechercher une notification', 'Search notifications')}
                className="ml-2 h-full flex-1 text-[15px] text-gray-900"
                style={{ outlineStyle: 'none' } as object}
              />
              {saisie ? (
                <Pressable
                  onPress={() => setSaisie('')}
                  hitSlop={10}
                  accessibilityLabel={t('Effacer', 'Clear')}
                >
                  <Ionicons name="close-circle" size={17} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>

            <View className="flex-row gap-2 py-3">
              {filtresDisponibles.map((f) => {
                const actif = categorie === f.id;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => setCategorie(f.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: actif }}
                    className={[
                      'h-8 items-center justify-center rounded-full px-3.5',
                      actif ? 'bg-primary' : 'bg-gray-100',
                    ].join(' ')}
                  >
                    <Text
                      className={[
                        'text-[13px] font-semibold',
                        actif ? 'text-white' : 'text-gray-600',
                      ].join(' ')}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LigneNotification notif={item} onPress={() => ouvrir(item)} />
            )}
            ItemSeparatorComponent={() => <View className="ml-[72px] h-px bg-gray-100" />}
            onEndReached={() => {
              if (liste.hasNextPage && !liste.isFetchingNextPage) {
                void liste.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
            ListEmptyComponent={
              liste.isLoading ? (
                <View className="flex-1 items-center justify-center py-16">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : liste.isError ? (
                <EtatVide
                  icone="cloud-offline-outline"
                  titre={t('Chargement impossible', 'Could not load')}
                  texte={t('Vérifiez votre connexion.', 'Check your connection.')}
                  action={{ label: t('Réessayer', 'Retry'), onPress: () => void liste.refetch() }}
                />
              ) : filtreActif ? (
                <EtatVide
                  icone="search-outline"
                  titre={t('Aucun résultat', 'No results')}
                  texte={t(
                    'Aucune notification ne correspond à votre recherche.',
                    'No notification matches your search.',
                  )}
                />
              ) : (
                <EtatVide
                  icone="notifications-outline"
                  titre={t('Rien de nouveau', 'Nothing new')}
                  texte={t(
                    'Vos commandes, colis et votre compte vous seront signalés ici.',
                    'Updates on your orders, packages and account will show up here.',
                  )}
                />
              )
            }
            ListFooterComponent={
              liste.isFetchingNextPage ? (
                <View className="py-4">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : undefined
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function LigneNotification({
  notif,
  onPress,
}: {
  notif: AppNotification;
  onPress: () => void;
}) {
  const { t } = useAppLanguage();
  const [deplie, setDeplie] = useState(false);
  const repliable = notif.body.length > LONGUEUR_REPLIABLE;
  const nonLue = !notif.isRead;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nonLue ? t('Nouveau. ', 'New. ') : ''}${notif.title}. ${notif.body}`}
      className={[
        'flex-row px-5 py-3.5',
        nonLue ? 'bg-primary/5' : 'bg-white',
        'active:bg-gray-50',
      ].join(' ')}
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Ionicons name={ICONES[notif.type] ?? 'notifications-outline'} size={19} color={colors.primary} />
      </View>

      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text
            numberOfLines={1}
            className={[
              'flex-1 text-[15px] text-gray-900',
              nonLue ? 'font-bold' : 'font-semibold',
            ].join(' ')}
          >
            {notif.title}
          </Text>
          <Text className="ml-2 text-xs text-gray-400">{formatRelative(notif.createdAt)}</Text>
          {nonLue ? (
            <View
              className="ml-2 h-2.5 w-2.5 rounded-full bg-red-500"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : null}
        </View>

        <Text
          numberOfLines={deplie ? undefined : LIGNES_REPLIEES}
          className="mt-0.5 text-sm leading-5 text-gray-600"
        >
          {notif.body}
        </Text>

        {repliable ? (
          <Pressable
            onPress={() => setDeplie((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            className="mt-1 self-start"
          >
            <Text className="text-[13px] font-semibold text-primary">
              {deplie ? t('Voir moins', 'Show less') : t('Voir plus', 'Show more')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function EtatVide({
  icone,
  titre,
  texte,
  action,
}: {
  icone: IconName;
  titre: string;
  texte: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <Ionicons name={icone} size={26} color="#9CA3AF" />
      </View>
      <Text className="mt-3 text-base font-bold text-gray-900">{titre}</Text>
      <Text className="mt-1 text-center text-sm leading-5 text-gray-500">{texte}</Text>
      {action ? (
        <Pressable onPress={action.onPress} className="mt-4 rounded-full bg-primary px-5 py-2.5">
          <Text className="text-sm font-semibold text-white">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
