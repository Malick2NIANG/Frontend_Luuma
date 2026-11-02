/** Miroir de ChatService.listConversations. */

import type { ChatKind } from './api.types';

export interface ConversationParticipant {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Conversation {
  id: string;
  kind: ChatKind;
  orderId: string | null;
  /**
   * L'enseigne ou le nom de l'interlocuteur, ou « Commande #XXXXXX » pour un
   * fil de commande.
   */
  title: string;
  avatar: string | null;
  /**
   * Casquette de l'interlocuteur.
   *
   * `null` pour une conversation de commande — plusieurs rôles autour de la
   * table — et pour un client, qui n'en a aucun à afficher.
   */
  counterpartRole: 'merchant' | 'gp' | null;
  participants: ConversationParticipant[];
  lastMessage: {
    /** Déjà résumé par le serveur : « Message vocal · 0:12 », « Photo »… */
    preview: string;
    isMine: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}
