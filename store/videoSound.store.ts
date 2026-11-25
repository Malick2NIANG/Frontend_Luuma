import { create } from 'zustand';

/**
 * Le son des vidéos, réglé une fois pour toutes les vidéos de la session.
 *
 * Comme sur Instagram : une vidéo démarre sans le son ; si la personne
 * l'active, les vidéos suivantes démarrent avec. Le réglage n'est pas
 * conservé d'une ouverture à l'autre — rouvrir l'application dans un bus et
 * tomber sur une vidéo à plein volume est exactement ce qu'on veut éviter.
 */
interface VideoSoundState {
  muted: boolean;
  toggle: () => void;
  setMuted: (muted: boolean) => void;
}

export const useVideoSound = create<VideoSoundState>((set) => ({
  muted: true,
  toggle: () => set((state) => ({ muted: !state.muted })),
  setMuted: (muted) => set({ muted }),
}));
