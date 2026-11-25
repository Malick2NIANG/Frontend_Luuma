import { Ionicons } from '@expo/vector-icons';
import { router, type Tabs } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/constants/colors';
import { LARGEUR_BARRE_LATERALE } from '@/hooks/useContentWidth';
import { useAppLanguage } from '@/lib/appLanguage';

type TabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Icônes de chaque onglet : pleine quand l'onglet est actif, au trait sinon. */
const ICONES: Record<string, [IconName, IconName]> = {
  index: ['home', 'home-outline'],
  search: ['search', 'search-outline'],
  shop: ['storefront', 'storefront-outline'],
  gp: ['airplane', 'airplane-outline'],
  messages: ['chatbubble', 'chatbubble-outline'],
  profile: ['person', 'person-outline'],
};

export interface DesktopSidebarProps extends TabBarProps {
  /** Messages non lus, en pastille sur l'icône des messages. */
  nonLus: number;
}

/**
 * Navigation latérale compacte, sur tablette et ordinateur — comme Instagram.
 *
 * Des icônes seules, sur 72 px : mêmes onglets que la barre du bas du
 * téléphone, même ordre, mêmes onglets masqués selon les casquettes du compte.
 * Au survol de la souris, la barre se déplie par-dessus le contenu et montre
 * le nom de chaque onglet ; le nom reste annoncé aux lecteurs d'écran.
 *
 * Les paramètres sont en bas (roue dentée), à la place du menu « Plus » d’Instagram.
 */
export function DesktopSidebar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  nonLus,
}: DesktopSidebarProps) {
  const { t } = useAppLanguage();
  const [deplie, setDeplie] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Dépliée au survol, comme Instagram — mais après un court délai : la souris
   * qui ne fait que traverser la barre pour aller au fil ne doit pas la faire
   * clignoter. Elle se replie dès que la souris sort.
   */
  const entrer = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setDeplie(true), DELAI_DEPLIAGE_MS);
  };
  const sortir = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    setDeplie(false);
  };
  useEffect(() => () => {
    if (minuterie.current) clearTimeout(minuterie.current);
  }, []);

  // Un onglet choisi replie la barre : on va lire, plus naviguer.
  const choisir = (action: () => void) => {
    sortir();
    action();
  };

  return (
    // La place réservée reste de 72 px : dépliée, la barre passe PAR-DESSUS
    // le contenu au lieu de le pousser — le fil ne saute pas à chaque survol.
    <View style={{ width: LARGEUR_BARRE_LATERALE, zIndex: 20 }}>
      <Animated.View
        {...({ onPointerEnter: entrer, onPointerLeave: sortir } as object)}
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: deplie ? LARGEUR_DEPLIEE : LARGEUR_BARRE_LATERALE,
            backgroundColor: '#FFFFFF',
            paddingTop: 28,
            paddingBottom: 20,
            overflow: 'hidden',
            transitionProperty: ['width', 'boxShadow'],
            transitionDuration: '200ms',
            transitionTimingFunction: 'ease-out',
          },
          deplie ? { boxShadow: '4px 0 24px rgba(0, 0, 0, 0.08)' } : { boxShadow: 'none' },
        ]}
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Luuma"
          onPress={() => choisir(() => navigateToTab(state.routes[0].key))}
          className="h-10 flex-row items-center"
          style={{ paddingLeft: MARGE_ICONE }}
        >
          <View className="w-12 items-center">
            <BrandLogo width={36} height={26} />
          </View>
          <Libelle visible={deplie} className="ml-2 text-xl font-extrabold tracking-tight text-primary">
            Luuma
          </Libelle>
        </Pressable>

        {/* Séparateur discret entre la marque et la navigation. */}
        <View
          className="mb-5 mt-5 h-px bg-gray-200"
          style={{
            marginLeft: MARGE_ICONE + 12,
            width: deplie ? LARGEUR_DEPLIEE - 2 * (MARGE_ICONE + 12) : 24,
          }}
        />

        <View className="flex-1 gap-1.5">
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            // Onglet masqué (`href: null`) : boutique ou voyages sans la casquette.
            if ((options as { hidden?: boolean }).hidden) return null;

            const actif = state.index === index;
            const titre = typeof options.title === 'string' ? options.title : route.name;
            const [pleine, trait] = ICONES[route.name] ?? ['ellipse', 'ellipse-outline'];

            const aller = () => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!actif && !event.defaultPrevented) {
                navigateToTab(route.key);
              }
            };

            return (
              <BoutonBarre
                key={route.key}
                titre={titre}
                icone={actif ? pleine : trait}
                actif={actif}
                deplie={deplie}
                onPress={() => choisir(aller)}
                role="tab"
                pastille={route.name === 'messages' ? nonLus : 0}
              />
            );
          })}
        </View>

        <BoutonBarre
          titre={t('Paramètres', 'Settings')}
          icone="settings-outline"
          actif={false}
          deplie={deplie}
          onPress={() => choisir(() => router.push('/(app)/settings'))}
          role="link"
          pastille={0}
        />
      </Animated.View>
    </View>
  );
}

/** Largeur de la barre dépliée au survol. */
const LARGEUR_DEPLIEE = 240;
/** Délai avant dépliage : évite le clignotement quand la souris ne fait que passer. */
const DELAI_DEPLIAGE_MS = 180;
/** Marge qui centre un bouton de 48 px dans la barre de 72 px. */
const MARGE_ICONE = (LARGEUR_BARRE_LATERALE - 48) / 2;

/** Libellé qui n'apparaît que barre dépliée, en fondu. */
function Libelle({
  visible,
  className,
  children,
}: {
  visible: boolean;
  className: string;
  children: string;
}) {
  return (
    <Animated.Text
      numberOfLines={1}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transitionProperty: 'opacity',
        transitionDuration: visible ? '180ms' : '80ms',
      }}
    >
      {children}
    </Animated.Text>
  );
}

function BoutonBarre({
  titre,
  icone,
  actif,
  deplie,
  onPress,
  role,
  pastille,
}: {
  titre: string;
  icone: IconName;
  actif: boolean;
  deplie: boolean;
  onPress: () => void;
  role: 'tab' | 'link';
  pastille: number;
}) {
  return (
    <View style={{ paddingHorizontal: MARGE_ICONE }}>
      <Pressable
        onPress={onPress}
        accessibilityRole={role}
        accessibilityState={role === 'tab' ? { selected: actif } : undefined}
        accessibilityLabel={pastille > 0 ? `${titre} (${pastille})` : titre}
        className="h-12 flex-row items-center rounded-xl hover:bg-gray-100 active:bg-gray-200"
      >
        <View className="w-12 items-center">
          <View>
            <Ionicons
              name={icone}
              size={26}
              color={actif ? colors.primary : colors.text}
            />
            {pastille > 0 ? (
              <View className="absolute -right-2 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1">
                <Text className="text-[10px] font-bold text-white">
                  {pastille > 9 ? '9+' : pastille}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Libelle
          visible={deplie}
          className={[
            'ml-2 text-[15px]',
            actif ? 'font-bold text-primary' : 'font-medium text-gray-900',
          ].join(' ')}
        >
          {titre}
        </Libelle>
      </Pressable>
    </View>
  );
}
