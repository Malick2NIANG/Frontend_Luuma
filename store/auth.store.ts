import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '@/lib/secureStorage';
import type { User } from '@/types/api.types';

const AUTH_STORAGE_KEY = 'luum_auth';
const BIOMETRIC_ENABLED_KEY = 'luum_biometric_enabled';
const BIOMETRIC_PROMPTED_KEY = 'luum_biometric_prompted';
const LANGUAGE_STORAGE_KEY = 'luum_language';

export type BiometricUnlockResult =
  | 'success'
  | 'cancelled'
  | 'unavailable'
  | 'failed';

interface StoredAuth {
  user: User;
  token: string;
}

/**
 * Pourquoi la session s'est terminée.
 *
 * `'user'` : déconnexion demandée. `'expired'` : jeton refusé par le serveur
 * (401), sans que personne n'ait rien demandé.
 *
 * La distinction n'est pas cosmétique — elle décide de la destination après la
 * reconnexion. Quelqu'un dont la session tombe au panier doit y revenir ;
 * quelqu'un qui se déconnecte depuis Réglages ne veut sûrement pas y retomber,
 * il vient précisément de quitter.
 */
export type SessionEndReason = 'user' | 'expired';

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  hasSavedSession: boolean;
  biometricEnabled: boolean;
  biometricPrompted: boolean;
  /**
   * Visite sans compte, explicitement demandée depuis l'écran de connexion.
   *
   * Volontairement NON persistée : elle ne vaut que pour la session en cours.
   * L'enregistrer reviendrait à faire de la visite l'état par défaut, alors
   * que l'application doit rouvrir sur la connexion — c'est tout l'objet de
   * la garde. Rien ici n'autorise la moindre action : le jeton reste absent,
   * donc tout appel authentifié échoue et `useRequireAuth` renvoie au login.
   */
  isGuest: boolean;
  /** `null` tant qu'aucune session ne s'est terminée dans cette exécution. */
  sessionEndReason: SessionEndReason | null;
  setAuth: (user: User, token: string) => void;
  continueAsGuest: () => void;
  logout: (reason?: SessionEndReason) => void;
  hydrate: () => Promise<void>;
  unlockWithBiometrics: () => Promise<BiometricUnlockResult>;
  enableBiometrics: () => Promise<BiometricUnlockResult>;
  markBiometricPrompted: () => Promise<void>;
}

async function authenticateForSession(): Promise<BiometricUnlockResult> {
  if (Platform.OS === 'web') return 'unavailable';

  try {
    const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:
        language === 'en' ? 'Unlock Luuma' : 'Déverrouiller Luuma',
      cancelLabel: language === 'en' ? 'Cancel' : 'Annuler',
    });
    if (result.success) return 'success';
    if (
      result.error === 'user_cancel' ||
      result.error === 'system_cancel' ||
      result.error === 'app_cancel'
    ) {
      return 'cancelled';
    }
    return 'failed';
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    return 'failed';
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  hasSavedSession: false,
  biometricEnabled: false,
  biometricPrompted: false,
  isGuest: false,
  sessionEndReason: null,

  continueAsGuest: () => set({ isGuest: true }),

  setAuth: (user, token) => {
    // L'état mémoire est posé d'abord, et l'écriture disque ne peut plus
    // faire échouer la connexion : `void` laissait remonter le rejet en
    // « Uncaught Error » et interrompait la navigation post-connexion.
    // La raison est effacée à l'entrée, pas à la sortie : elle ne doit valoir
    // que pour la redirection qui suit immédiatement la fin d'une session.
    set({
      user,
      token,
      isGuest: false,
      hasSavedSession: true,
      sessionEndReason: null,
    });
    const payload: StoredAuth = { user, token };
    secureStorage
      .setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
      .catch((error: unknown) => {
        // Session utilisable pour cette exécution ; elle ne survivra pas au
        // redémarrage. Rien à annoncer : l'utilisateur est bien connecté.
        console.error('Unable to persist the authenticated session:', error);
      });
  },

  logout: (reason = 'user') => {
    set({
      user: null,
      token: null,
      isGuest: false,
      hasSavedSession: false,
      biometricEnabled: false,
      biometricPrompted: false,
      sessionEndReason: reason,
    });
    Promise.all([
      secureStorage.removeItem(AUTH_STORAGE_KEY),
      secureStorage.removeItem(BIOMETRIC_ENABLED_KEY),
      secureStorage.removeItem(BIOMETRIC_PROMPTED_KEY),
    ]).catch((error: unknown) => {
      console.error('Unable to clear the saved authentication settings:', error);
    });
  },

  hydrate: async () => {
    try {
      const [raw, biometricFlag, promptedFlag] = await Promise.all([
        secureStorage.getItem(AUTH_STORAGE_KEY),
        secureStorage.getItem(BIOMETRIC_ENABLED_KEY),
        secureStorage.getItem(BIOMETRIC_PROMPTED_KEY),
      ]);
      const biometricEnabled = biometricFlag === 'true';
      set({
        hasSavedSession: Boolean(raw),
        biometricEnabled,
        biometricPrompted: promptedFlag === 'true',
      });

      if (raw) {
        const stored = JSON.parse(raw) as StoredAuth;
        if (biometricEnabled && Platform.OS !== 'web') {
          const result = await authenticateForSession();
          if (result !== 'success') {
            set({ isHydrated: true });
            return;
          }
        }
        set({
          user: stored.user,
          token: stored.token,
          isHydrated: true,
        });
        return;
      }
    } catch (error) {
      console.error('Unable to restore the saved authentication session:', error);
    }
    set({ isHydrated: true });
  },

  unlockWithBiometrics: async () => {
    try {
      const raw = await secureStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        set({ hasSavedSession: false });
        return 'failed';
      }

      const result = await authenticateForSession();
      if (result !== 'success') return result;

      const stored = JSON.parse(raw) as StoredAuth;
      set({
        user: stored.user,
        token: stored.token,
        hasSavedSession: true,
        isHydrated: true,
        isGuest: false,
      });
      return 'success';
    } catch (error) {
      console.error('Unable to unlock the saved authentication session:', error);
      return 'failed';
    }
  },

  enableBiometrics: async () => {
    if (Platform.OS === 'web') return 'unavailable';

    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !isEnrolled) return 'unavailable';

      const result = await authenticateForSession();
      if (result !== 'success') return result;

      await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      set({ biometricEnabled: true });
      return 'success';
    } catch (error) {
      console.error('Unable to enable biometric authentication:', error);
      return 'failed';
    }
  },

  markBiometricPrompted: async () => {
    try {
      await secureStorage.setItem(BIOMETRIC_PROMPTED_KEY, 'true');
      set({ biometricPrompted: true });
    } catch (error) {
      console.error('Unable to save the biometric prompt preference:', error);
    }
  },
}));
