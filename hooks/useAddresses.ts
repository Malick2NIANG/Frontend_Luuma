import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { useAuth } from '@/hooks/useAuth';
import { useAppLanguage } from '@/lib/appLanguage';

/** Miroir du modèle Address (Backend/prisma/schema.prisma). */
export interface Address {
  id: string;
  label: string;
  address: string;
  city: string;
  /** Code ISO à deux lettres — comparé à `destCountry` des trajets. */
  country: string;
  postCode: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInput {
  label: string;
  address: string;
  city: string;
  country: string;
  postCode?: string;
  isDefault?: boolean;
}

/**
 * Carnet d'adresses du client.
 *
 * Il évite deux saisies pénibles : la ville à taper dans la recherche de GP,
 * et l'adresse complète à retaper à chaque commande.
 *
 * Le serveur garantit qu'il y a toujours exactement une adresse par défaut
 * tant qu'il en reste une — c'est elle que les écrans proposent, sans avoir
 * à décider eux-mêmes laquelle choisir.
 */
export function useAddresses() {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    enabled: isAuthenticated,
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data } = await api.get<Address[]>('/api/addresses');
      return data;
    },
    // Une adresse change rarement, et jamais à l'insu de la personne : cinq
    // minutes évitent de la redemander à chaque passage sur le panier.
    staleTime: 5 * 60_000,
  });

  const addresses = query.data ?? [];

  return {
    ...query,
    addresses,
    /** L'adresse proposée par défaut, s'il y en a une. */
    defaultAddress: addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
  };
}

function useAddressMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  const { t } = useAppLanguage();

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      // Toujours invalider la LISTE entière, jamais modifier une entrée :
      // changer l'adresse par défaut en déplace une autre côté serveur, et
      // une mise à jour locale ne verrait que celle qu'on vient de toucher.
      void queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error
      ? apiErrorMessage(
          mutation.error,
          t(
            'Impossible d’enregistrer cette adresse. Réessayez.',
            'Could not save this address. Please try again.',
          ),
        )
      : null,
  };
}

export function useCreateAddress() {
  return useAddressMutation<AddressInput>(async (input) => {
    const { data } = await api.post<Address>('/api/addresses', input);
    return data;
  });
}

export function useUpdateAddress() {
  return useAddressMutation<{ id: string; input: Partial<AddressInput> }>(
    async ({ id, input }) => {
      const { data } = await api.patch<Address>(`/api/addresses/${id}`, input);
      return data;
    },
  );
}

export function useDeleteAddress() {
  return useAddressMutation<string>(async (id) => {
    await api.delete(`/api/addresses/${id}`);
  });
}
