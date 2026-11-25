import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';

/**
 * Sur le web, pas de sondage de connectivité.
 *
 * NetInfo vérifie la connexion en interrogeant le serveur (une requête HEAD)
 * toutes les quelques secondes — des centaines de requêtes par session,
 * relancées en rafale dès qu'une réponse tarde. Le navigateur sait déjà s'il
 * est en ligne (`navigator.onLine` et les événements online/offline), et c'est
 * ce que NetInfo utilise une fois le sondage coupé.
 */
if (Platform.OS === 'web') {
  NetInfo.configure({ reachabilityShouldRun: () => false });
}

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected ?? false);
  });
});
