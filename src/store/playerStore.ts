import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { idbStorage } from './idbStorage';

export interface TrackData {
  path: string;
  title: string;
  artist: string;
  album: string;
  time: string;
  genre?: string;
  date?: string;
  trackNumber?: string;
  lyrics?: string;
}

export type LibraryTree = Record<string, Record<string, TrackData[]>>;

interface PlayerState {
  state: 'Play' | 'Pause' | 'Stop' | 'Unknown';
  elapsedSecs: number;
  totalSecs: number;
  currentTrack: TrackData | null;
  volume: number;
  setVolume: (vol: number) => Promise<void>;

  libraryTree: LibraryTree;
  artists: string[];
  selectedArtist: string | null;
  selectedAlbum: string | null;
  currentViewTracks: TrackData[];

  favorites: string[];
  isFavoritesView: boolean;

  setLibrary: (tracks: TrackData[]) => void;
  selectArtist: (artist: string | null) => void;
  selectAlbum: (album: string | null) => void;

  toggleFavorite: (path: string) => void;
  selectFavorites: () => void;

  fetchState: () => Promise<void>;
  togglePlay: () => Promise<void>;
  playSpecific: (path: string, tracksContext?: TrackData[]) => Promise<void>;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  queue: TrackData[];
  fetchQueue: () => Promise<void>;
  reorderQueue: (startIndex: number, endIndex: number) => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  playlists: Record<string, string[]>;
  selectedPlaylist: string | null;
  addToPlaylist: (playlistName: string, path: string) => void;
  selectPlaylist: (name: string | null) => void;
  restoreLibraryView: () => void;
  removeTrackFromPlaylist: (playlistName: string, path: string) => void;
  deletePlaylist: (playlistName: string) => void;
  seekTo: (seconds: number) => Promise<void>;
  lastUpdateTimestamp: number;
  getRealElapsedTime: () => number;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      state: 'Unknown',
      elapsedSecs: 0,
      totalSecs: 0,
      currentTrack: null,

      libraryTree: {},
      artists: [],
      selectedArtist: null,
      selectedAlbum: null,
      currentViewTracks: [],

      favorites: [],
      isFavoritesView: false,
      volume: 100,
      queue: [],
      playlists: {},
      selectedPlaylist: null,
      lastUpdateTimestamp: Date.now(),

      setLibrary: (tracks) => {
        const tree: LibraryTree = {};
        tracks.forEach((track) => {
          const art = track.artist || 'Desconocido';
          const alb = track.album || 'Desconocido';
          if (!tree[art]) tree[art] = {};
          if (!tree[art][alb]) tree[art][alb] = [];
          tree[art][alb].push(track);
        });

        const sortedArtists = Object.keys(tree).sort((a, b) => a.localeCompare(b));

        const { isFavoritesView, selectedPlaylist, selectedArtist, selectedAlbum, favorites, playlists } = get();

        let viewTracks = tracks;

        if (isFavoritesView) {
          viewTracks = tracks.filter(t => favorites.includes(t.path));
        } else if (selectedPlaylist) {
          const playlistPaths = playlists[selectedPlaylist] || [];
          viewTracks = tracks.filter(t => playlistPaths.includes(t.path));
        } else if (selectedArtist) {
          viewTracks = Object.values(tree[selectedArtist] || {}).flat();
          if (selectedAlbum) {
            viewTracks = tree[selectedArtist][selectedAlbum] || [];
          }
        }

        set({
          libraryTree: tree,
          artists: sortedArtists,
          currentViewTracks: viewTracks
        });
      },

      restoreLibraryView: () => {
        const { libraryTree, selectedArtist, selectedAlbum } = get();
        let tracks = Object.values(libraryTree).flatMap(albums => Object.values(albums).flat());

        if (selectedArtist) {
          tracks = Object.values(libraryTree[selectedArtist] || {}).flat();
          if (selectedAlbum) {
            tracks = libraryTree[selectedArtist]?.[selectedAlbum] || [];
          }
        }

        set({
          isFavoritesView: false,
          selectedPlaylist: null,
          currentViewTracks: tracks
        });
      },

      selectArtist: (artist) => {
        const { libraryTree } = get();
        if (!artist) {
          const allTracks = Object.values(libraryTree).flatMap(albums => Object.values(albums).flat());
          set({ selectedArtist: null, selectedAlbum: null, isFavoritesView: false, currentViewTracks: allTracks, selectedPlaylist: null });
          return;
        }
        const artistTracks = Object.values(libraryTree[artist] || {}).flat();
        set({ selectedArtist: artist, selectedAlbum: null, isFavoritesView: false, currentViewTracks: artistTracks, selectedPlaylist: null });
      },

      selectAlbum: (album) => {
        const { libraryTree, selectedArtist } = get();
        if (!selectedArtist) return;
        if (!album) {
          const artistTracks = Object.values(libraryTree[selectedArtist] || {}).flat();
          set({ selectedAlbum: null, isFavoritesView: false, currentViewTracks: artistTracks, selectedPlaylist: null });
          return;
        }
        const albumTracks = libraryTree[selectedArtist]?.[album] || [];
        set({ selectedAlbum: album, isFavoritesView: false, currentViewTracks: albumTracks, selectedPlaylist: null });
      },

      toggleFavorite: (path) => {
        const { favorites, isFavoritesView, libraryTree } = get();
        const isFav = favorites.includes(path);

        const newFavorites = isFav
          ? favorites.filter(p => p !== path)
          : [...favorites, path];

        set({ favorites: newFavorites });

        if (isFavoritesView) {
          const allTracks = Object.values(libraryTree).flatMap(albums => Object.values(albums).flat());
          const favTracks = allTracks.filter(t => newFavorites.includes(t.path));
          set({ currentViewTracks: favTracks });
        }
      },

      selectFavorites: () => {
        const { libraryTree, favorites } = get();
        const allTracks = Object.values(libraryTree).flatMap(albums => Object.values(albums).flat());
        const favTracks = allTracks.filter(t => favorites.includes(t.path));

        set({
          selectedArtist: null,
          selectedAlbum: null,
          isFavoritesView: true,
          currentViewTracks: favTracks,
          selectedPlaylist: null
        });
      },

      addToPlaylist: (playlistName, path) => {
        const { playlists } = get();
        const currentList = playlists[playlistName] || [];

        if (!currentList.includes(path)) {
          set({
            playlists: {
              ...playlists,
              [playlistName]: [...currentList, path]
            }
          });
        }
      },

      selectPlaylist: (name) => {
        const { libraryTree, playlists } = get();
        if (!name) return;

        const allTracks = Object.values(libraryTree).flatMap(albums => Object.values(albums).flat());
        const playlistPaths = playlists[name] || [];
        const tracks = allTracks.filter(t => playlistPaths.includes(t.path));

        set({
          selectedArtist: null,
          selectedAlbum: null,
          isFavoritesView: false,
          selectedPlaylist: name,
          currentViewTracks: tracks
        });
      },

      removeTrackFromPlaylist: (playlistName, path) => {
        const { playlists, selectedPlaylist, currentViewTracks } = get();
        const currentList = playlists[playlistName] || [];
        const updatedList = currentList.filter(p => p !== path);

        set({
          playlists: { ...playlists, [playlistName]: updatedList },
          currentViewTracks: selectedPlaylist === playlistName
            ? currentViewTracks.filter(t => t.path !== path)
            : currentViewTracks
        });
      },

      deletePlaylist: (playlistName) => {
        const { playlists, selectedPlaylist } = get();
        const newPlaylists = { ...playlists };
        delete newPlaylists[playlistName];

        set({ playlists: newPlaylists });

        if (selectedPlaylist === playlistName) {
          get().selectFavorites();
        }
      },

      fetchState: async () => {
        try {
          const payload: any = await invoke('mpd_get_current_state');
          set({
            state: payload.state,
            elapsedSecs: payload.elapsed_secs,
            totalSecs: payload.total_secs,
            currentTrack: payload.current_track,
          });
        } catch (error) {
          console.error(error);
        }
      },

      togglePlay: async () => {
        try {
          await invoke('mpd_toggle_play');
          get().fetchState();
        } catch (error) {
          console.error(error);
        }
      },

      playSpecific: async (path, tracksContext) => {
        try {
          let pathsToPlay = [path];

          if (tracksContext && tracksContext.length > 0) {
            const startIndex = tracksContext.findIndex(t => t.path === path);

            if (startIndex !== -1) {
              pathsToPlay = tracksContext.slice(startIndex, startIndex + 200).map(t => t.path);
            }
          }

          await invoke('mpd_play_context', { paths: pathsToPlay });
        } catch (error) {
          console.error(error);
        }
      },

      playNext: async () => {
        try {
          await invoke('mpd_next');
        } catch (error) {
          console.error("Error al saltar a la siguiente pista", error);
        }
      },

      playPrev: async () => {
        try {
          await invoke('mpd_prev');
        } catch (error) {
          console.error("Error al volver a la pista anterior", error);
        }
      },

      setVolume: async (vol: number) => {
        try {
          set({ volume: vol });
          await invoke('mpd_set_volume', { volume: vol });
        } catch (error) {
          console.error("Error al ajustar volumen", error);
        }
      },

      fetchQueue: async () => {
        try {
          const queueData: TrackData[] = await invoke('mpd_get_queue');
          set({ queue: queueData });
        } catch (error) {
          console.error("Error al obtener la cola de reproducción", error);
        }
      },

      reorderQueue: async (startIndex: number, endIndex: number) => {
        const { queue } = get();
        const newQueue = Array.from(queue);
        const [movedTrack] = newQueue.splice(startIndex, 1);
        newQueue.splice(endIndex, 0, movedTrack);

        set({ queue: newQueue });

        try {
          await invoke('mpd_move_track', { from: startIndex, to: endIndex });
        } catch (error) {
          console.error("Error al mover la pista en MPD", error);
          get().fetchQueue();
        }
      },

      playFromQueue: async (index: number) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return;

        const pathsToPlay = queue.slice(index, index + 200).map(t => t.path);

        try {
          await invoke('mpd_play_context', { paths: pathsToPlay });
          get().fetchQueue();
        } catch (error) {
          console.error("Error al reproducir desde la cola", error);
        }
      },

      seekTo: async (seconds: number) => {
        try {
          set({ elapsedSecs: seconds, lastUpdateTimestamp: Date.now() }); 
          await invoke('mpd_seek', { seconds });
        } catch (error) {
          console.error("Error al adelantar la canción:", error);
        }
      },
      getRealElapsedTime: () => {
        const { state, elapsedSecs, lastUpdateTimestamp, totalSecs } = get();
        if (state === 'Play') {
          const diffSecs = Math.floor((Date.now() - lastUpdateTimestamp) / 1000);
          return Math.min(elapsedSecs + diffSecs, totalSecs);
        }
        return elapsedSecs;
      },

    }),
    {
      name: 'soundgaze-player-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        libraryTree: state.libraryTree,
        artists: state.artists,
        favorites: state.favorites,
        volume: state.volume,
        playlists: state.playlists
      }),
    }
  )
);