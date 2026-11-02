/** Miroir de StoriesService (Backend/src/stories/stories.service.ts). */

import type { RoleType, StoryMediaType } from './api.types';

export interface StoryAuthor {
  id: string;
  name: string;
  avatar: string | null;
}

export interface Story {
  id: string;
  authorId: string;
  /** Sous quelle casquette la story est publiée : MERCHANT ou GP. */
  authorRole: RoleType;
  mediaType: StoryMediaType;
  mediaKey: string | null;
  /** URL publique déjà résolue par le serveur. Nulle pour une story texte. */
  mediaUrl: string | null;
  text: string | null;
  background: string | null;
  tripId: string | null;
  productId: string | null;
  createdAt: string;
  expiresAt: string;
  author: StoryAuthor;
  seen: boolean;
}

/** Un anneau du bandeau : toutes les stories encore vivantes d'un compte. */
export interface StoryGroup {
  author: StoryAuthor;
  authorRole: RoleType;
  stories: Story[];
  hasUnseen: boolean;
  latestAt: string;
}

export interface MyStory extends Omit<Story, 'seen'> {
  viewCount: number;
}
