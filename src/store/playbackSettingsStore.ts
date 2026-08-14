import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { idbStorage } from './idbStorage';

interface PlaybackSettingsState {
  crossfade: number;
  normalizeVolume: boolean;
  resumeOnStartup: boolean;
  outputDevice: string;
  
  setCrossfade: (seconds: number) => Promise<void>;
  toggleNormalizeVolume: () => Promise<void>;
  toggleResumeOnStartup: () => void;
  setOutputDevice: (deviceId: string) => Promise<void>;
}

export const usePlaybackSettingsStore = create<PlaybackSettingsState>()(
  persist(
    (set, get) => ({
      crossfade: 0,
      normalizeVolume: false,
      resumeOnStartup: true,
      outputDevice: 'default',

      setCrossfade: async (seconds) => {
        set({ crossfade: seconds });
        try {
          await invoke('mpd_set_crossfade', { seconds });
        } catch (error) {
          console.error(error);
        }
      },

      toggleNormalizeVolume: async () => {
        const newValue = !get().normalizeVolume;
        set({ normalizeVolume: newValue });
        try {
          const mode = newValue ? 'track' : 'off';
          await invoke('mpd_set_replay_gain', { mode });
        } catch (error) {
          console.error(error);
        }
      },

      toggleResumeOnStartup: () => {
        set({ resumeOnStartup: !get().resumeOnStartup });
      },

      setOutputDevice: async (deviceId) => {
        set({ outputDevice: deviceId });
        try {
          await invoke('mpd_set_output', { deviceId });
        } catch (error) {
          console.error(error);
        }
      },
    }),
    {
      name: 'playback-settings',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        crossfade: state.crossfade,
        normalizeVolume: state.normalizeVolume,
        resumeOnStartup: state.resumeOnStartup,
        outputDevice: state.outputDevice,
      }),
    }
  )
);