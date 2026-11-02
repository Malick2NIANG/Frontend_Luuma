import { io, Socket } from 'socket.io-client';
import { WS_URL } from '@/constants/api';
import { useAuthStore } from '@/store/auth.store';

// La passerelle NestJS déclare `namespace: '/chat'`. Se connecter à la racine
// ouvrirait bien une WebSocket, mais sur un namespace où aucun gestionnaire
// n'écoute : les messages partiraient dans le vide, sans erreur visible.
export const socket: Socket = io(`${WS_URL}/chat`, {
  autoConnect: false,
  transports: ['websocket'],
});

export function connectSocket(token: string) {
  socket.auth = { token };
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}

useAuthStore.subscribe((state, prevState) => {
  if (state.token && state.token !== prevState.token) {
    connectSocket(state.token);
  } else if (!state.token && prevState.token) {
    disconnectSocket();
  }
});
