import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product, ProductKind } from '@/types/api.types';

/**
 * Article du panier.
 *
 * On conserve une copie du produit plutôt qu'un simple identifiant : le panier
 * doit rester consultable hors ligne, et le serveur recalcule de toute façon
 * les prix à la commande — ces valeurs ne servent qu'à l'affichage.
 */
export interface CartItem {
  /**
   * Clé de ligne, et non identifiant de produit.
   *
   * Le même boubou en M et en L sont deux lignes distinctes : indexer par
   * `productId`, comme avant, faisait que l'ajout du L incrémentait la
   * quantité du M. Un article sur-mesure n'est jamais regroupé du tout — deux
   * exemplaires aux mesures différentes restent deux lignes.
   */
  lineId: string;
  productId: string;
  variantId?: string;
  /** « M · Bleu indigo », figé à l'ajout pour l'affichage du panier. */
  variantLabel?: string;
  kind: ProductKind;
  merchantId: string;
  merchantName: string;
  name: string;
  image?: string;
  /** Prix unitaire en XOF, tel que publié par le commerçant. */
  price: number;
  /** Prix unitaire en EUR, converti côté serveur. */
  priceEur: number;
  /** Poids unitaire en kg — celui de la DÉCLINAISON si elle en a un. */
  weight: number;
  /** Décimale pour un tissu vendu au mètre, entière partout ailleurs. */
  quantity: number;
  /** Unité affichée pour la vente à la longueur : « mètre ». */
  unitLabel?: string;
  /** Mesures du client, pour le sur-mesure. */
  measurements?: Record<string, number>;
}

/** Ce qu'un écran fournit pour ajouter une ligne. */
export interface AddToCartInput {
  product: Pick<
    Product,
    'id' | 'merchantId' | 'name' | 'images' | 'price' | 'priceEur' | 'weight'
  > & { kind?: ProductKind; unitLabel?: string | null };
  merchantName: string;
  quantity?: number;
  variant?: {
    id: string;
    label: string;
    /** Poids propre à la déclinaison — c'est lui qui prime. */
    weight: number;
    price?: number | null;
    images?: string[];
  };
  measurements?: Record<string, number>;
}

interface CartState {
  items: CartItem[];
  add: (input: AddToCartInput) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

/** Vrai si cette ligne existe déjà dans le panier, déclinaison comprise. */
export function isInCart(items: CartItem[], productId: string): boolean {
  return items.some((i) => i.productId === productId);
}

function buildLineId(input: AddToCartInput): string {
  // Le sur-mesure ne fusionne jamais : chaque exemplaire porte ses mesures.
  if (input.measurements) {
    return `${input.product.id}::custom::${Date.now()}`;
  }
  return `${input.product.id}::${input.variant?.id ?? ''}`;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      add: (input) =>
        set((state) => {
          const lineId = buildLineId(input);
          const quantity = input.quantity ?? 1;
          const existing = state.items.find((i) => i.lineId === lineId);

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.lineId === lineId
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }

          const { product, variant } = input;
          // La déclinaison prime sur le produit pour le poids et le prix.
          // Pour le poids ce n'est pas un détail : c'est lui qui sera facturé
          // par le GP et réservé sur la capacité du trajet.
          const weight = variant?.weight ?? product.weight;
          const price = variant?.price ?? product.price;

          return {
            items: [
              ...state.items,
              {
                lineId,
                productId: product.id,
                variantId: variant?.id,
                variantLabel: variant?.label,
                kind: product.kind ?? 'SIMPLE',
                merchantId: product.merchantId,
                merchantName: input.merchantName,
                name: product.name,
                image: variant?.images?.[0] ?? product.images[0],
                price,
                // `priceEur` du produit ne vaut plus si la déclinaison change
                // le prix : on recalcule alors au même taux fixe que le serveur.
                priceEur:
                  variant?.price != null
                    ? variant.price / XOF_PER_EUR
                    : (product.priceEur ?? 0),
                weight,
                quantity,
                unitLabel: product.unitLabel ?? undefined,
                measurements: input.measurements,
              },
            ],
          };
        }),

      setQuantity: (lineId, quantity) =>
        set((state) => ({
          // Une quantité ramenée à zéro retire l'article : c'est le geste
          // attendu quand on décrémente depuis 1.
          items:
            quantity <= 0
              ? state.items.filter((i) => i.lineId !== lineId)
              : state.items.map((i) =>
                  i.lineId === lineId ? { ...i, quantity } : i,
                ),
        })),

      remove: (lineId) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineId !== lineId),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'luum-cart',
      // AsyncStorage et non SecureStore : un panier n'est pas un secret, et
      // SecureStore plafonne à 2 Ko par entrée — vite atteint.
      storage: createJSONStorage(() => AsyncStorage),

      // Les paniers enregistrés avant les déclinaisons n'ont ni `lineId` ni
      // `kind`. Sans migration, `setQuantity` et `remove` ne trouveraient plus
      // rien et le panier deviendrait impossible à vider.
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as { items?: Partial<CartItem>[] };

        if (version < 2 && state?.items) {
          state.items = state.items.map((item) => ({
            ...item,
            lineId: item.lineId ?? `${item.productId}::`,
            kind: item.kind ?? 'SIMPLE',
          }));
        }

        return state as unknown as CartState;
      },
    },
  ),
);

/**
 * Taux fixe XOF → EUR, identique à celui du serveur.
 *
 * Le franc CFA est arrimé à l'euro par convention, pas par un marché : la
 * parité ne bouge pas, et aller interroger un service de change chaque jour
 * ajouterait une dépendance externe pour une valeur constante.
 */
const XOF_PER_EUR = 655.957;

// --- Sélecteurs dérivés ----------------------------------------------------

export function cartTotalWeight(items: CartItem[]): number {
  return (
    Math.round(items.reduce((sum, i) => sum + i.weight * i.quantity, 0) * 1000) /
    1000
  );
}

export function cartSubtotalEur(items: CartItem[]): number {
  return (
    Math.round(items.reduce((sum, i) => sum + i.priceEur * i.quantity, 0) * 100) /
    100
  );
}

/**
 * Nombre d'articles, pour la pastille du panier.
 *
 * Les quantités décimales sont arrondies au supérieur : « 2,5 » sur la
 * pastille n'aurait aucun sens, et 2,5 mètres de tissu comptent bien pour
 * un article dans l'esprit du client.
 */
export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + Math.ceil(i.quantity), 0);
}

/** Regroupe par commerçant — chacun prépare et dépose son propre colis. */
export function cartByMerchant(
  items: CartItem[],
): { merchantId: string; merchantName: string; items: CartItem[] }[] {
  const groups = new Map<string, CartItem[]>();

  for (const item of items) {
    const existing = groups.get(item.merchantId);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.merchantId, [item]);
    }
  }

  return [...groups.entries()].map(([merchantId, groupItems]) => ({
    merchantId,
    merchantName: groupItems[0].merchantName,
    items: groupItems,
  }));
}
