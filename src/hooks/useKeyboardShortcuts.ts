import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useUIStore } from '../store/uiStore';

export function useKeyboardShortcuts() {
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);

  const isCommandPaletteOpen = useUIStore((s) => s.isCommandPaletteOpen);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);
  const isQueueOpen = useUIStore((s) => s.isQueueOpen);
  const toggleQueue = useUIStore((s) => s.toggleQueue);
  const closeQueue = useUIStore((s) => s.closeQueue);
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const isLargeArtOpen = useUIStore((s) => s.isLargeArtOpen);
  const closeLargeArt = useUIStore((s) => s.closeLargeArt);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Manejo de Escape siempre disponible, incluso dentro de inputs
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          e.preventDefault();
          closeCommandPalette();
          return;
        }
        if (isQueueOpen) {
          e.preventDefault();
          closeQueue();
          return;
        }
        if (isSettingsOpen) {
          e.preventDefault();
          closeSettings();
          return;
        }
        if (isLargeArtOpen) {
          e.preventDefault();
          closeLargeArt();
          return;
        }
      }

      // Si el usuario está escribiendo en un input o textarea, no interceptar atajos comunes
      // salvo Ctrl+K / Cmd+K para abrir/cerrar la paleta de comandos
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (isEditable) return;

      // Atajo '/' para abrir la paleta rápidamente
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Espacio: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Siguiente canción: Ctrl+Right o Shift+N
      if (((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') || (e.shiftKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        playNext();
        return;
      }

      // Canción anterior: Ctrl+Left o Shift+P
      if (((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') || (e.shiftKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        playPrev();
        return;
      }

      // Subir volumen: Ctrl+Up
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume(Math.min(100, volume + 5));
        return;
      }

      // Bajar volumen: Ctrl+Down
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume(Math.max(0, volume - 5));
        return;
      }

      // Abrir/cerrar cola: Ctrl+Q
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        toggleQueue();
        return;
      }

      // Alternar aleatorio: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleShuffle();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    volume,
    isCommandPaletteOpen,
    isQueueOpen,
    isSettingsOpen,
    isLargeArtOpen,
    togglePlay,
    playNext,
    playPrev,
    setVolume,
    toggleShuffle,
    toggleCommandPalette,
    closeCommandPalette,
    toggleQueue,
    closeQueue,
    closeSettings,
    closeLargeArt,
  ]);
}

