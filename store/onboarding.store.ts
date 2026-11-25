import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Premier lancement : où se trouve la personne.
 *
 * C'est la différence de Luuma — un même catalogue, deux façons d'être livré.
 * Au Sénégal : livreur local, prix en francs CFA. À l'étranger : GP depuis le
 * Sénégal, prix dans la devise du pays. La réponse fixe la devise dès le
 * premier écran, et servira à orienter la livraison.
 */
export type Zone = 'SN' | 'ETRANGER';

interface OnboardingState {
  termine: boolean;
  zone: Zone | null;
  /** Code ISO du pays ; `null` pour « autre pays » à l'étranger. */
  pays: string | null;
  terminer: (zone: Zone, pays: string | null) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      termine: false,
      zone: null,
      pays: null,
      terminer: (zone, pays) => set({ termine: true, zone, pays }),
    }),
    {
      name: 'luum-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ termine, zone, pays }) => ({ termine, zone, pays }),
    },
  ),
);

/**
 * Le stockage a-t-il été relu ?
 *
 * Indispensable avant de décider d'afficher l'accueil : la lecture
 * d'AsyncStorage est asynchrone, et au premier rendu `termine` vaut toujours
 * `false` — y compris pour quelqu'un qui a répondu il y a six mois.
 */
export function useOnboardingHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useOnboardingStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    const unsubscribe = useOnboardingStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    // Relu entre le premier rendu et cet effet : l'événement est déjà passé.
    if (useOnboardingStore.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, [hydrated]);
  return hydrated;
}
