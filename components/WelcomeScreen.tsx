import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View, useWindowDimensions } from 'react-native';
import Constants from 'expo-constants';
import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/constants/colors';
import {
  SPLASH_DASH,
  SPLASH_DASHED_PATHS,
  SPLASH_DOTS,
  SPLASH_PATHS,
  SPLASH_VIEWBOX,
} from '@/constants/splashMotif';
import { useAppLanguage } from '@/lib/appLanguage';
import {
  SPLASH_CHARGE_A,
  SPLASH_DUREE_MINIMALE_MS,
  marquerFinDuSplash,
  modeDuSplash,
} from '@/lib/splash';

export const BRAND = 'Luuma';
export const TAGLINE = 'Les produits du Sénégal, livrés jusqu’à vous.';

const LOGO_MAX_WIDTH = 148;
const LOGO_ASPECT_RATIO = 254 / 179;

/**
 * Chorégraphie d'entrée : uniquement des fondus, aucun déplacement.
 *
 *   logo    0 s → 1,1 s       fondu, ease-out
 *   nom     0,35 s → 2,15 s   sort du flou (0 % → 60 % → 100 %)
 *   slogan  1,2 s → 2,4 s     fondu, ease-in-out
 *
 * Puis, une fois l'application prête ET 2,7 s écoulées depuis le chargement :
 * sortie en 0,9 s. Au lancement « rapide » (lien partagé, rechargement…),
 * rien n'apparaît et l'écran s'efface en 0,25 s dès que l'app est prête.
 *
 * ZÉRO À-COUP — trois choix qui y concourent :
 *
 * 1. Des ANIMATIONS CSS (Reanimated 4), et non des valeurs animées en
 *    JavaScript. Sur le web, le navigateur les joue lui-même, image par
 *    image, même pendant que React monte le fil en arrière-plan ; sur
 *    téléphone, c'est le fil d'affichage natif. Le JavaScript peut être
 *    occupé à 100 % : l'animation ne saute pas une image.
 *
 * 2. La chorégraphie ne démarre qu'une fois l'écran posé ET le logo décodé
 *    (filet de 600 ms). Partie avant, elle se jouait en partie derrière un
 *    écran blanc, ou faisait « surgir » le logo au milieu de son fondu.
 *
 * 3. Le splash natif n'affiche plus le logo (app.json) : il n'y a donc plus
 *    de logo qui disparaît puis réapparaît au passage au splash de l'app.
 */
const LOGO_MS = 1100;
const NOM_DELAI_MS = 350;
const NOM_MS = 1800;
const SLOGAN_DELAI_MS = 1200;
const SLOGAN_MS = 1200;
const SORTIE_MS = 900;
const SORTIE_RAPIDE_MS = 250;
/** Le logo n'a pas signalé son chargement : on démarre quand même. */
const LOGO_FILET_MS = 600;

/** Vert de la marque passé à `brightness(.4)` et `(.85)` : le nom sur téléphone. */
const PRIMARY_04 = '#042516';
const PRIMARY_085 = '#094E30';

/** Durées en millisecondes : Reanimated accepte un nombre ou `"…ms"`. */
const ms = (valeur: number): `${number}ms` => `${valeur}ms`;

const FONDU: CSSAnimationKeyframes = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};

/** Les images clés du nom (web) : opacité, flou et luminosité ensemble. */
const NOM_WEB: CSSAnimationKeyframes = {
  '0%': { opacity: 0, filter: 'blur(10px) brightness(0.4)' },
  '60%': { opacity: 0.85, filter: 'blur(2px) brightness(0.85)' },
  '100%': { opacity: 1, filter: 'blur(0px) brightness(1)' },
} as CSSAnimationKeyframes;

/**
 * Sur téléphone, `filter: blur()` n'existe pas partout : le flou est imité par
 * une copie floue du texte (son ombre seule) qui s'efface pendant que la
 * version nette apparaît, et la luminosité par la couleur.
 */
const NOM_CONTENEUR: CSSAnimationKeyframes = {
  '0%': { opacity: 0 },
  '60%': { opacity: 0.85 },
  '100%': { opacity: 1 },
};
const NOM_NET: CSSAnimationKeyframes = {
  '0%': { opacity: 0, color: PRIMARY_04 },
  '60%': { opacity: 0.8, color: PRIMARY_085 },
  '100%': { opacity: 1, color: colors.primary },
};
const NOM_FLOU: CSSAnimationKeyframes = {
  '0%': { opacity: 1 },
  '60%': { opacity: 0.2 },
  '100%': { opacity: 0 },
};

/** Animation CSS « une fois, et figée à ses extrémités » (fill-mode both). */
function animation(
  keyframes: CSSAnimationKeyframes,
  duree: number,
  delai: number,
  courbe: 'ease-out' | 'ease-in-out',
) {
  return {
    animationName: keyframes,
    animationDuration: ms(duree),
    animationDelay: ms(delai),
    animationTimingFunction: courbe,
    animationFillMode: 'both' as const,
  };
}

export interface WelcomeScreenProps {
  /** L'application est montée derrière : l'écran peut s'effacer. */
  ready: boolean;
  onDismissed: () => void;
}

export function WelcomeScreen({ ready, onDismissed }: WelcomeScreenProps) {
  const { t } = useAppLanguage();
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.38, LOGO_MAX_WIDTH);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;

  // Calculé une seule fois : voir modeDuSplash.
  const [mode] = useState(modeDuSplash);
  const complet = mode === 'complet';

  // --- Départ : écran posé + logo prêt ---------------------------------------

  const [ecranPose, setEcranPose] = useState(false);
  const [logoPret, setLogoPret] = useState(false);
  const demarre = complet && ecranPose && logoPret;

  useEffect(() => {
    if (logoPret) return;
    const filet = setTimeout(() => setLogoPret(true), LOGO_FILET_MS);
    return () => clearTimeout(filet);
  }, [logoPret]);

  // --- Sortie ----------------------------------------------------------------

  const [sortie, setSortie] = useState(false);
  const fini = useRef(false);
  const sortieLancee = useRef(false);

  /**
   * Le parent passe une nouvelle fonction `onDismissed` à chaque rendu. Gardée
   * dans une référence, elle ne relance pas l'effet de sortie : sinon, un
   * simple re-rendu du parent pendant le fondu (redimensionnement, données
   * qui arrivent) annulait la minuterie de fin, et l'écran devenu invisible
   * restait posé par-dessus l'application en bloquant tous les clics.
   */
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

  useEffect(() => {
    if (!ready || sortieLancee.current) return;

    const attente = complet
      ? Math.max(0, SPLASH_CHARGE_A + SPLASH_DUREE_MINIMALE_MS - Date.now())
      : 0;
    const duree = complet ? SORTIE_MS : SORTIE_RAPIDE_MS;

    const depart = setTimeout(() => {
      sortieLancee.current = true;
      setSortie(true);
      // Fin de la transition CSS : le nœud est retiré juste après. Une
      // minuterie plutôt qu'un événement de fin, qui n'existe pas partout —
      // et un écran de lancement ne doit jamais pouvoir retenir l'app.
      // Volontairement NON annulée au démontage de l'effet : une fois la
      // sortie lancée, elle doit aller au bout.
      setTimeout(() => {
        if (fini.current) return;
        fini.current = true;
        marquerFinDuSplash();
        onDismissedRef.current();
      }, duree + 50);
    }, attente);

    return () => clearTimeout(depart);
  }, [ready, complet]);

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const nomTexte = {
    fontSize: 38,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    lineHeight: 46,
  };

  return (
    <Animated.View
      // Dès le début du fondu, les clics traversent vers l'application.
      pointerEvents={sortie ? 'none' : 'auto'}
      onLayout={() => {
        // Une image après la première mise en page : l'écran est réellement
        // affiché quand la chorégraphie commence.
        requestAnimationFrame(() => setEcranPose(true));
      }}
      style={{
        flex: 1,
        overflow: 'hidden',
        backgroundColor: colors.white,
        opacity: sortie ? 0 : 1,
        transitionProperty: 'opacity',
        transitionDuration: ms(complet ? SORTIE_MS : SORTIE_RAPIDE_MS),
        transitionTimingFunction: 'ease-in-out',
      }}
    >
      <View
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <MotifMarche />
      </View>

      {complet ? (
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${BRAND}. ${t(
            TAGLINE,
            'Products from Senegal, delivered to you.',
          )}`}
        >
          {/* Logo chargé hors champ AVANT la chorégraphie : il est décodé
              quand son fondu commence, au lieu de surgir en plein milieu. */}
          {!demarre ? (
            <View style={{ position: 'absolute', opacity: 0 }} pointerEvents="none">
              <BrandLogo
                width={logoWidth}
                height={logoHeight}
                onLoad={() => setLogoPret(true)}
                onError={() => setLogoPret(true)}
              />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
              <Animated.View style={animation(FONDU, LOGO_MS, 0, 'ease-out')}>
                <BrandLogo width={logoWidth} height={logoHeight} />
              </Animated.View>

              {Platform.OS === 'web' ? (
                <Animated.View
                  style={[
                    { marginTop: 16 },
                    animation(NOM_WEB, NOM_MS, NOM_DELAI_MS, 'ease-in-out'),
                  ]}
                >
                  <Text style={[nomTexte, { color: colors.primary }]}>{BRAND}</Text>
                </Animated.View>
              ) : (
                <Animated.View
                  style={[
                    { marginTop: 16 },
                    animation(NOM_CONTENEUR, NOM_MS, NOM_DELAI_MS, 'ease-in-out'),
                  ]}
                >
                  <Animated.Text
                    style={[
                      nomTexte,
                      animation(NOM_NET, NOM_MS, NOM_DELAI_MS, 'ease-in-out'),
                    ]}
                  >
                    {BRAND}
                  </Animated.Text>
                  <Animated.Text
                    style={[
                      nomTexte,
                      {
                        position: 'absolute',
                        color: 'transparent',
                        textShadowColor: colors.primary,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 10,
                      },
                      animation(NOM_FLOU, NOM_MS, NOM_DELAI_MS, 'ease-in-out'),
                    ]}
                  >
                    {BRAND}
                  </Animated.Text>
                </Animated.View>
              )}

              <Animated.Text
                style={[
                  {
                    maxWidth: 280,
                    marginTop: 8,
                    color: '#59665E',
                    fontSize: 16,
                    lineHeight: 24,
                    textAlign: 'center',
                  },
                  animation(FONDU, SLOGAN_MS, SLOGAN_DELAI_MS, 'ease-in-out'),
                ]}
              >
                {t(TAGLINE, 'Products from Senegal, delivered to you.')}
              </Animated.Text>
            </View>
          )}

          {demarre ? (
            <Animated.View
              style={[
                { position: 'absolute', right: 0, bottom: 20, left: 0, alignItems: 'center' },
                animation(FONDU, SLOGAN_MS, SLOGAN_DELAI_MS, 'ease-in-out'),
              ]}
            >
              <Text style={{ color: '#9CA3AF', fontSize: 11 }}>v{appVersion}</Text>
            </Animated.View>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

/**
 * Le décor : un marché en traits fins (voir constants/splashMotif.ts).
 *
 * `non-scaling-stroke` garde des traits fins quel que soit l'écran : sur un
 * ordinateur, le dessin est agrandi plus de trois fois et les traits
 * deviendraient épais comme des feutres.
 */
function MotifMarche() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={SPLASH_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
    >
      <G
        fill="none"
        stroke={colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.07}
      >
        {SPLASH_PATHS.map((d, i) => (
          <Path key={i} d={d} vectorEffect="non-scaling-stroke" />
        ))}
        {SPLASH_DASHED_PATHS.map((d) => (
          <Path
            key={d}
            d={d}
            strokeDasharray={SPLASH_DASH}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {SPLASH_DOTS.map(({ cx, cy, r }) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </G>
    </Svg>
  );
}
