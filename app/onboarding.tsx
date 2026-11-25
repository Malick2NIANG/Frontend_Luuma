import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, SectionList, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { BrandLogo } from '@/components/BrandLogo';
import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { Button } from '@/components/ui/Button';
import { Flag } from '@/components/ui/Flag';
import { colors } from '@/constants/colors';
import { COUNTRIES, normalizeSearch, type Country } from '@/constants/countries';
import { deviseDuPays, deviseParDefaut } from '@/constants/currencyByCountry';
import { CURRENCY_LABELS, useCurrencyStore } from '@/hooks/useCurrency';
import { useAppLanguage } from '@/lib/appLanguage';
import { attendreFinDuSplash } from '@/lib/splash';
import { useOnboardingStore } from '@/store/onboarding.store';

/**
 * Premier lancement : « Au Sénégal ou à l'étranger ? », puis le pays.
 *
 * Une seule question utile plutôt qu'une série d'écrans de présentation : la
 * réponse règle la devise et le mode de livraison, et la personne arrive sur
 * le fil en deux gestes. Le Sénégal termine en un seul.
 *
 * Les autorisations (notifications, localisation) ne sont PAS demandées ici :
 * elles le seront au moment où elles servent — après une commande, à l'ajout
 * d'une adresse — quand la personne comprend pourquoi on les lui demande.
 */

/** Pays de la diaspora remontés en tête, dans l'ordre de leur poids réel. */
const PAYS_EN_TETE = ['FR', 'IT', 'ES', 'BE', 'US', 'DE', 'CA', 'GB', 'CH'];
const AUTRE_PAYS = '__autre__';

type Etape = 'zone' | 'pays';

// --- Entrée : la même grammaire que l'écran de démarrage -------------------

const EASE_OUT = Easing.bezier(0, 0, 0.58, 1);

/**
 * Fondu d'entrée, décalé de `delai` ms.
 *
 * Uniquement de l'opacité, comme l'écran de démarrage : la page prend le
 * relais de son animation au lieu d'apparaître d'un bloc. Le décompte ne
 * commence qu'une fois le splash parti — sinon tout serait déjà joué derrière
 * lui.
 */
function Apparition({
  delai,
  children,
  style,
}: {
  delai: number;
  children: ReactNode;
  style?: object;
}) {
  const opacite = useSharedValue(0);

  useEffect(() => {
    let actif = true;
    void attendreFinDuSplash().then(() => {
      if (!actif) return;
      opacite.value = withDelay(
        delai,
        withTiming(1, { duration: 700, easing: EASE_OUT }),
      );
    });
    return () => {
      actif = false;
    };
  }, [delai, opacite]);

  const animation = useAnimatedStyle(() => ({ opacity: opacite.value }));
  return <Animated.View style={[style, animation]}>{children}</Animated.View>;
}

// --- Écran -------------------------------------------------------------------

export default function OnboardingScreen() {
  const router = useRouter();
  /** `?modifier=1` : ouvert depuis les réglages, on y revient ensuite. */
  const { modifier } = useLocalSearchParams<{ modifier?: string }>();
  const depuisReglages = modifier === '1';
  const terminer = useOnboardingStore((s) => s.terminer);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);

  const [etape, setEtape] = useState<Etape>('zone');

  const allerAuFil = () => {
    if (depuisReglages && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const choisirSenegal = () => {
    setCurrency('XOF');
    terminer('SN', 'SN');
    allerAuFil();
  };

  const validerPays = (choix: string) => {
    const pays = choix === AUTRE_PAYS ? null : choix;
    setCurrency(deviseDuPays(pays));
    terminer('ETRANGER', pays);
    allerAuFil();
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      {/* Colonne de lecture : sur ordinateur, deux cartes de 1 200 px de large
          seraient illisibles. */}
      <View className="w-full max-w-lg flex-1 self-center">
        {etape === 'zone' ? (
          <EtapeZone
            onSenegal={choisirSenegal}
            onEtranger={() => setEtape('pays')}
            onFermer={depuisReglages ? allerAuFil : undefined}
          />
        ) : (
          <EtapePays onRetour={() => setEtape('zone')} onValider={validerPays} />
        )}
      </View>
    </SafeAreaView>
  );
}

function EtapeZone({
  onSenegal,
  onEtranger,
  onFermer,
}: {
  onSenegal: () => void;
  onEtranger: () => void;
  /** Présent quand on vient des réglages : on peut renoncer. */
  onFermer?: () => void;
}) {
  const { t } = useAppLanguage();
  return (
    <View className="flex-1 px-5">
      <Apparition delai={0}>
        <View className="flex-row items-center justify-between pb-2 pt-2">
          {onFermer ? (
            <Pressable
              onPress={onFermer}
              accessibilityRole="button"
              accessibilityLabel={t('Fermer', 'Close')}
              className="h-11 w-11 items-center justify-center rounded-full active:bg-gray-100"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <BrandLogo width={44} height={31} />
          )}
          <LanguageToggle />
        </View>
      </Apparition>

      <Apparition delai={100}>
        <View className="mt-6 items-center">
          <IllustrationMonde />
        </View>
      </Apparition>

      <Apparition delai={220}>
        <Text className="mt-6 text-xs font-bold uppercase tracking-widest text-primary">
          {t('Bienvenue sur Luuma', 'Welcome to Luuma')}
        </Text>
        {/* On demande où se TROUVE la personne, pas où elle se fait livrer :
            depuis Paris, on commande souvent pour sa famille à Dakar. C'est
            le pays de l'utilisateur qui fixe la devise. */}
        <Text className="mt-2 text-2xl font-extrabold leading-8 text-gray-900">
          {t('Où êtes-vous situé ?', 'Where are you located?')}
        </Text>
        <Text className="mt-1.5 text-base leading-6 text-gray-500">
          {t(
            "Choisissez votre pays pour profiter d'une expérience adaptée à votre région.",
            'Choose your country for an experience tailored to your region.',
          )}
        </Text>
      </Apparition>

      <View className="mt-6 gap-3">
        <Apparition delai={380}>
          <CarteZone
            icone={<Flag iso="SN" size={20} />}
            titre={t('Sénégal', 'Senegal')}
            detail={t(
              'Prix en FCFA · Livraison locale',
              'Prices in CFA francs · Local delivery',
            )}
            onPress={onSenegal}
          />
        </Apparition>
        <Apparition delai={520}>
          <CarteZone
            icone={
              <Ionicons name="globe-outline" size={22} color={colors.primary} />
            }
            titre={t('Un autre pays', 'Another country')}
            detail={t(
              'Prix dans votre devise · Envoi par GP',
              'Prices in your currency · Shipped by GP',
            )}
            onPress={onEtranger}
          />
        </Apparition>
      </View>

      <View className="flex-1" />

      <Apparition delai={700}>
        <View className="flex-row items-start justify-center px-4 pb-3">
          <Ionicons
            name="information-circle-outline"
            size={15}
            color="#9CA3AF"
            style={{ marginTop: 2 }}
          />
          <Text className="ml-1.5 shrink text-center text-xs leading-5 text-gray-400">
            {t(
              'Vous pourrez modifier votre pays et votre devise à tout moment dans les paramètres.',
              'You can change your country and currency anytime in settings.',
            )}
          </Text>
        </View>
      </Apparition>
    </View>
  );
}

/**
 * Carte de choix : fond à peine teinté, icône dans un cercle blanc, fine
 * bordure.
 *
 * Pas d'état « sélectionné » : toucher la carte emmène aussitôt à la suite.
 * Tout le soin va donc à l'appui — la carte se tasse légèrement (98 %), prend
 * la teinte et la bordure de la marque, puis revient. Assez pour sentir que le
 * geste est pris en compte, trop court pour retarder la navigation.
 */
function CarteZone({
  icone,
  titre,
  detail,
  onPress,
}: {
  icone: ReactNode;
  titre: string;
  detail: string;
  onPress: () => void;
}) {
  const appui = useSharedValue(0);

  const animation = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - appui.value * 0.02 }],
    backgroundColor: interpolateColor(appui.value, [0, 1], ['#F7FAF8', '#E7F3EC']),
    borderColor: interpolateColor(appui.value, [0, 1], ['#EEF2EF', colors.primary]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        appui.value = withTiming(1, { duration: 120, easing: EASE_OUT });
      }}
      onPressOut={() => {
        appui.value = withTiming(0, { duration: 220, easing: EASE_OUT });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${titre}. ${detail}`}
    >
      <Animated.View
        style={[
          {
            minHeight: 76,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 24,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 14,
          },
          animation,
        ]}
      >
        <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white">
          {icone}
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-base font-bold text-gray-900">{titre}</Text>
          <Text className="mt-0.5 text-sm leading-5 text-gray-500">{detail}</Text>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Petite illustration au trait : un globe, deux colis, et la trajectoire en
 * pointillé qui les relie — le Sénégal et la diaspora, dans le même dessin.
 * Même vocabulaire que le motif de l'écran de démarrage : des traits, la
 * couleur de la marque, une seule touche d'accent.
 */
function IllustrationMonde() {
  const vert = colors.primary;
  const clair = colors.accent;
  return (
    <Svg width={220} height={112} viewBox="0 0 220 112" accessible={false}>
      {/* sol */}
      <Path d="M20 104 H200" stroke={vert} strokeOpacity={0.12} strokeWidth={2} strokeLinecap="round" />
      {/* globe */}
      <Circle cx={110} cy={58} r={40} fill="#F0F7F3" stroke={vert} strokeWidth={2} />
      <Path
        d="M110 18 C92 32 92 84 110 98 M110 18 C128 32 128 84 110 98 M70 58 H150 M76 38 H144 M76 78 H144"
        fill="none"
        stroke={vert}
        strokeOpacity={0.45}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* trajectoire */}
      <Path
        d="M40 70 C52 18 168 8 182 62"
        fill="none"
        stroke={clair}
        strokeWidth={2}
        strokeDasharray="4 6"
        strokeLinecap="round"
      />
      <Circle cx={110} cy={26} r={4} fill={clair} />
      {/* colis de gauche */}
      <G>
        <Rect x={24} y={72} width={32} height={28} rx={5} fill="#FFFFFF" stroke={vert} strokeWidth={2} />
        <Path d="M24 82 H56 M40 72 V82" stroke={vert} strokeWidth={2} strokeLinecap="round" />
      </G>
      {/* colis de droite */}
      <G>
        <Rect x={166} y={66} width={34} height={34} rx={5} fill="#FFFFFF" stroke={vert} strokeWidth={2} />
        <Path d="M166 78 H200 M183 66 V78" stroke={vert} strokeWidth={2} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

// --- Étape 2 : le pays --------------------------------------------------------

function EtapePays({
  onRetour,
  onValider,
}: {
  onRetour: () => void;
  onValider: (choix: string) => void;
}) {
  const { t } = useAppLanguage();
  const [recherche, setRecherche] = useState('');
  const [choix, setChoix] = useState<string | null>(null);

  const sections = useMemo(() => {
    const etrangers = COUNTRIES.filter((c) => c.iso !== 'SN');
    const q = normalizeSearch(recherche);

    if (q) {
      const trouves = etrangers
        .filter((c) => normalizeSearch(c.name).includes(q))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      return [{ titre: '', data: trouves }];
    }

    const enTete = PAYS_EN_TETE.map((iso) =>
      etrangers.find((c) => c.iso === iso),
    ).filter((c): c is Country => Boolean(c));
    const reste = etrangers
      .filter((c) => !PAYS_EN_TETE.includes(c.iso))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    return [
      { titre: t('Les plus choisis', 'Most chosen'), data: enTete },
      { titre: t('Tous les pays', 'All countries'), data: reste },
    ];
  }, [recherche, t]);

  const pays = choix === AUTRE_PAYS ? null : choix;
  const devise = choix ? deviseDuPays(pays) : null;

  return (
    <View className="flex-1">
      <Apparition delai={0}>
        <View className="flex-row items-center justify-between px-3 pt-2">
          <Pressable
            onPress={onRetour}
            accessibilityRole="button"
            accessibilityLabel={t('Retour', 'Back')}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-gray-100"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text className="text-sm font-semibold text-gray-400">2 / 2</Text>
          <View className="w-11" />
        </View>

        <View className="px-5">
          <Text className="mt-3 text-2xl font-extrabold leading-8 text-gray-900">
            {t('Dans quel pays êtes-vous ?', 'Which country are you in?')}
          </Text>
          <Text className="mt-1 text-base leading-6 text-gray-500">
            {t(
              'Vos prix seront affichés dans votre devise.',
              'Prices will be shown in your currency.',
            )}
          </Text>

          <View className="mt-5 h-12 flex-row items-center rounded-2xl bg-gray-100 px-4">
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={recherche}
              onChangeText={setRecherche}
              placeholder={t('Rechercher un pays', 'Search for a country')}
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              accessibilityLabel={t('Rechercher un pays', 'Search for a country')}
              className="ml-2 h-full flex-1 text-base text-gray-900"
              style={{ outlineStyle: 'none' } as object}
            />
            {recherche ? (
              <Pressable
                onPress={() => setRecherche('')}
                accessibilityLabel={t('Effacer', 'Clear')}
                hitSlop={10}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </Apparition>

      <Apparition delai={150} style={{ flex: 1 }}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.iso}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
          renderSectionHeader={({ section }) =>
            section.titre ? (
              <Text className="px-3 pb-1 pt-5 text-xs font-bold uppercase tracking-widest text-gray-400">
                {section.titre}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <LignePays
              pays={item}
              selectionne={choix === item.iso}
              onPress={() => setChoix(item.iso)}
            />
          )}
          ListEmptyComponent={
            <Text className="px-3 pt-6 text-center text-sm text-gray-500">
              {t('Aucun pays ne correspond.', 'No matching country.')}
            </Text>
          }
          ListFooterComponent={
            <Pressable
              onPress={() => setChoix(AUTRE_PAYS)}
              accessibilityRole="radio"
              accessibilityState={{ selected: choix === AUTRE_PAYS }}
              className={[
                'mt-3 min-h-14 flex-row items-center rounded-2xl border border-dashed px-4',
                choix === AUTRE_PAYS ? 'border-primary bg-primary/5' : 'border-gray-300',
              ].join(' ')}
            >
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <Text className="ml-3 flex-1 text-base text-gray-700">
                {t("Mon pays n'est pas dans la liste", "My country isn't listed")}
              </Text>
              {choix === AUTRE_PAYS ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          }
        />
      </Apparition>

      <View className="border-t border-gray-100 bg-white px-5 pb-2 pt-3">
        {devise ? (
          <View className="mb-3 flex-row items-center justify-center">
            <View className="rounded-full bg-primary/10 px-3 py-1">
              <Text className="text-sm font-semibold text-primary">
                {CURRENCY_LABELS[devise]} · {devise}
              </Text>
            </View>
            {deviseParDefaut(pays) ? (
              <Text className="ml-2 text-xs text-gray-500">
                {t('par défaut', 'by default')}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Button
          fullWidth
          disabled={!choix}
          onPress={() => (choix ? onValider(choix) : undefined)}
        >
          {t('Continuer', 'Continue')}
        </Button>
      </View>
    </View>
  );
}

function LignePays({
  pays,
  selectionne,
  onPress,
}: {
  pays: Country;
  selectionne: boolean;
  onPress: () => void;
}) {
  const devise = deviseDuPays(pays.iso);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={pays.name}
      accessibilityState={{ selected: selectionne }}
      className={[
        'min-h-14 flex-row items-center rounded-2xl px-3',
        selectionne ? 'bg-primary/10' : 'active:bg-gray-50',
      ].join(' ')}
    >
      <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-100">
        <Flag iso={pays.iso} size={18} />
      </View>
      <Text
        className={[
          'ml-3 flex-1 text-base',
          selectionne ? 'font-semibold text-primary' : 'text-gray-900',
        ].join(' ')}
      >
        {pays.name}
      </Text>
      <Text className="mr-3 text-xs font-medium text-gray-400">{devise}</Text>
      <Ionicons
        name={selectionne ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selectionne ? colors.primary : '#D1D5DB'}
      />
    </Pressable>
  );
}
