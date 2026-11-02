import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Stockage du jeton de session, adapté à la plateforme.
 *
 * `expo-secure-store` s'appuie sur le trousseau iOS et le Keystore Android :
 * il n'a tout simplement PAS d'implémentation web, et
 * `setValueWithKeyAsync is not a function` interrompt la connexion dès le
 * navigateur. C'est là que se fait le développement quotidien, donc le défaut
 * bloquait tout test d'un écran authentifié.
 *
 * Sur le web, le repli est `localStorage`. Il n'offre aucune des garanties du
 * trousseau — un script tiers injecté dans la page y accède — mais le
 * navigateur ne propose rien de mieux pour un jeton qui doit survivre à un
 * rechargement, et l'alternative (redemander le mot de passe à chaque F5)
 * n'est pas tenable. Le vrai cloisonnement reste sur mobile, qui est la
 * cible de production.
 */
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      // `localStorage` lève dans un contexte sans DOM (rendu serveur d'Expo
      // Router) et en navigation privée sur certains navigateurs.
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // Quota plein ou stockage refusé : la session reste valable en
        // mémoire pour cet onglet, elle ne survivra simplement pas au
        // rechargement. Faire échouer la connexion serait pire.
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // Rien à faire : l'état en mémoire a déjà été vidé par l'appelant.
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
