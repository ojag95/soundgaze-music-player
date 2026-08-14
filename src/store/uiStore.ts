import { create } from 'zustand';

interface UIState {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  isLargeArtOpen: boolean;
  openLargeArt: () => void;
  closeLargeArt: () => void;
  mainViewMode: 'list' | 'graph'; 
  setMainViewMode: (mode: 'list' | 'graph') => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  isLargeArtOpen: false,
  openLargeArt: () => set({ isLargeArtOpen: true }),
  closeLargeArt: () => set({ isLargeArtOpen: false }),
  mainViewMode: 'list',
  setMainViewMode: (mode) => set({ mainViewMode: mode }),
}));
