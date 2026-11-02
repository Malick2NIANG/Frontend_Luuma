import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export const DISPLAY_CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP', 'CAD'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const CURRENCY_LABELS: Record<DisplayCurrency, string> = {
  XOF: 'Franc CFA',
  EUR: 'Euro',
  USD: 'Dollar américain',
  GBP: 'Livre sterling',
  CAD: 'Dollar canadien',
};

const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  XOF: 'FCFA',
  EUR: '€',
  USD: '$',
  GBP: '£',
  CAD: 'CA$',
};

/**
 * Parité fixe franc CFA / euro.
 *
 * Convention monétaire et non cotation : elle ne bouge pas, et c'est ce qui
 * permet d'afficher l'équivalent en euros sans interroger personne. Toute
 * autre devise passe d'abord par l'euro.
 */
const XOF_PER_EUR = 655.957;

interface RatesResponse {
  base: 'EUR';
  xofPerEur: number;
  rates: Record<string, number>;
  quotedAt: string | null;
  isStale: boolean;
}

// --- Préférence de l'utilisateur -------------------------------------------

interface CurrencyState {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
}

/**
 * Devise d'affichage choisie, conservée entre les lancements.
 *
 * Par défaut l'euro : la majorité de la diaspora sénégalaise vit en zone euro,
 * et c'est aussi la devise réellement facturée — le choix par défaut est donc
 * celui qui ne ment jamais.
 */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'EUR',
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'luum-currency',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// --- Taux -------------------------------------------------------------------

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const { data } = await api.get<RatesResponse>('/api/exchange-rates');
      return data;
    },
    // Les taux changent une fois par jour ouvré. Une heure de fraîcheur évite
    // d'interroger le serveur à chaque écran sans jamais afficher la veille.
    staleTime: 60 * 60 * 1000,
    // Un échec ne doit pas faire réessayer en boucle : l'affichage retombe
    // sur le franc CFA et l'euro, qui n'ont besoin d'aucun taux.
    retry: 1,
  });
}

export interface PriceFormatter {
  /** Convertit un montant en XOF vers la devise choisie et le met en forme. */
  format: (amountXof: number) => string;
  /** La devise réellement utilisée — l'euro si le taux manque. */
  currency: DisplayCurrency;
  /** Vrai quand le montant affiché n'est PAS celui qui sera débité. */
  isIndicative: boolean;
  /** Date de cotation, à afficher quand la devise est indicative. */
  quotedAt: string | null;
}

/**
 * Formatage d'un prix dans la devise choisie.
 *
 * Deux garde-fous. D'abord, si le taux d'une devise flottante est absent —
 * serveur injoignable, table pas encore alimentée — on retombe sur l'euro
 * plutôt que d'afficher un montant faux : le franc CFA et l'euro se
 * convertissent l'un vers l'autre sans aucune donnée externe.
 *
 * Ensuite, `isIndicative` : tout ce qui n'est ni XOF ni EUR est une
 * commodité de lecture, car la commande est facturée en euros. L'interface
 * doit le dire là où l'on paie, sinon l'écart apparaîtra sur le relevé
 * bancaire sans explication.
 */
export function usePrice(): PriceFormatter {
  const currency = useCurrencyStore((s) => s.currency);
  const { data } = useExchangeRates();

  const rate = currency === 'EUR' || currency === 'XOF'
    ? null
    : (data?.rates[currency] ?? null);

  // Devise flottante demandée mais taux indisponible : on se rabat sur l'euro.
  const effective: DisplayCurrency =
    currency === 'XOF' || currency === 'EUR' || rate !== null ? currency : 'EUR';

  const format = useCallback(
    (amountXof: number): string => {
      if (effective === 'XOF') {
        return `${Math.round(amountXof).toLocaleString('fr-FR')} FCFA`;
      }

      const eur = amountXof / (data?.xofPerEur ?? XOF_PER_EUR);
      const amount = effective === 'EUR' ? eur : eur * (rate as number);

      return `${amount.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${CURRENCY_SYMBOLS[effective]}`;
    },
    [effective, rate, data?.xofPerEur],
  );

  return {
    format,
    currency: effective,
    isIndicative: effective !== 'XOF' && effective !== 'EUR',
    quotedAt: data?.quotedAt ?? null,
  };
}
