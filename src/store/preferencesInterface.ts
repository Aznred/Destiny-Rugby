import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Petit stockage indépendant : couper le son ne réécrit pas toute la carrière.
export const usePreferencesInterface = create<{
  musique: boolean;
  animationsMenus: boolean;
  setMusique: (active: boolean) => void;
  setAnimationsMenus: (active: boolean) => void;
}>()(persist((set) => ({
  musique: true,
  animationsMenus: false,
  setMusique: (musique) => set({ musique }),
  setAnimationsMenus: (animationsMenus) => set({ animationsMenus }),
}), { name: 'destiny-preferences-interface' }));
