import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { usePlayerStore, TrackData } from './playerStore';
import { idbStorage } from './idbStorage';

interface LibrarySettingsState {
  basePath: string;
  coverCacheBuster: number;
  isScanning: boolean;
  visibleColumns: {
    album: boolean;
    genre: boolean;
    date: boolean;
    time: boolean;
  };
  hasSeenOnboarding: boolean;

  toggleColumn: (column: keyof LibrarySettingsState['visibleColumns']) => void;
  selectDirectory: () => Promise<void>;
  scanDatabase: () => Promise<void>;
  clearCoverCache: () => void;
  setHasSeenOnboarding: (val: boolean) => void;
}

export const useLibrarySettingsStore = create<LibrarySettingsState>()(
  persist(
    (set) => ({
      basePath: '',
      coverCacheBuster: Date.now(),
      isScanning: false,
      visibleColumns: {
        album: true,
        genre: false,
        date: false,
        time: true,
      },
      hasSeenOnboarding: false,

      setHasSeenOnboarding: (val) => set({ hasSeenOnboarding: val }),

      selectDirectory: async () => {
        try {
          const selectedPath = await open({
            directory: true,
            multiple: false,
            title: 'Selecciona tu nueva carpeta de música'
          });

          if (selectedPath && typeof selectedPath === 'string') {
            set({ basePath: selectedPath });
            
            await invoke('mpd_set_music_directory', { newPath: selectedPath });
            
            const updatedTracks: TrackData[] = await invoke('mpd_get_library');
            usePlayerStore.getState().setLibrary(updatedTracks);
            
            set({ coverCacheBuster: Date.now() });
          }
        } catch (error) {
          console.error("Error al configurar la nueva ruta:", error);
          alert("Hubo un error al reconfigurar MPD.");
        }
      },

      scanDatabase: async () => {
        set({ isScanning: true });
        try {
          await invoke('mpd_update_db');
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          const updatedTracks: TrackData[] = await invoke('mpd_get_library');
          usePlayerStore.getState().setLibrary(updatedTracks);
          
          set({ coverCacheBuster: Date.now() });
        } catch (error) {
          console.error("Error al escanear la base de datos:", error);
        } finally {
          set({ isScanning: false });
        }
      },

      clearCoverCache: () => {
        set({ coverCacheBuster: Date.now() });
      },

      toggleColumn: (column) =>
        set((state) => ({
          visibleColumns: {
            ...state.visibleColumns,
            [column]: !state.visibleColumns[column],
          },
        })),
    }),
    {
      name: 'library-settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        basePath: state.basePath,
        coverCacheBuster: state.coverCacheBuster,
        visibleColumns: state.visibleColumns,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
    }
  )
);