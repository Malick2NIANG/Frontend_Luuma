import '@/global.css';
import '@/lib/socket';
import '@/lib/netinfo';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { MAX_CONTENT_WIDTH } from '@/hooks/useContentWidth';
import { AppLanguageProvider } from '@/lib/appLanguage';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/auth.store';

/**
 * Plancher court pour laisser l'animation de marque se poser sans ralentir
 * inutilement les lancements où la session est déjà disponible.
 */
const MINIMUM_SPLASH_MS = 1500;

export default function RootLayout() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [navigationLaidOut, setNavigationLaidOut] = useState(false);

  useEffect(() => {
    void hydrate();

    const timer = setTimeout(() => setMinimumElapsed(true), MINIMUM_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [hydrate]);

  // La navigation est montée derrière l'écran de bienvenue. Attendre sa
  // première mise en page évite de révéler un écran encore en transition.
  return (
    <AppLanguageProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
        {/* Utilise la largeur disponible sur mobile, tablette et ordinateur,
            avec un plafond pour éviter des lignes démesurées sur les écrans
            ultra-larges. Les pages qui contiennent des médias ou des
            formulaires appliquent leurs propres limites de confort.

            Fond unifié, sans gris : l'application suit le modèle Instagram,
            où le fil et les publications partagent la même surface et où
            seuls de fins filets séparent les contenus. */}
        <View className="flex-1 items-center bg-white">
          <View
            className="flex-1 w-full bg-white"
            style={{ maxWidth: MAX_CONTENT_WIDTH }}
          >
            {isHydrated ? (
              <View
                className="flex-1"
                onLayout={() => setNavigationLaidOut(true)}
              >
                <Stack screenOptions={{ headerShown: false }} />
              </View>
            ) : null}

            {splashVisible ? (
              <View className="absolute inset-0">
                <WelcomeScreen
                  ready={
                    isHydrated &&
                    minimumElapsed &&
                    (navigationLaidOut || Platform.OS === 'web')
                  }
                  onDismissed={() => setSplashVisible(false)}
                />
              </View>
            ) : null}
          </View>
        </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </AppLanguageProvider>
  );
}
