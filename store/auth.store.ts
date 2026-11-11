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
  /*
   * `isGuest` a été SUPPRIMÉ, et son absence dit la nouvelle règle.
   *
   * Il distinguait « visiteur autorisé » de « personne non connectée », parce
   * que l'application s'ouvrait sur la connexion et que la visite était une
   * dérogation à demander. Luuma est une place de marché : on y entre comme
   * dans une boutique, le catalogue est ouvert, et le compte n'est réclamé
   * qu'au moment de payer.
   *
   * Il n'y a donc plus deux états à distinguer, mais un seul fait : il y a un
   * jeton, ou il n'y en a pas. Garder un drapeau pour redire ce que `token`
   * dit déjà aurait laissé deux sources désaccordables.
   */
  /** `null` tant qu'aucune session ne s'est terminée dans cette exécution. */
  sessionEndReason: SessionEndReason | null;
  setAuth: (user: User, token: string) => void;
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
  sessionEndReason: null,

  setAuth: (user, token) => {
    // L'état mémoire est posé d'abord, et l'écriture disque ne peut plus
    // faire échouer la connexion : `void` laissait remonter le rejet en
    // « Uncaught Error » et interrompait la navigation post-connexion.
    // La raison est effacée à l'entrée, pas à la sortie : elle ne doit valoir
    // que pour la redirection qui suit immédiatement la fin d'une session.
    set({
      user,
      token,
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

  /**
   * La session part ; le RÉGLAGE biométrique reste.
   *
   * Il était effacé avec elle, obligeant à réactiver l'empreinte après chaque
   * déconnexion — ce que ne fait aucune application. Le réglage dit « cet
   * appareil peut déverrouiller par empreinte », pas « cette session-ci » :
   * il survit donc à la déconnexion, comme le choix de langue.
   *
   * Le jeton, lui, est bien détruit : sans lui, l'empreinte ne déverrouille
   * rien. `hasSavedSession` repasse à faux, ce qui masque le bouton jusqu'à
   * la prochaine connexion.
   */
  logout: (reason = 'user') => {
    set({
      user: null,
      token: null,
      hasSavedSession: false,
      sessionEndReason: reason,
    });
    secureStorage.removeItem(AUTH_STORAGE_KEY).catch((error: unknown) => {
      console.error('Unable to clear the saved authentication session:', error);
    });
  },

  /**
   * Restaure la session au démarrage.
   *
   * `isHydrated` est posé AVANT la demande biométrique, et c'est tout
   * l'intérêt : l'écran de lancement attend ce drapeau pour s'effacer.
   * Tant que la vérification se faisait d'abord, quelqu'un qui ignorait le
   * prompt d'empreinte — ou dont le capteur ne répondait pas — restait sur
   * l'écran de bienvenue, sans bouton, sans explication, indéfiniment.
   *
   * Désormais l'application s'ouvre sur la connexion pendant que le système
   * demande l'empreinte. Si elle est validée, la session se pose et la garde
   * emmène au fil ; sinon on reste sur un écran utilisable, où le bouton
   * d'empreinte permet de réessayer.
   */
  hydrate: async () => {
    try {
      const [raw, biometricFlag, promptedFlag] = await Promise.all([
        secureStorage.getItem(AUTH_STORAGE_KEY),
        secureStorage.getItem(BIOMETRIC_ENABLED_KEY),
        secureStorage.getItem(BIOMETRIC_PROMPTED_KEY),
      ]);
      const biometricEnabled = biometricFlag === 'true';
      const needsBiometrics =
        Boolean(raw) && biometricEnabled && Platform.OS !== 'web';

      set({
        hasSavedSession: Boolean(raw),
        biometricEnabled,
        biometricPrompted: promptedFlag === 'true',
        // L'application est utilisable immédiatement. Sans session restaurée,
        // la garde affiche la connexion — jamais un écran figé.
        isHydrated: true,
      });

      if (!raw) return;

      const stored = JSON.parse(raw) as StoredAuth;

      if (needsBiometrics) {
        const result = await authenticateForSession();
        if (result !== 'success') return;
      }

      set({ user: stored.user, token: stored.token });
      return;
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
