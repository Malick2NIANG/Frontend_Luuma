import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import type { Message, MessageType } from '@/types/api.types';

export type ChatMessage = Message & {
  sender: { id: string; name: string; avatar: string | null };
  /** URL d'écoute temporaire, présente pour les vocaux et pièces jointes. */
  playbackUrl?: string;
};

export interface SendMessageInput {
  type?: MessageType;
  content?: string;
  fileKey?: string;
  duration?: number;
}

/** Résout la conversation attachée à une commande. */
export function useOrderChat(orderId: string | undefined) {
  return useQuery({
    queryKey: ['chat', 'order', orderId],
    enabled: Boolean(orderId),
    queryFn: async () => {
      const { data } = await api.get<{ chatId: string; unread: number }>(
        `/api/chat/order/${orderId}`,
      );
      return data;
    },
  });
}

/**
 * Fil de discussion temps réel.
 *
 * L'historique passe par HTTP (affichage immédiat, cache possible) et les
 * nouveaux messages par WebSocket. Les deux alimentent le même état local,
 * ce qui évite d'avoir à réconcilier deux sources à l'affichage.
 */
export function useChatMessages(chatId: string | undefined) {
  const { socket, connected, emit } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // --- Historique ---------------------------------------------------------
  useEffect(() => {
    if (!chatId) return;

    let cancelled = false;
    setIsLoading(true);

    api
      .get<ChatMessage[]>(`/api/chat/${chatId}/messages`, {
        params: { limit: 50 },
      })
      .then(({ data }) => {
        if (!cancelled) setMessages(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatId]);

  // --- Temps réel ---------------------------------------------------------
  useEffect(() => {
    if (!chatId || !connected) return;

    emit('chat:join', { chatId });

    const onMessage = (message: ChatMessage) => {
      if (message.chatId !== chatId) return;
      setMessages((current) =>
        // Le serveur rediffuse à tout le salon, expéditeur compris : sans ce
        // filtre, l'auteur verrait son propre message en double.
        current.some((m) => m.id === message.id) ? current : [...current, message],
      );
    };

    const onTyping = (payload: {
      chatId: string;
      userId: string;
      isTyping: boolean;
      isRecording: boolean;
    }) => {
      if (payload.chatId !== chatId) return;
      setTypingUsers((current) => ({
        ...current,
        [payload.userId]: payload.isTyping || payload.isRecording,
      }));
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
      emit('chat:leave', { chatId });
    };
  }, [chatId, connected, socket, emit]);

  const send = useCallback(
    async (input: SendMessageInput) => {
      if (!chatId) return;

      // Repli HTTP quand la WebSocket est coupée — courant sur réseau
      // instable. Le backend rediffuse alors lui-même aux autres participants.
      if (!connected) {
        const { data } = await api.post<ChatMessage>(
          `/api/chat/${chatId}/messages`,
          input,
        );
        setMessages((current) =>
          current.some((m) => m.id === data.id) ? current : [...current, data],
        );
        return;
      }

      emit('chat:send', { chatId, ...input });
    },
    [chatId, connected, emit],
  );

  const setTyping = useCallback(
    (isTyping: boolean, isRecording = false) => {
      if (!chatId || !connected) return;
      emit('chat:typing', { chatId, isTyping, isRecording });
    },
    [chatId, connected, emit],
  );

  const markAsRead = useCallback(() => {
    if (!chatId) return;
    void api.patch(`/api/chat/${chatId}/read`);
  }, [chatId]);

  return {
    messages,
    isLoading,
    connected,
    someoneTyping: Object.values(typingUsers).some(Boolean),
    send,
    setTyping,
    markAsRead,
  };
}
