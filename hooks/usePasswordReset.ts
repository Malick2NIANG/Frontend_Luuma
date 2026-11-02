import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/api.types';

/** Durée de vie d'un code, alignée sur OTP_EXPIRY_MINUTES côté serveur. */
export const CODE_EXPIRY_MINUTES = 20;
/** Délai imposé entre deux demandes, aligné sur OtpRateLimitGuard. */
export const RESEND_COOLDOWN_SECONDS = 60;

interface AuthUser {
  id: string;
  email: string;
  phone: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

function toUser(authUser: AuthUser): User {
  return {
    id: authUser.id,
    email: authUser.email,
    phone: authUser.phone,
    name: authUser.name,
    avatar: authUser.image,
    emailVerified: authUser.emailVerified,
    phoneVerified: false,
    createdAt: authUser.createdAt,
    updatedAt: authUser.updatedAt,
  };
}

/**
 * Messages d'erreur du parcours de récupération.
 *
 * Deux sources de nature différente arrivent ici, et elles n'ont pas la même
 * forme :
 *
 *  - better-auth répond DIRECTEMENT (le contrôleur lui passe la réponse), sans
 *    traverser notre filtre d'exceptions : corps à plat `{ code, message }`.
 *    C'est le `code` qu'on lit ici, avec des textes rédigés pour ce parcours.
 *
 *  - Notre garde `OtpRateLimitGuard` lance, lui, une exception NestJS, donc
 *    elle traverse le filtre : le texte (« Patientez 40 secondes… ») se
 *    retrouve imbriqué sous `message.message`. `apiErrorMessage` sait le
 *    descendre chercher ; c'est lui qui affiche ce délai, et le remplacer par
 *    un message générique masquerait le délai à attendre.
 */
function resetError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { code?: string } | undefined;

    // better-auth ne distingue pas un code faux d'un code expiré : les deux
    // remontent la même erreur. On propose donc les deux explications plutôt
    // que d'en affirmer une au hasard.
    if (body?.code === 'INVALID_OTP' || body?.code === 'OTP_EXPIRED') {
      return 'Code incorrect ou expiré. Demandez-en un nouveau si besoin.';
    }
    if (body?.code === 'PASSWORD_TOO_SHORT') {
      return 'Le mot de passe est trop court (8 caractères minimum).';
    }
    if (body?.code === 'TOO_MANY_ATTEMPTS') {
      return 'Trop d’essais. Demandez un nouveau code.';
    }
  }
  return apiErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.');
}

/**
 * Étape 1 : demander l'envoi d'un code.
 *
 * La réponse est identique que le compte existe ou non — sinon l'écran
 * devient un moyen de savoir qui est inscrit sur Luuma.
 */
export function useRequestResetCode() {
  const mutation = useMutation({
    mutationFn: async (email: string) => {
      await api.post('/api/auth/email-otp/send-verification-otp', {
        email: email.trim().toLowerCase(),
        type: 'forget-password',
      });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? resetError(mutation.error) : null,
  };
}

/**
 * Étapes 2 et 3 : valider le code et poser le nouveau mot de passe.
 *
 * Les deux sont indissociables côté serveur — `reset-password` vérifie le code
 * ET écrit le mot de passe dans le même appel. On ne peut donc pas confirmer
 * le code à l'étape 2 sans consommer le code, d'où le regroupement.
 *
 * La connexion suit immédiatement : on tient le nouveau mot de passe en
 * mémoire, il serait absurde de renvoyer l'utilisateur le retaper sur l'écran
 * de connexion alors qu'il vient de le choisir.
 */
export function useResetPassword() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  const mutation = useMutation({
    mutationFn: async ({
      email,
      otp,
      password,
    }: {
      email: string;
      otp: string;
      password: string;
    }) => {
      const normalized = email.trim().toLowerCase();

      await api.post('/api/auth/email-otp/reset-password', {
        email: normalized,
        otp,
        password,
      });

      // `reset-password` ne renvoie pas de session : il confirme seulement le
      // changement. La connexion est un second appel, avec le mot de passe
      // qu'on vient d'établir.
      const { data } = await api.post<{ token: string; user: AuthUser }>(
        '/api/auth/sign-in/email',
        { email: normalized, password },
      );

      return data;
    },
    onSuccess: (data) => {
      // Cache vidé avant d'installer la session : on peut arriver ici depuis
      // une visite sans compte, ou après un changement de compte.
      queryClient.clear();
      setAuth(toUser(data.user), data.token);
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? resetError(mutation.error) : null,
  };
}
