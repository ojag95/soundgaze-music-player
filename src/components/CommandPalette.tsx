import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Music,
  User,
  Library,
  Waypoints,
  Timeline,
  Tags,
  Settings,
  ListMusic,
  Sun,
  Moon,
  Shuffle,
  RefreshCw,
  List,
  Command,
  FileEdit,
} from "lucide-react";
import { useUIStore } from "../store/uiStore";
import { usePlayerStore, TrackData } from "../store/playerStore";
import { useThemeStore } from "../store/themeStore";
import { useLibrarySettingsStore } from "../store/librarySettingsStore";
import { usePluginStore } from "../store/pluginStore";

interface PaletteItem {
  id: string;
  category: "action" | "track" | "artist" | "album" | "playlist";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  onSelect: () => void;
}

export default function CommandPalette() {
  const { isCommandPaletteOpen, closeCommandPalette, openSettings, toggleQueue, openTagEditor } = useUIStore();
  const {
    libraryTree,
    artists,
    playlists,
    playSpecific,
    selectArtist,
    selectAlbum,
    selectPlaylist,
    toggleShuffle,
    isShuffle,
    currentTrack,
  } = usePlayerStore();
  const { isDark, setBaseTheme } = useThemeStore();
  const { scanDatabase } = useLibrarySettingsStore();
  const { isPluginActive } = usePluginStore();

  const navigate = useNavigate();
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isCommandPaletteOpen]);

  const allTracks = useMemo(() => {
    const list: TrackData[] = [];
    for (const artist of Object.keys(libraryTree)) {
      const albums = libraryTree[artist];
      for (const album of Object.keys(albums)) {
        list.push(...albums[album]);
      }
    }
    return list;
  }, [libraryTree]);

  const actions: PaletteItem[] = useMemo(() => {
    const isGraphActive = isPluginActive("graph-view");
    const isGenresActive = isPluginActive("genre-explorer");
    const isTimelineActive = isPluginActive("timeline-view");

    const items: PaletteItem[] = [
      {
        id: "action-library",
        category: "action",
        title: t("commandPalette.goToLibrary", "Ir a la Biblioteca"),
        subtitle: t("common.yourLibrary", "Tu biblioteca"),
        icon: <Library size={18} className="text-brand-primary" />,
        badge: "/",
        onSelect: () => {
          navigate("/");
          closeCommandPalette();
        },
      },
    ];

    if (isGraphActive) {
      items.push({
        id: "action-graph",
        category: "action",
        title: t("commandPalette.goToGraph", "Ir a la Vista Gráfica"),
        subtitle: t("commandPalette.goToGraphDesc", "Explora la biblioteca mediante un grafo"),
        icon: <Waypoints size={18} className="text-brand-primary" />,
        onSelect: () => {
          navigate("/graphical-view");
          closeCommandPalette();
        },
      });
    }

    if (isGenresActive) {
      items.push({
        id: "action-genres",
        category: "action",
        title: t("commandPalette.goToGenres", "Ir al Explorador de Géneros"),
        subtitle: t("commandPalette.goToGenresDesc", "Explora la biblioteca agrupada por géneros musicales"),
        icon: <Tags size={18} className="text-brand-primary" />,
        onSelect: () => {
          navigate("/genres");
          closeCommandPalette();
        },
      });
    }

    if (isTimelineActive) {
      items.push({
        id: "action-timeline",
        category: "action",
        title: t("commandPalette.goToTimeline", "Ir a la Línea de Tiempo"),
        subtitle: t("commandPalette.goToTimelineDesc", "Explora álbumes ordenados por año y década"),
        icon: <Timeline size={18} className="text-brand-primary" />,
        onSelect: () => {
          navigate("/timeline-view");
          closeCommandPalette();
        },
      });
    }

    items.push(
      {
        id: "action-queue",
        category: "action",
        title: t("commandPalette.toggleQueue", "Abrir / Cerrar Cola de Reproducción"),
        subtitle: t("common.queue", "Cola de Reproducción"),
        icon: <ListMusic size={18} className="text-brand-primary" />,
        badge: "Ctrl+Q",
        onSelect: () => {
          toggleQueue();
          closeCommandPalette();
        },
      },
      {
        id: "action-settings",
        category: "action",
        title: t("commandPalette.openSettings", "Abrir Ajustes"),
        subtitle: t("common.settings", "Ajustes"),
        icon: <Settings size={18} className="text-brand-primary" />,
        onSelect: () => {
          openSettings();
          closeCommandPalette();
        },
      },
      {
        id: "action-theme",
        category: "action",
        title: t("commandPalette.toggleTheme", "Cambiar Tema (Claro / Oscuro)"),
        subtitle: isDark
          ? t("commandPalette.switchToLight", "Cambiar a modo claro")
          : t("commandPalette.switchToDark", "Cambiar a modo oscuro"),
        icon: isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />,
        onSelect: () => {
          setBaseTheme(isDark ? "light" : "dark");
          closeCommandPalette();
        },
      },
      {
        id: "action-shuffle",
        category: "action",
        title: t("commandPalette.toggleShuffle", "Alternar Modo Aleatorio"),
        subtitle: isShuffle
          ? t("commandPalette.disableShuffle", "Desactivar reproducción aleatoria")
          : t("commandPalette.enableShuffle", "Activar reproducción aleatoria"),
        icon: <Shuffle size={18} className={isShuffle ? "text-brand-primary" : "text-muted"} />,
        badge: "Ctrl+S",
        onSelect: () => {
          toggleShuffle();
          closeCommandPalette();
        },
      },
      {
        id: "action-scan",
        category: "action",
        title: t("commandPalette.scanLibrary", "Escanear Biblioteca MPD"),
        subtitle: t("commandPalette.scanLibraryDesc", "Actualizar base de datos con nuevos archivos de música"),
        icon: <RefreshCw size={18} className="text-brand-primary" />,
        onSelect: () => {
          scanDatabase();
          closeCommandPalette();
        },
      }
    );

    if (currentTrack && isPluginActive("tag-editor")) {
      items.push({
        id: "action-edit-current-track-tags",
        category: "action",
        title: t("plugins.tagEditor.editCurrentTrack", "Editar etiquetas de la canción actual"),
        subtitle: `${currentTrack.title} — ${currentTrack.artist}`,
        icon: <FileEdit size={18} className="text-brand-primary" />,
        onSelect: () => {
          openTagEditor(currentTrack.path);
          closeCommandPalette();
        },
      });
    }

    return items;
  }, [
    isPluginActive,
    isDark,
    isShuffle,
    currentTrack,
    openTagEditor,
    t,
    navigate,
    closeCommandPalette,
    toggleQueue,
    openSettings,
    setBaseTheme,
    toggleShuffle,
    scanDatabase,
  ]);

  const filteredItems = useMemo(() => {
    const clean = query.trim().toLowerCase();

    if (!clean) {
      return actions;
    }

    const results: PaletteItem[] = [];

    const matchedActions = actions.filter(
      (a) => a.title.toLowerCase().includes(clean) || (a.subtitle && a.subtitle.toLowerCase().includes(clean))
    );
    results.push(...matchedActions);

    const playlistNames = Object.keys(playlists);
    for (const pl of playlistNames) {
      if (pl.toLowerCase().includes(clean)) {
        results.push({
          id: `pl-${pl}`,
          category: "playlist",
          title: pl,
          subtitle: t("common.songCount", { query: playlists[pl]?.length || 0 }),
          icon: <List size={18} className="text-sky-400" />,
          onSelect: () => {
            selectPlaylist(pl);
            navigate("/playlists");
            closeCommandPalette();
          },
        });
      }
    }

    for (const artist of artists) {
      if (artist.toLowerCase().includes(clean)) {
        results.push({
          id: `artist-${artist}`,
          category: "artist",
          title: artist,
          subtitle: t("common.artist", "Artista"),
          icon: <User size={18} className="text-purple-400" />,
          onSelect: () => {
            selectArtist(artist);
            selectAlbum(null);
            navigate("/");
            closeCommandPalette();
          },
        });
      }
    }

    let trackCount = 0;
    for (const track of allTracks) {
      if (trackCount >= 20) break;
      const matchTitle = track.title?.toLowerCase().includes(clean);
      const matchArtist = track.artist?.toLowerCase().includes(clean);
      const matchAlbum = track.album?.toLowerCase().includes(clean);

      if (matchTitle || matchArtist || matchAlbum) {
        results.push({
          id: `track-${track.path}`,
          category: "track",
          title: track.title,
          subtitle: `${track.artist} • ${track.album}`,
          icon: <Music size={18} className="text-emerald-400" />,
          badge: track.time,
          onSelect: () => {
            playSpecific(track.path);
            closeCommandPalette();
          },
        });
        trackCount++;
      }
    }

    return results;
  }, [
    query,
    actions,
    playlists,
    artists,
    allTracks,
    t,
    selectPlaylist,
    navigate,
    closeCommandPalette,
    selectArtist,
    selectAlbum,
    playSpecific,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeCommandPalette();
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-4 animate-in fade-in duration-150"
      onClick={closeCommandPalette}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-divider rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-divider bg-surface">
          <Search size={20} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(
              "commandPalette.placeholder",
              "Buscar canciones, artistas, álbumes o comandos..."
            )}
            className="flex-1 bg-transparent text-content placeholder:text-muted/60 text-base focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-xs bg-background rounded-md border border-divider text-muted font-mono select-none">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <Search size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {t("commandPalette.noResults", "No se encontraron resultados para \"{{query}}\"", {
                  query,
                })}
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => item.onSelect()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-brand-primary text-white shadow-sm"
                      : "text-content hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-background/80 border border-divider text-muted"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      {item.subtitle && (
                        <div
                          className={`text-xs truncate ${
                            isSelected ? "text-white/80" : "text-muted"
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-mono shrink-0 ${
                        isSelected
                          ? "bg-white/25 text-white"
                          : "bg-background border border-divider text-muted"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2.5 bg-background/50 border-t border-divider flex items-center justify-between text-xs text-muted select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-divider font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-divider font-mono">↓</kbd>
              <span>{t("commandPalette.hintNavigate", "Navegar")}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-divider font-mono">↵</kbd>
              <span>{t("commandPalette.hintSelect", "Seleccionar")}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Command size={13} className="opacity-70" />
            <span>Soundgaze Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}

