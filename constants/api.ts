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

/** `localhost`, `127.0.0.1` ou `[::1]` — la page est servie par cette machine. */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

function resolveBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Image Docker : nginx relaie /api, /socket.io et /storage vers l'API et
    // MinIO, sur le même port que l'application. L'API est donc toujours à
    // l'adresse de la page — en local comme derrière un tunnel, où un seul
    // port forwardé suffit pour tester depuis un téléphone.
    if (process.env.EXPO_PUBLIC_API_SAME_ORIGIN === 'true') {
      return window.location.origin;
    }

    // Servie depuis cette machine : l'API est forcément sur le même hôte.
    // Déduire plutôt que lire la variable d'environnement évite l'écueil
    // classique en développement — une IP LAN figée dans .env pour tester au
    // téléphone, devenue injoignable depuis le navigateur quand le réseau
    // change.
    if (isLocalHost(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
    }

    // Servie depuis AILLEURS — un tunnel, un hébergement, une démo partagée.
    // La déduction ne vaut plus rien : un tunnel expose chaque port sur un
    // domaine distinct, donc l'API n'est jamais « le même hôte, port 3001 ».
    // La variable d'environnement redevient la seule source fiable.
    const webUrl = process.env.EXPO_PUBLIC_API_URL;
    if (webUrl) return webUrl;

    // Sans variable, on tente quand même l'hôte courant : mieux vaut une
    // erreur réseau explicite qu'une URL vide.
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
