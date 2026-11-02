import axios from 'axios';
import { BASE_URL } from '@/constants/api';
import { useAuthStore } from '@/store/auth.store';

interface WrappedResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

function isWrappedResponse(payload: unknown): payload is WrappedResponse<unknown> {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    'data' in payload &&
    'timestamp' in payload
  );
}

export const api = axios.create({
  baseURL: BASE_URL,
  // Sans délai maximal, axios attend indéfiniment : un serveur injoignable
  // laisserait l'écran sur son indicateur de chargement, sans jamais montrer
  // d'erreur ni de bouton « Réessayer ». 15 s reste confortable sur un réseau
  // lent tout en rendant la panne visible.
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (isWrappedResponse(response.data)) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Vide le magasin, et RIEN D'AUTRE : pas de navigation ici.
      //
      // C'est le point de départ le plus déroutant du système, parce qu'il
      // s'exécute depuis un callback réseau et jamais depuis un appui. La
      // garde de `(app)/_layout.tsx` observe le magasin et redirige seule ;
      // ajouter une navigation ici en ferait partir deux.
      //
      // Le cache des requêtes n'est pas vidé ici non plus : un 401 peut être
      // transitoire, et effacer les données de l'écran en cours sur un
      // hoquet réseau serait pire que le mal. La déconnexion explicite, elle,
      // le vide (voir `useLogout`).
      // `'expired'` : personne n'a rien demandé. C'est ce qui autorise la garde
      // à mémoriser l'écran en cours et à y ramener après reconnexion.
      useAuthStore.getState().logout('expired');
    }
    return Promise.reject(error);
  },
);
