import { useCallback, useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

type SocketPayload = Record<string, unknown> | undefined;

export function useSocket() {
  // Connect/disconnect on auth state changes is already wired globally in
  // @/lib/socket (subscribed to the auth store), so this hook only needs to
  // observe connection state and expose typed helpers.
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  const on = useCallback(<T extends SocketPayload>(event: string, handler: (payload: T) => void) => {
    const listener = (payload: T) => handler(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, []);

  const emit = useCallback(<T extends SocketPayload>(event: string, payload?: T) => {
    socket.emit(event, payload);
  }, []);

  return { socket, connected, on, emit };
}
