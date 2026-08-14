import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

export type PluginID = 'large-art' | 'lyrics' | 'genre-explorer' | 'timeline-view';

export interface LargeArtSettings {
  backgroundType: 'cover' | 'solid' | 'gradient';
  enableBlur: boolean;
  enableAnimation: boolean;
  dynamicTheme: boolean;
}

export interface GraphViewSettings {
  showAlbumCovers: boolean;
}

interface PluginStore {
  activePlugins: Record<PluginID, boolean>;
  largeArtSettings: LargeArtSettings;
  graphViewSettings: GraphViewSettings;

  togglePlugin: (id: PluginID) => void;
  isPluginActive: (id: PluginID) => boolean;
  updateLargeArtSettings: (settings: Partial<LargeArtSettings>) => void;
  updateGraphViewSettings: (settings: Partial<GraphViewSettings>) => void;
}

export const usePluginStore = create<PluginStore>()(
  persist(
    (set, get) => ({
      activePlugins: {
        'large-art': true,
        'lyrics': false,
        'genre-explorer': false,
        'timeline-view': false,
      },
      largeArtSettings: {
        backgroundType: 'cover',
        enableBlur: true,
        enableAnimation: true,
        dynamicTheme: true,
      },
      graphViewSettings: {
        showAlbumCovers: true,
      },
      
      togglePlugin: (id) =>
        set((state) => ({
          activePlugins: {
            ...state.activePlugins,
            [id]: !state.activePlugins[id],
          },
        })),
        
      isPluginActive: (id) => !!get().activePlugins[id],
      
      updateLargeArtSettings: (settings) =>
        set((state) => ({
          largeArtSettings: { ...state.largeArtSettings, ...settings },
        })),
        
      updateGraphViewSettings: (settings) =>
        set((state) => ({
          graphViewSettings: { ...(state.graphViewSettings || { showAlbumCovers: true }), ...settings },
        })),
    }),
    { 
      name: 'soundgaze-plugins',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        activePlugins: state.activePlugins,
        largeArtSettings: state.largeArtSettings,
        graphViewSettings: state.graphViewSettings,
      }),
    }
  )
);