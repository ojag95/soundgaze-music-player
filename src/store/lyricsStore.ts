import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { LyricLine, parseLRC } from '../utils/lrcParser';

interface LyricsStore {
  lines: LyricLine[];
  isLoading: boolean;
  error: string | null;
  lastFetchedPath: string | null;
  fetchLyrics: (artist: string, trackTitle: string, trackPath: string, localLyrics?: string) => Promise<void>;
  clearLyrics: () => void;
}

export const useLyricsStore = create<LyricsStore>((set, get) => ({
  lines: [],
  isLoading: false,
  error: null,
  lastFetchedPath: null,

  fetchLyrics: async (artist, trackTitle, trackPath, localLyrics) => {
    if (get().lastFetchedPath === trackPath && (get().lines.length > 0 || get().isLoading)) {
      return;
    }

    set({ isLoading: true, error: null, lines: [], lastFetchedPath: trackPath });
    console.log(`[Lyrics] Iniciando búsqueda para: "${artist} - ${trackTitle}"`);

    try {
      if (localLyrics && localLyrics.trim().length > 0) {
        console.log("[Lyrics] Letra local detectada en los metadatos de la pista.");
        set({ lines: parseLRC(localLyrics), isLoading: false });
        return;
      }

      if (trackPath) {
        try {
          console.log(`[Lyrics] Buscando archivo .lrc en el disco para: ${trackPath}`);
          const lrcContent: string = await invoke('read_local_lyrics', { audioPath: trackPath });
          
          console.log("[Lyrics] ¡Archivo .lrc encontrado y leído con éxito!");
          set({ lines: parseLRC(lrcContent), isLoading: false });
          return;
        } catch (localErr) {
          console.log("[Lyrics] No hay archivo .lrc local, pasando a LRCLIB...");
        }
      }

      const cleanTitle = trackTitle.replace(/\(.*?\)|\[.*?\]/g, '').trim();
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error del servidor LRCLIB: código ${response.status}`);
      }

      const data = await response.json();
      console.log("[Lyrics] JSON recibido correctamente de LRCLIB");

      if (data.syncedLyrics) {
        set({ lines: parseLRC(data.syncedLyrics), isLoading: false });
      } else if (data.plainLyrics) {
        const plainLines = data.plainLyrics.split('\n').map((text: string) => ({ time: -1, text }));
        set({ lines: plainLines, isLoading: false });
      } else {
        throw new Error('Respuesta válida pero vacía.');
      }

    } catch (err) {
      console.warn("[Lyrics] Fallo en la obtención:", err);
      set({ error: 'Letras no disponibles', isLoading: false });
    }
  },

  clearLyrics: () => set({ lines: [], error: null, isLoading: false, lastFetchedPath: null }),
}));