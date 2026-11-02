import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/apiError';
import { useAuthStore } from '@/store/auth.store';

/** Durée de vie d'un code, alignée sur OTP_EXPIRY_MINUTES côté serveur. */
export const CODE_EXPIRY_MINUTES = 20;
/** Délai imposé entre deux demandes, aligné sur OtpRateLimitGuard. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Messages d'erreur de la vérification d'email.
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
 *    un message générique effacerait la seule information utile.
 */
function verificationError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { code?: string } | undefined;

    // better-auth ne distingue pas un code faux d'un code expiré. On propose
    // donc les deux explications plutôt que d'en affirmer une au hasard.
    if (body?.code === 'INVALID_OTP' || body?.code === 'OTP_EXPIRED') {
      return 'Code incorrect ou expiré. Demandez-en un nouveau si besoin.';
    }
    if (body?.code === 'TOO_MANY_ATTEMPTS') {
      return 'Trop d’essais. Demandez un nouveau code.';
    }
  }
  return apiErrorMessage(error, 'Une erreur est survenue. Veuillez réessayer.');
}

/** Renvoi du code de vérification. */
export function useSendVerificationCode() {
  const email = useAuthStore((state) => state.user?.email);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!email) throw new Error('Aucune adresse à vérifier.');
      await api.post('/api/auth/email-otp/send-verification-otp', {
        email,
        type: 'email-verification',
      });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? verificationError(mutation.error) : null,
  };
}

/**
 * Validation du code reçu.
 *
 * `['me']` est invalidé plutôt qu'écrit à la main : c'est le serveur qui fait
 * foi sur `emailVerified`, et les capacités qui en découlent — ouvrir une
 * boutique, devenir GP, payer — sont recalculées par lui.
 *
 * Le magasin d'authentification est mis à jour en parallèle : c'est lui qui
 * porte l'utilisateur affiché, et il resterait sinon sur un `emailVerified`
 * périmé jusqu'à la prochaine connexion.
 */
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const setAuth = useAuthStore((state) => state.setAuth);

  const mutation = useMutation({
    mutationFn: async (otp: string) => {
      if (!user?.email) throw new Error('Aucune adresse à vérifier.');
      await api.post('/api/auth/email-otp/verify-email', {
        email: user.email,
        otp,
      });
    },
    onSuccess: () => {
      if (user && token) {
        setAuth({ ...user, emailVerified: true }, token);
      }
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? verificationError(mutation.error) : null,
  };
}
