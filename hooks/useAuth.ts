import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';
import { BASE_URL } from '@/constants/api';
import { api } from '@/lib/api';
import { useAppLanguage } from '@/lib/appLanguage';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import type { User } from '@/types/api.types';

// better-auth's own response shape for its user object: canonical field is
// `image` (mapped to the `avatar` column server-side), and it doesn't
// include `phoneVerified` or `roles` — those aren't part of its schema.
interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
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

const ERROR_MESSAGES: Record<string, [string, string]> = {
  INVALID_EMAIL_OR_PASSWORD: [
    'Email ou mot de passe incorrect.',
    'Incorrect email or password.',
  ],
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: [
    'Un compte existe déjà avec cet email.',
    'An account already exists with this email.',
  ],
  MISSING_FIELD: [
    'Merci de renseigner tous les champs obligatoires.',
    'Please fill in all required fields.',
  ],
  PASSWORD_TOO_SHORT: [
    'Le mot de passe est trop court (8 caractères minimum).',
    'Password is too short (minimum 8 characters).',
  ],
  PASSWORD_TOO_LONG: [
    'Le mot de passe est trop long.',
    'Password is too long.',
  ],
  VALIDATION_ERROR: [
    'Merci de vérifier les informations saisies.',
    'Please check the information you entered.',
  ],
};

const FALLBACK_ERROR_MESSAGE = [
  'Une erreur est survenue. Veuillez réessayer.',
  'Something went wrong. Please try again.',
] as const;
const NETWORK_ERROR_MESSAGE = [
  'Impossible de contacter le serveur. Vérifiez votre connexion.',
  'Unable to reach the server. Check your connection.',
] as const;

function getAuthErrorMessage(
  error: unknown,
  t: (french: string, english: string) => string,
): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return t(NETWORK_ERROR_MESSAGE[0], NETWORK_ERROR_MESSAGE[1]);
    }

    const body = error.response.data as BetterAuthErrorBody | undefined;
    if (body?.code && body.code in ERROR_MESSAGES) {
      const [french, english] = ERROR_MESSAGES[body.code];
      return t(french, english);
    }
  }
  return t(FALLBACK_ERROR_MESSAGE[0], FALLBACK_ERROR_MESSAGE[1]);
}

const DEFAULT_DESTINATION = '/(app)/(tabs)' as const;

function offerBiometricSetup(
  t: (french: string, english: string) => string,
): void {
  if (Platform.OS === 'web') return;

  const { biometricEnabled, biometricPrompted, enableBiometrics, markBiometricPrompted } =
    useAuthStore.getState();
  if (biometricEnabled || biometricPrompted) return;

  void Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ])
    .then(([hasHardware, isEnrolled]) => {
      if (!hasHardware || !isEnrolled) return;

      void markBiometricPrompted();
      Alert.alert(
        t('Déverrouillez Luuma plus rapidement', 'Unlock Luuma faster'),
        t(
          'Utilisez Face ID, votre empreinte ou le code de votre appareil pour retrouver votre session.',
          'Use Face ID, your fingerprint, or your device passcode to access your saved session.',
        ),
        [
          {
            text: t('Plus tard', 'Not now'),
            style: 'cancel',
          },
          {
            text: t('Activer', 'Enable'),
            onPress: () => {
              void enableBiometrics().then((result) => {
                if (result === 'failed') {
                  Alert.alert(
                    t('Activation impossible', 'Could not enable biometrics'),
                    t(
                      'Réessayez depuis votre appareil.',
                      'Please try again on your device.',
                    ),
                  );
                }
              });
            },
          },
        ],
      );
    })
    .catch((error: unknown) => {
      console.error('Unable to check biometric availability:', error);
      Alert.alert(
        t('Vérification impossible', 'Could not check availability'),
        t(
          'La connexion biométrique n’a pas pu être vérifiée.',
          'Biometric sign-in could not be checked.',
        ),
      );
    });
}

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

  return {
    user,
    token,
    isHydrated,
    /**
     * La seule question qui vaille. Son contraire — ne pas être authentifié —
     * désigne désormais un visiteur en train de parcourir le catalogue, ce
     * qui est un état normal et non une anomalie. `isGuest` disait la même
     * chose avec un second drapeau, qu'il fallait tenir d'accord avec
     * celui-ci.
     *
     * À consulter pour décider de l'AFFICHAGE. Jamais pour autoriser une
     * action : c'est le serveur qui tranche, toujours.
     */
    isAuthenticated: Boolean(token),
  };
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useAppLanguage();
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
      offerBiometricSetup(t);
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getAuthErrorMessage(mutation.error, t) : null,
  };
}

export function useRegister() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useAppLanguage();
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
      offerBiometricSetup(t);
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getAuthErrorMessage(mutation.error, t) : null,
  };
}

// --- Connexion Google ---------------------------------------------------------

interface SessionResponse {
  user: AuthUser;
  session: { token: string };
}

/**
 * Extrait le jeton de session du cookie renvoyé dans l'adresse de retour.
 *
 * Expression régulière plutôt que `new URL()` : l'implémentation de `URL` de
 * React Native ne gère pas `searchParams` sur toutes les versions.
 */
export function jetonDepuisRetour(url: string): string | null {
  const brut = /[?&]cookie=([^&#]+)/.exec(url)?.[1];
  if (!brut) return null;
  const cookie = decodeURIComponent(brut);
  const valeur = /(?:^|[\s,;])(?:__Secure-)?better-auth\.session_token=([^;,\s]+)/.exec(cookie)?.[1];
  return valeur ? decodeURIComponent(valeur) : null;
}

/** Lit la session pour un jeton donné — `null` si le serveur ne la reconnaît pas. */
export async function sessionPourJeton(
  token: string | null,
): Promise<SessionResponse | null> {
  const { data } = await api.get<SessionResponse | null>('/api/auth/get-session', {
    // Sur le web, sans jeton : c'est le cookie posé par le retour Google qui
    // identifie la session.
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    withCredentials: true,
  });
  return data?.user ? data : null;
}

/**
 * « Continuer avec Google ».
 *
 * WEB : redirection classique. Google renvoie vers /auth/google, qui lit la
 * session posée en cookie et la convertit en jeton (voir app/auth/google.tsx).
 *
 * TÉLÉPHONE : le parcours s'ouvre dans un navigateur d'authentification. Le
 * serveur ajoute le cookie de session à l'adresse de retour `luuma://…`
 * (plugin `expo` de better-auth), d'où on extrait le jeton.
 *
 * Dans les deux cas, on finit exactement comme une connexion par mot de
 * passe : jeton enregistré, cache vidé, proposition de la biométrie.
 */
export function useGoogleSignIn() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { t } = useAppLanguage();
  const destination = usePostAuthDestination();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messageErreur = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        return t(NETWORK_ERROR_MESSAGE[0], NETWORK_ERROR_MESSAGE[1]);
      }
      // Fournisseur absent : GOOGLE_CLIENT_ID n'est pas renseigné côté API.
      if (error.response.status === 404 || error.response.status === 400) {
        return t(
          "La connexion Google n'est pas encore disponible.",
          'Google sign-in is not available yet.',
        );
      }
    }
    return t(
      'La connexion Google a échoué. Réessayez.',
      'Google sign-in failed. Please try again.',
    );
  };

  const start = async () => {
    setErrorMessage(null);
    setPending(true);
    try {
      if (Platform.OS === 'web') {
        const retour = `${window.location.origin}/auth/google?returnTo=${encodeURIComponent(String(destination))}`;
        const { data } = await api.post<{ url: string }>(
          '/api/auth/sign-in/social',
          {
            provider: 'google',
            callbackURL: retour,
            errorCallbackURL: retour,
            disableRedirect: true,
          },
          { withCredentials: true },
        );
        window.location.assign(data.url);
        return;
      }

      const retour = Linking.createURL('auth/google');
      const { data } = await api.post<{ url: string }>(
        '/api/auth/sign-in/social',
        { provider: 'google', callbackURL: retour, disableRedirect: true },
        // Une application native n'envoie pas d'en-tête Origin : le plugin
        // `expo` du serveur lit celui-ci à la place pour vérifier l'appelant.
        { headers: { 'expo-origin': Linking.createURL('') } },
      );

      // Le relais pose le cookie d'état dans le navigateur d'authentification
      // avant de partir chez Google : sans lui, le retour serait refusé.
      const relais = `${BASE_URL}/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(data.url)}`;
      const result = await WebBrowser.openAuthSessionAsync(relais, retour);
      if (result.type !== 'success') return; // abandon : rien à signaler

      const token = jetonDepuisRetour(result.url);
      const session = token ? await sessionPourJeton(token) : null;
      if (!token || !session) throw new Error('Session Google introuvable');

      queryClient.clear();
      setAuth(toUser(session.user), token);
      router.replace(destination);
      offerBiometricSetup(t);
    } catch (error) {
      setErrorMessage(messageErreur(error));
    } finally {
      setPending(false);
    }
  };

  return { start, pending, errorMessage };
}

/**
 * Termine une connexion Google sur le web, au retour de Google.
 * Exposé pour app/auth/google.tsx.
 */
export function useFinishGoogleWebSignIn() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return async (): Promise<boolean> => {
    const session = await sessionPourJeton(null);
    if (!session) return false;
    queryClient.clear();
    setAuth(toUser(session.user), session.session.token);
    return true;
  };
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.logout);
  const { t } = useAppLanguage();

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

      /**
       * Retour au FIL, pas au formulaire de connexion.
       *
       * Se déconnecter ne fait plus sortir de l'application : on redevient
       * visiteur, et un visiteur a sa place sur le catalogue. Renvoyer au
       * formulaire reviendrait à dire « vous n'avez plus rien à faire ici »,
       * ce qui est faux depuis que la boutique est ouverte à tous.
       *
       * C'est `useLogout` qui navigue, et lui seul : la garde du groupe ne
       * redirige plus, et `useRequireAuth` se tait quand il voit une
       * déconnexion volontaire. Un seul acteur, donc pas de navigations
       * concurrentes — c'était la cause des « GO_BACK not handled ».
       */
      router.replace('/(app)/(tabs)');
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getAuthErrorMessage(mutation.error, t) : null,
  };
}
