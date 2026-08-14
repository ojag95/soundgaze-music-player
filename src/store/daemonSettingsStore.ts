import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { idbStorage } from './idbStorage';

interface DaemonSettingsState {
  host: string;
  port: string;
  password: string;
  isTesting: boolean;
  connectionStatus: 'idle' | 'success' | 'error';
  
  setSettings: (host: string, port: string, password: string) => void;
  testAndSaveConnection: (host: string, port: string, password: string) => Promise<void>;
}

export const useDaemonSettingsStore = create<DaemonSettingsState>()(
  persist(
    (set) => ({
      host: '127.0.0.1',
      port: '6600',
      password: '',
      isTesting: false,
      connectionStatus: 'idle',

      setSettings: (host, port, password) => set({ host, port, password, connectionStatus: 'idle' }),

      testAndSaveConnection: async (host, port, password) => {
        set({ isTesting: true, connectionStatus: 'idle' });
        try {
          await invoke('mpd_test_connection', { host, port, password });
          set({ host, port, password, connectionStatus: 'success', isTesting: false });
          await invoke('mpd_update_global_config', { host, port, password });
        } catch (error) {
          console.error(error);
          set({ connectionStatus: 'error', isTesting: false });
        }
      },
    }),
    {
      name: 'daemon-settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        host: state.host,
        port: state.port,
        password: state.password,
      }),
    }
  )
);