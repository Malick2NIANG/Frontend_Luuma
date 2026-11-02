import { create } from 'zustand';
import { secureStorage } from '@/lib/secureStorage';
import type { User } from '@/types/api.types';

const AUTH_STORAGE_KEY = 'luum_auth';

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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  isGuest: false,
  sessionEndReason: null,

  continueAsGuest: () => set({ isGuest: true }),

  setAuth: (user, token) => {
    // L'état mémoire est posé d'abord, et l'écriture disque ne peut plus
    // faire échouer la connexion : `void` laissait remonter le rejet en
    // « Uncaught Error » et interrompait la navigation post-connexion.
    // La raison est effacée à l'entrée, pas à la sortie : elle ne doit valoir
    // que pour la redirection qui suit immédiatement la fin d'une session.
    set({ user, token, isGuest: false, sessionEndReason: null });
    const payload: StoredAuth = { user, token };
    secureStorage
      .setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
      .catch(() => {
        // Session utilisable pour cette exécution ; elle ne survivra pas au
        // redémarrage. Rien à annoncer : l'utilisateur est bien connecté.
      });
  },

  logout: (reason = 'user') => {
    set({ user: null, token: null, isGuest: false, sessionEndReason: reason });
    secureStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {
      // Idem : l'état mémoire est déjà vidé, la déconnexion a eu lieu.
    });
  },

  hydrate: async () => {
    try {
      const raw = await secureStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredAuth;
        set({ user: stored.user, token: stored.token, isHydrated: true });
        return;
      }
    } catch {
      // Corrupted or unavailable secure storage: continue with a clean session.
    }
    set({ isHydrated: true });
  },
}));
