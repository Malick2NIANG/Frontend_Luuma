import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
import { AuthBackgroundCarousel } from '@/components/auth/AuthBackgroundCarousel';
import { colors } from '@/constants/colors';
import { useMiseEnPage } from '@/hooks/useContentWidth';
import { useAppLanguage } from '@/lib/appLanguage';

/**
 * Couleurs du formulaire selon ce qu'il y a derrière.
 *
 * Sur téléphone et tablette, le formulaire est posé sur les photos : texte
 * blanc. Sur ordinateur, il est sur le panneau blanc de l'écran partagé :
 * texte foncé, liens à la couleur de la marque.
 */
export function useAuthSurface() {
  const sombre = useMiseEnPage().format !== 'ordinateur';
  return sombre
    ? {
        sombre: true,
        titre: 'text-white',
        texte: 'text-white',
        lien: 'text-white',
        icone: '#FFFFFF',
        bouton: 'border-white/50 bg-white/10',
      }
    : {
        sombre: false,
        titre: 'text-gray-900',
        texte: 'text-gray-500',
        lien: 'text-primary',
        icone: colors.text,
        bouton: 'border-gray-200 bg-white',
      };
}

/**
 * Mise en page des écrans de connexion et d'inscription.
 *
 *   TÉLÉPHONE, TABLETTE   le formulaire est posé sur les photos qui défilent
 *                         en fond plein écran.
 *   ORDINATEUR            écran partagé en deux moitiés égales : le
 *                         formulaire à gauche sur fond blanc, les photos à
 *                         droite avec quelques mots sur ce qu'est Luuma.
 *                         C'est souvent la première visite : la moitié droite
 *                         présente l'application pendant qu'on se connecte.
 */
export function AuthSplit({ children }: { children: ReactNode }) {
  const { format } = useMiseEnPage();

  if (format !== 'ordinateur') {
    return (
      <>
        <AuthBackgroundCarousel />
        {children}
      </>
    );
  }

  return (
    <View className="flex-1 flex-row bg-white">
      <View className="flex-1 bg-white">{children}</View>
      <PanneauPhotos />
    </View>
  );
}

const APPARITION: CSSAnimationKeyframes = {
  from: { opacity: 0, transform: [{ translateY: 10 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};

function PanneauPhotos() {
  const { t } = useAppLanguage();
  const [vue, setVue] = useState(0);

  const messages = [
    {
      titre: t('Le marché sénégalais, dans votre poche', 'The Senegalese market, in your pocket'),
      texte: t(
        'Pagnes, karité, artisanat, épicerie : achetez directement auprès des boutiques du Sénégal.',
        'Fabrics, shea butter, crafts, groceries: buy directly from shops across Senegal.',
      ),
    },
    {
      titre: t('Livré jusqu’à vous, où que vous soyez', 'Delivered to you, wherever you are'),
      texte: t(
        'Vous vivez à l’étranger ? Un GP — un voyageur vérifié — transporte votre commande dans sa valise.',
        'Living abroad? A GP — a verified traveler — carries your order in their luggage.',
      ),
    },
    {
      titre: t('Les prix dans votre monnaie', 'Prices in your currency'),
      texte: t(
        'FCFA au Sénégal, euros, dollars ou livres ailleurs : vous savez toujours ce que vous payez.',
        'CFA francs in Senegal, euros, dollars or pounds elsewhere: you always know what you pay.',
      ),
    },
    {
      titre: t('Suivez vos boutiques préférées', 'Follow your favorite shops'),
      texte: t(
        'Nouveautés, photos et vidéos arrivent dans votre fil, au rythme de vos envies.',
        'New arrivals, photos and videos land in your feed.',
      ),
    },
  ];
  const actuel = vue % messages.length;
  const message = messages[actuel];

  return (
    <View className="relative flex-1 overflow-hidden">
      <AuthBackgroundCarousel onChange={setVue} />

      <View className="absolute bottom-0 left-0 right-0 px-14 pb-14">
        {/* `key` : le texte est remonté à chaque vue, et rejoue son apparition
            au rythme du fondu des photos. */}
        <Animated.View
          key={vue}
          style={{
            animationName: APPARITION,
            animationDuration: '700ms',
            animationTimingFunction: 'ease-out',
            animationFillMode: 'both',
          }}
        >
          <Text className="max-w-[520px] text-[32px] font-extrabold leading-[38px] tracking-tight text-white">
            {message.titre}
          </Text>
          <Text className="mt-3 max-w-[480px] text-[16px] leading-6 text-white/90">
            {message.texte}
          </Text>
        </Animated.View>

        <View className="mt-6 flex-row gap-2">
          {messages.map((m, i) => (
            <View
              key={m.titre}
              className={[
                'h-1.5 rounded-full',
                i === actuel ? 'w-6 bg-white' : 'w-1.5 bg-white/50',
              ].join(' ')}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
