import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { idbStorage } from './idbStorage';

interface SystemSettingsState {
  minimizeToTray: boolean;
  toggleMinimizeToTray: () => void;
  init: () => void;
}

export const useSystemSettingsStore = create<SystemSettingsState>()(
  persist(
    (set, get) => ({
      minimizeToTray: false,

      toggleMinimizeToTray: async () => {
        const newValue = !get().minimizeToTray;
        set({ minimizeToTray: newValue });
        
        try {
          await invoke('update_minimize_to_tray', { minimize: newValue });
        } catch (error) {
          console.error("Error al actualizar ajuste de ventana:", error);
        }
      },

      init: async () => {
        try {
          await invoke('update_minimize_to_tray', { minimize: get().minimizeToTray });
        } catch (error) {
          console.error("Error al sincronizar ajustes iniciales:", error);
        }
      }
    }),
    {
      name: 'system-settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        minimizeToTray: state.minimizeToTray,
      }),
    }
  )
);