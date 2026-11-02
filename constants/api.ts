import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configurable : le port par défaut se retrouve occupé dès qu'un autre projet
// tourne sur la même machine, et le coder en dur oblige alors à éditer le code
// plutôt qu'un fichier d'environnement.
const API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? 3000);

function getDevServerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  return host && host.length > 0 ? host : null;
}

function resolveBaseUrl(): string {
  // Sur le web, l'API se trouve forcément sur l'hôte qui sert la page : le
  // navigateur et le serveur Metro tournent sur la même machine. Passer ici
  // AVANT la variable d'environnement évite l'écueil classique en dev — une
  // IP LAN figée dans .env pour tester au téléphone, puis devenue injoignable
  // depuis le navigateur quand le réseau change.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }

  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // Un appareil physique ne peut pas joindre `localhost` : ce serait lui-même.
  // On déduit l'IP LAN de la machine depuis l'hôte du serveur Metro.
  const lanHost = getDevServerHost();
  if (lanHost) return `http://${lanHost}:${API_PORT}`;

  return `http://localhost:${API_PORT}`;
}

export const BASE_URL = resolveBaseUrl();
export const WS_URL = BASE_URL;
