import '@/global.css';
import '@/lib/socket';
import '@/lib/netinfo';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { useMiseEnPage } from '@/hooks/useContentWidth';
import { AppLanguageProvider } from '@/lib/appLanguage';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/auth.store';

export default function RootLayout() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);

  const [splashVisible, setSplashVisible] = useState(true);
  const { largeurApplication } = useMiseEnPage();
  const [navigationLaidOut, setNavigationLaidOut] = useState(false);

  // La durée minimale de l'écran de démarrage est gérée par l'écran lui-même
  // (2,7 s au vrai lancement, aucune sinon) : ici, on dit seulement quand
  // l'application est prête derrière lui.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // La navigation est montée derrière l'écran de bienvenue. Attendre sa
  // première mise en page évite de révéler un écran encore en transition.
  return (
    <AppLanguageProvider>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
        {/* Fond unifié, sans gris : l'application suit le modèle Instagram,
            où le fil et les publications partagent la même surface et où
            seuls de fins filets séparent les contenus. */}
        <View className="flex-1 items-center bg-white">
          {/* L'application tient dans une colonne centrée sur tablette et
              ordinateur (voir useMiseEnPage). Sans filets autour : sur fond
              blanc, comme Instagram, le blanc suffit à cadrer — des bordures
              donnaient l'impression d'une page mal ajustée. */}
          <View
            className="flex-1 w-full bg-white"
            style={{ maxWidth: largeurApplication }}
          >
            {isHydrated ? (
              <View
                className="flex-1"
                onLayout={() => setNavigationLaidOut(true)}
              >
                <Stack screenOptions={{ headerShown: false }} />
              </View>
            ) : null}
          </View>

          {/* Hors du conteneur à largeur plafonnée : le décor couvre tout
              l'écran, même sur un grand moniteur. */}
          {splashVisible ? (
            <View className="absolute inset-0" pointerEvents="box-none">
              <WelcomeScreen
                ready={
                  isHydrated && (navigationLaidOut || Platform.OS === 'web')
                }
                onDismissed={() => setSplashVisible(false)}
              />
            </View>
          ) : null}
        </View>
        </SafeAreaProvider>
      </QueryClientProvider>
    </AppLanguageProvider>
  );
}
