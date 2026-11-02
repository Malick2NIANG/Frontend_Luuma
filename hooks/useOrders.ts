import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { useCartStore, type CartItem } from '@/store/cart.store';
import type { Order, OrderItem, Package } from '@/types/api.types';

/**
 * `Omit<Order, 'items'>` est indispensable : `Order` déclare déjà
 * `items?: OrderItem[]`. Une simple intersection croiserait les deux types au
 * lieu de remplacer, et l'accès à un élément retomberait sur `OrderItem` nu —
 * sans `product` ni `merchant`, que l'API renvoie pourtant bien.
 */
export type OrderDetail = Omit<Order, 'items'> & {
  items: (OrderItem & {
    product: { id: string; name: string; images: string[]; weight: number };
    merchant: { id: string; shopName: string; city: string };
  })[];
  packages: (Package & {
    merchant: { id: string; shopName: string; city: string };
  })[];
};

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateOrderInput {
  tripId: string;
  items: CartItem[];
  deliveryAddress: string;
  deliveryCity: string;
  deliveryCountry: string;
}

/**
 * Traduit les erreurs métier du backend en messages actionnables.
 *
 * Le dépassement de capacité et la perte de place au paiement sont les deux
 * cas que l'utilisateur rencontrera vraiment ; les afficher tels quels évite
 * un « une erreur est survenue » qui ne dit pas quoi faire.
 *
 * Les messages métier du backend sont déjà rédigés en français à destination de
 * l'utilisateur final. Ils arrivent imbriqués (notre filtre d'exceptions
 * emballe la réponse de NestJS) : `apiErrorMessage` les en extrait.
 */
function getOrderErrorMessage(error: unknown): string {
  return apiErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.');
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const { data } = await api.post<OrderDetail>('/api/orders', {
        tripId: input.tripId,
        // La déclinaison et les mesures DOIVENT partir : sans `variantId`, le
        // serveur refuse un produit décliné, et sans mesures il refuse un
        // sur-mesure. Ne transmettre que le produit, comme avant, rendait
        // impossible la commande de tout ce qui n'est pas un article simple.
        items: input.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          ...(i.variantId ? { variantId: i.variantId } : {}),
          ...(i.measurements ? { measurements: i.measurements } : {}),
        })),
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        deliveryCountry: input.deliveryCountry,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getOrderErrorMessage(mutation.error) : null,
  };
}

/**
 * Confirme le paiement d'une commande.
 *
 * C'est ici que la capacité du GP est réellement réservée : un échec à ce
 * stade signifie que la place a été prise entre-temps, et le backend précise
 * alors qu'aucun débit n'a eu lieu.
 */
export function useConfirmOrder() {
  const queryClient = useQueryClient();
  const clearCart = useCartStore((s) => s.clear);

  const mutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.patch<OrderDetail>(
        `/api/orders/${orderId}/confirm`,
      );
      return data;
    },
    onSuccess: (order) => {
      // Le panier n'est vidé qu'une fois le paiement passé : si la capacité
      // a disparu, l'utilisateur doit pouvoir retenter avec un autre GP.
      clearCart();
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.setQueryData(['orders', order.id], order);
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getOrderErrorMessage(mutation.error) : null,
  };
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data } = await api.patch<OrderDetail>(
        `/api/orders/${orderId}/cancel`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getOrderErrorMessage(mutation.error) : null,
  };
}

/**
 * `enabled` évite d'appeler une route protégée en mode visiteur : la requête
 * partirait sans jeton, reviendrait en 401, et l'intercepteur global
 * déclencherait un logout inutile.
 */
export function useOrders(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['orders', 'list'],
    queryFn: async () => {
      const { data } = await api.get<Paginated<OrderDetail>>('/api/orders', {
        params: { limit: 50 },
      });
      return data;
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<OrderDetail>(`/api/orders/${id}`);
      return data;
    },
  });
}
