import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

export type PluginID = 'large-art' | 'lyrics' | 'graph-view' | 'genre-explorer' | 'timeline-view' | 'tag-editor';

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
        'graph-view': false,
        'genre-explorer': false,
        'timeline-view': false,
        'tag-editor': true,
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
        
      isPluginActive: (id) => {
        const plugins = get().activePlugins;
        if (id === 'tag-editor') {
          return plugins['tag-editor'] ?? true;
        }
        if (id === 'large-art') {
          return plugins['large-art'] ?? true;
        }
        if (id === 'graph-view') {
          return plugins['graph-view'] ?? false;
        }
        return !!plugins[id];
      },
      
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
      onRehydrateStorage: () => (state) => {
        if (state && state.activePlugins) {
          if (state.activePlugins['tag-editor'] === undefined) {
            state.activePlugins['tag-editor'] = true;
          }
          // Si el usuario tenía activo el plugin anterior de grafo (que antes usaba la clave genre-explorer), migrar a graph-view
          if (state.activePlugins['graph-view'] === undefined && (state.activePlugins as any)['genre-explorer'] !== undefined) {
            state.activePlugins['graph-view'] = (state.activePlugins as any)['genre-explorer'];
            state.activePlugins['genre-explorer'] = false;
          }
        }
      },
    }
  )
);