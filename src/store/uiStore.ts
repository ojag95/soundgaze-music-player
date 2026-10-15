import { create } from 'zustand';

interface UIState {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  isLargeArtOpen: boolean;
  openLargeArt: () => void;
  closeLargeArt: () => void;

  isCommandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  isQueueOpen: boolean;
  openQueue: () => void;
  closeQueue: () => void;
  toggleQueue: () => void;
  setIsQueueOpen: (open: boolean) => void;

  mainViewMode: 'list' | 'graph'; 
  setMainViewMode: (mode: 'list' | 'graph') => void;

  tagEditorTrackPath: string | null;
  openTagEditor: (trackPath: string) => void;
  closeTagEditor: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSettingsOpen: false,
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  isLargeArtOpen: false,
  openLargeArt: () => set({ isLargeArtOpen: true }),
  closeLargeArt: () => set({ isLargeArtOpen: false }),

  isCommandPaletteOpen: false,
  openCommandPalette: () => set({ isCommandPaletteOpen: true }),
  closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

  isQueueOpen: false,
  openQueue: () => set({ isQueueOpen: true }),
  closeQueue: () => set({ isQueueOpen: false }),
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setIsQueueOpen: (open) => set({ isQueueOpen: open }),

  mainViewMode: 'list',
  setMainViewMode: (mode) => set({ mainViewMode: mode }),

  tagEditorTrackPath: null,
  openTagEditor: (trackPath) => set({ tagEditorTrackPath: trackPath }),
  closeTagEditor: () => set({ tagEditorTrackPath: null }),
}));
