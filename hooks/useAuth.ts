import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import type { User } from '@/types/api.types';

// better-auth's own response shape for its user object: canonical field is
// `image` (mapped to the `avatar` column server-side), and it doesn't
// include `phoneVerified` or `roles` — those aren't part of its schema.
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

interface AuthResponse {
  token: string;
  user: AuthUser;
  redirect?: boolean;
  url?: string | null;
}

function toUser(authUser: AuthUser): User {
  return {
    id: authUser.id,
    email: authUser.email,
    phone: authUser.phone,
    name: authUser.name,
    avatar: authUser.image,
    emailVerified: authUser.emailVerified,
    // Nothing in the app can set this true yet (no phone OTP flow exists),
    // so `false` is accurate for every user today, not just a placeholder.
    phoneVerified: false,
    createdAt: authUser.createdAt,
    updatedAt: authUser.updatedAt,
  };
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  /** Nom d'affichage, composé du prénom et du nom. */
  name: string;
  firstName: string;
  lastName: string;
  /** Numéro déjà recomposé au format international. */
  phone: string;
}

interface BetterAuthErrorBody {
  code?: string;
  message?: string;
}

// Only codes actually observed from the running server are mapped here;
// anything else falls back to a generic French message rather than a guess.
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email ou mot de passe incorrect.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Un compte existe déjà avec cet email.',
  MISSING_FIELD: 'Merci de renseigner tous les champs obligatoires.',
  PASSWORD_TOO_SHORT: 'Le mot de passe est trop court (8 caractères minimum).',
  PASSWORD_TOO_LONG: 'Le mot de passe est trop long.',
  VALIDATION_ERROR: 'Merci de vérifier les informations saisies.',
};

const FALLBACK_ERROR_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';
const NETWORK_ERROR_MESSAGE = 'Impossible de contacter le serveur. Vérifiez votre connexion.';

function getAuthErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return NETWORK_ERROR_MESSAGE;

    const body = error.response.data as BetterAuthErrorBody | undefined;
    if (body?.code && body.code in ERROR_MESSAGES) {
      return ERROR_MESSAGES[body.code];
    }
  }
  return FALLBACK_ERROR_MESSAGE;
}

const DEFAULT_DESTINATION = '/(app)/(tabs)' as const;

/**
 * Destination après authentification.
 *
 * La garde de `(app)/_layout.tsx` place l'écran d'origine dans `returnTo`
 * lorsque la session est TOMBÉE : quelqu'un interrompu au moment de commander
 * doit y revenir directement, pas être relâché sur l'accueil.
 *
 * Après une déconnexion volontaire, elle ne le place pas — on repart donc sur
 * la destination par défaut, ce qui est bien ce qu'on attend.
 */
function usePostAuthDestination(): Href {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  // Chemin interne uniquement : une valeur arbitraire dans l'URL ne doit pas
  // pouvoir détourner la navigation vers l'extérieur.
  if (returnTo && returnTo.startsWith('/')) {
    return returnTo as Href;
  }
  return DEFAULT_DESTINATION;
}

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isGuest = useAuthStore((state) => state.isGuest);

  return {
    user,
    token,
    isHydrated,
    isAuthenticated: Boolean(token),
    /**
     * Visite sans compte. À ne consulter QUE pour décider de l'affichage —
     * jamais pour autoriser une action : c'est `isAuthenticated` qui fait foi,
     * et le serveur qui tranche.
     */
    isGuest,
  };
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const destination = usePostAuthDestination();

  const mutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<AuthResponse>('/api/auth/sign-in/email', input);
      return data;
    },
    onSuccess: (data) => {
      // Ceinture et bretelles : une session peut se terminer sans passer par
      // la déconnexion — jeton expiré, application relancée, visite sans
      // compte suivie d'une connexion. On repart d'un cache vide à chaque
      // entrée dans un compte, quel que soit le chemin emprunté.
      queryClient.clear();
      setAuth(toUser(data.user), data.token);
      router.replace(destination);
    },
  });

  return { ...mutation, errorMessage: mutation.error ? getAuthErrorMessage(mutation.error) : null };
}

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const destination = usePostAuthDestination();

  const mutation = useMutation({
    // L'acceptation des conditions et l'accord commercial ne passent plus
    // par ici : ils sont recueillis à la première ouverture, sur l'écran
    // bloquant `TermsGate`, où le texte est réellement affiché.
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<AuthResponse>('/api/auth/sign-up/email', input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.clear();
      setAuth(toUser(data.user), data.token);
      router.replace(destination);
    },
  });

  return { ...mutation, errorMessage: mutation.error ? getAuthErrorMessage(mutation.error) : null };
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.logout);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/sign-out');
    },
    // Clear the local session and navigate away regardless of whether the
    // network call succeeded (offline, expired token, ...).
    onSettled: () => {
      // `'user'` : la garde n'ajoutera pas de `returnTo`. Se déconnecter depuis
      // Réglages puis se reconnecter et retomber sur Réglages n'a aucun sens —
      // la personne venait justement de partir.
      clearAuth('user');
      // Vider TOUT le cache, pas seulement `['me']`.
      //
      // Sans cela, le compte suivant héritait des données du précédent : nom
      // et email venaient du magasin d'authentification, donc justes, mais
      // casquettes, commandes, favoris et conversations venaient du cache,
      // donc faux. Sur un téléphone partagé, c'est une fuite de données, pas
      // un défaut d'affichage.
      queryClient.clear();
      // Le panier est persisté sur l'appareil : sans ce vidage, le compte
      // suivant retrouverait les articles du précédent, prêts à être
      // commandés à son nom.
      useCartStore.getState().clear();
      // AUCUNE navigation ici, volontairement. Vider le magasin suffit : la
      // garde de `(app)/_layout.tsx` s'en rend compte au re-rendu et redirige.
      // Naviguer en plus ferait partir deux actions vers la même destination,
      // et la seconde échouerait en « GO_BACK not handled ».
    },
  });

  return { ...mutation, errorMessage: mutation.error ? getAuthErrorMessage(mutation.error) : null };
}
