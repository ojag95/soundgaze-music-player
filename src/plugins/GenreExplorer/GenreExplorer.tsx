import React, { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { usePlayerStore, TrackData } from "../../store/playerStore";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";
import { shuffleArray } from "../../utils/playershuffle";
import { useTranslation } from "react-i18next";
import TrackRow from "../../components/shared/TrackRow";
import TableHeader from "../../components/shared/TableHeader";
import TrackDropdownMenu from "../../components/shared/TrackDropdownMenu";
import { useResponsiveSidebar } from "../../hooks/useResponsiveSidebar";
import {
  Tags,
  Play,
  Shuffle,
  ListPlus,
  ArrowLeft,
  Search,
  Disc3,
  Music,
  Check,
  Sparkles,
} from "lucide-react";

interface GenreAlbum {
  artist: string;
  album: string;
  coverPath: string;
  tracks: TrackData[];
}

interface GenreGroup {
  name: string;
  slug: string;
  tracks: TrackData[];
  albums: GenreAlbum[];
  artists: string[];
  covers: string[];
  gradient: string;
}

const GENRE_GRADIENTS: Record<string, string> = {
  rock: "from-rose-600 via-orange-600 to-amber-700",
  "hard rock": "from-red-700 via-stone-800 to-zinc-900",
  metal: "from-zinc-900 via-neutral-800 to-red-950",
  "heavy metal": "from-zinc-900 via-red-900 to-stone-900",
  pop: "from-pink-500 via-rose-500 to-purple-600",
  electronic: "from-cyan-500 via-blue-600 to-indigo-700",
  electro: "from-cyan-400 via-sky-600 to-blue-800",
  dance: "from-violet-600 via-fuchsia-600 to-pink-500",
  synthwave: "from-fuchsia-600 via-purple-600 to-cyan-500",
  retrowave: "from-pink-600 via-indigo-700 to-purple-900",
  jazz: "from-amber-700 via-amber-800 to-stone-900",
  blues: "from-blue-700 via-indigo-900 to-slate-900",
  classical: "from-emerald-700 via-teal-800 to-slate-900",
  soundtrack: "from-violet-700 via-purple-900 to-slate-900",
  ost: "from-purple-700 via-indigo-900 to-slate-900",
  hiphop: "from-amber-600 via-yellow-600 to-orange-700",
  "hip hop": "from-amber-600 via-yellow-600 to-orange-700",
  rap: "from-amber-600 via-red-600 to-zinc-800",
  indie: "from-teal-600 via-emerald-600 to-cyan-700",
  alternative: "from-orange-600 via-rose-600 to-purple-700",
  punk: "from-red-600 via-rose-700 to-neutral-900",
  folk: "from-amber-700 via-stone-700 to-yellow-800",
  ambient: "from-sky-700 via-indigo-800 to-slate-900",
  reggae: "from-green-600 via-yellow-500 to-red-600",
  disco: "from-fuchsia-500 via-pink-600 to-amber-500",
  latin: "from-orange-500 via-red-500 to-yellow-500",
  soul: "from-purple-700 via-pink-700 to-indigo-900",
  rb: "from-violet-700 via-purple-800 to-indigo-950",
  "r&b": "from-violet-700 via-purple-800 to-indigo-950",
  unknown: "from-slate-700 via-neutral-800 to-zinc-900",
};

const getGenreGradient = (genreName: string): string => {
  const normalized = genreName.toLowerCase().trim();
  if (GENRE_GRADIENTS[normalized]) return GENRE_GRADIENTS[normalized];

  const palettes = [
    "from-indigo-600 via-purple-600 to-pink-600",
    "from-cyan-600 via-teal-600 to-emerald-700",
    "from-rose-600 via-red-600 to-amber-600",
    "from-blue-600 via-indigo-700 to-purple-800",
    "from-fuchsia-600 via-pink-600 to-rose-700",
    "from-amber-600 via-orange-600 to-red-700",
    "from-emerald-600 via-teal-700 to-cyan-800",
    "from-violet-600 via-indigo-700 to-sky-700",
  ];

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
};

const LazyCover = React.memo(({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="w-full h-full flex items-center justify-center bg-surface/30 relative overflow-hidden">
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      ) : (
        <Disc3 size={20} className="text-muted/40" />
      )}
    </div>
  );
});

const GenreExplorer: React.FC = () => {
  const { genreId } = useParams<{ genreId?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const libraryTree = usePlayerStore((s) => s.libraryTree);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playTracks = usePlayerStore((s) => s.playTracks);
  const playSpecific = usePlayerStore((s) => s.playSpecific);
  const enqueueTracks = usePlayerStore((s) => s.enqueueTracks);
  const favorites = usePlayerStore((s) => s.favorites);
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);
  const playlists = usePlayerStore((s) => s.playlists);
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist);

  const basePath = useLibrarySettingsStore((s) => s.basePath);
  const coverCacheBuster = useLibrarySettingsStore((s) => s.coverCacheBuster);
  const visibleColumns = useLibrarySettingsStore((s) => s.visibleColumns);

  const { isMobile } = useResponsiveSidebar();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"count" | "name">("count");
  const [activeArtistFilter, setActiveArtistFilter] = useState<string | null>(null);
  const [genreTrackSearch, setGenreTrackSearch] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detailScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const gridTemplate = isMobile
    ? `auto minmax(0, 1fr) auto`
    : `
        auto 
        minmax(0, 2fr) 
        ${visibleColumns.album ? "minmax(0, 1fr)" : ""} 
        ${visibleColumns.genre ? "minmax(0, 1fr)" : ""} 
        ${visibleColumns.date ? "80px" : ""} 
        ${visibleColumns.time ? "120px" : "80px"}
      `
        .replace(/\s+/g, " ")
        .trim();

  useEffect(() => {
    setIsScrolled(false);
    setActiveDropdown(null);
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
  }, [genreId]);

  const handleDetailScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 180;
    if (scrolled !== isScrolled) {
      setIsScrolled(scrolled);
    }
    if (activeDropdown) {
      setActiveDropdown(null);
    }
  };

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2500);
  };

  const buildCoverUrl = (path: string) => {
    return `cover://localhost/?path=${encodeURIComponent(path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`;
  };

  const allGenres = useMemo(() => {
    const genreMap = new Map<string, {
      tracks: TrackData[];
      albumsMap: Map<string, GenreAlbum>;
      artistsSet: Set<string>;
      covers: Set<string>;
    }>();

    Object.entries(libraryTree).forEach(([artist, albums]) => {
      Object.entries(albums).forEach(([album, tracks]) => {
        tracks.forEach((track) => {
          const rawGenre = track.genre?.trim();
          const genreNames = rawGenre && rawGenre.length > 0
            ? rawGenre.split(/[,;/|]+/).map((g) => g.trim()).filter(Boolean)
            : [t("plugins.genreExplorer.unknownGenre", "Sin género")];

          genreNames.forEach((genreName) => {
            const normalizedKey = genreName.toLowerCase();
            let entry = genreMap.get(normalizedKey);
            if (!entry) {
              entry = {
                tracks: [],
                albumsMap: new Map(),
                artistsSet: new Set(),
                covers: new Set(),
              };
              genreMap.set(normalizedKey, entry);
            }

            entry.tracks.push(track);
            entry.artistsSet.add(artist);

            const albumKey = `${artist}---${album}`;
            let albumEntry = entry.albumsMap.get(albumKey);
            if (!albumEntry) {
              albumEntry = {
                artist,
                album,
                coverPath: track.path,
                tracks: [],
              };
              entry.albumsMap.set(albumKey, albumEntry);
            }
            albumEntry.tracks.push(track);

            if (entry.covers.size < 4) {
              entry.covers.add(track.path);
            }
          });
        });
      });
    });

    const result: GenreGroup[] = [];
    genreMap.forEach((data, normalizedKey) => {
      const displayName = data.tracks[0]?.genre?.trim()
        ? data.tracks[0].genre.split(/[,;/|]+/)[0].trim()
        : normalizedKey;

      result.push({
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        slug: encodeURIComponent(normalizedKey),
        tracks: data.tracks,
        albums: Array.from(data.albumsMap.values()),
        artists: Array.from(data.artistsSet).sort((a, b) => a.localeCompare(b)),
        covers: Array.from(data.covers),
        gradient: getGenreGradient(normalizedKey),
      });
    });

    return result;
  }, [libraryTree, t]);

  const selectedGenre = useMemo(() => {
    if (!genreId) return null;
    const decoded = decodeURIComponent(genreId).toLowerCase();
    return allGenres.find((g) => g.slug.toLowerCase() === decoded || g.name.toLowerCase() === decoded) || null;
  }, [allGenres, genreId]);

  const filteredGenres = useMemo(() => {
    let list = allGenres;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      if (sortBy === "count") return b.tracks.length - a.tracks.length;
      return a.name.localeCompare(b.name);
    });
  }, [allGenres, searchQuery, sortBy]);

  const selectedGenreTracks = useMemo(() => {
    if (!selectedGenre) return [];
    let list = selectedGenre.tracks;

    if (activeArtistFilter) {
      list = list.filter((t) => t.artist === activeArtistFilter);
    }

    if (genreTrackSearch.trim()) {
      const q = genreTrackSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      );
    }

    return list;
  }, [selectedGenre, activeArtistFilter, genreTrackSearch]);

  useEffect(() => {
    if (tableContainerRef.current) {
      setScrollMargin(tableContainerRef.current.offsetTop);
    }
  }, [selectedGenre, activeArtistFilter, genreTrackSearch, isScrolled]);

  const tracksVirtualizer = useVirtualizer({
    count: selectedGenreTracks.length,
    getScrollElement: () => detailScrollRef.current,
    estimateSize: () => 56,
    overscan: 10,
    scrollMargin,
  });

  const totalCatalogedSongs = useMemo(() => {
    return allGenres.reduce((acc, g) => acc + g.tracks.length, 0);
  }, [allGenres]);

  const handlePlayGenre = (e: React.MouseEvent, genre: GenreGroup, shuffle = false) => {
    e.stopPropagation();
    const tracksToPlay = shuffle ? shuffleArray(genre.tracks) : genre.tracks;
    if (tracksToPlay.length > 0) {
      playTracks(tracksToPlay);
    }
  };

  const handleEnqueueGenre = (e: React.MouseEvent, genre: GenreGroup) => {
    e.stopPropagation();
    if (genre.tracks.length > 0) {
      enqueueTracks(genre.tracks);
      showToast(
        t("plugins.genreExplorer.genreEnqueued", "{{count}} canciones de {{genre}} añadidas a la cola", {
          count: genre.tracks.length,
          genre: genre.name,
        })
      );
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-60px)] bg-background flex flex-col animate-in fade-in duration-300 overflow-hidden py-2 ">
      {toastMessage && (
        <div className="fixed bottom-28 right-8 z-50 bg-brand-primary text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {selectedGenre ? (
        <div
          ref={detailScrollRef}
          onScroll={handleDetailScroll}
          className="flex-1 flex flex-col overflow-y-auto custom-scrollbar relative px-4 md:px-8  pb-44 animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <button
            onClick={() => {
              setActiveArtistFilter(null);
              setGenreTrackSearch("");
              navigate("/genres");
            }}
            className="mt-4 md:mt-6 self-start flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-divider text-muted hover:text-content hover:border-brand-primary/50 text-xs font-semibold shadow-xs hover:shadow-sm active:scale-95 transition-all group cursor-pointer mb-3"
          >
            <ArrowLeft size={14} className="text-muted group-hover:text-brand-primary group-hover:-translate-x-0.5 transition-transform" />
            <span>{t("plugins.genreExplorer.backToGenres", "Volver a todos los géneros")}</span>
          </button>

          <div className={` min-h-[30vh] relative w-full rounded-3xl overflow-hidden p-6 md:p-10 shadow-2xl bg-gradient-to-br ${selectedGenre.gradient} text-white flex flex-col md:flex-row items-center gap-8 justify-between mb-4`}>
            <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] pointer-events-none" />

            <div className="relative z-10 flex flex-col gap-3 text-center md:text-left">
              <span className="text-xs uppercase tracking-widest font-black text-white/80 flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles size={14} />
                {t("plugins.genreExplorer.title", "Explorador de Géneros")}
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-lg">
                {selectedGenre.name}
              </h1>
              <p className="text-sm md:text-base font-medium text-white/90 drop-shadow-md">
                {selectedGenre.tracks.length} {t("plugins.genreExplorer.songs", "Canciones")} • {selectedGenre.albums.length} {t("plugins.genreExplorer.albums", "Álbumes")} • {selectedGenre.artists.length} {t("plugins.genreExplorer.artists", "Artistas")}
              </p>

              <div className="flex items-center justify-center md:justify-start gap-3 mt-4 flex-wrap">
                <button
                  onClick={(e) => handlePlayGenre(e, selectedGenre, false)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-900 rounded-xl font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Play size={16} fill="currentColor" />
                  <span>{t("plugins.genreExplorer.playGenre", "Reproducir todo")}</span>
                </button>

                <button
                  onClick={(e) => handlePlayGenre(e, selectedGenre, true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl font-semibold text-sm backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={t("plugins.genreExplorer.shuffleGenre", "Modo aleatorio")}
                >
                  <Shuffle size={16} />
                  <span>{t("plugins.genreExplorer.shuffleGenre", "Aleatorio")}</span>
                </button>

                <button
                  onClick={(e) => handleEnqueueGenre(e, selectedGenre)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl font-semibold text-sm backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={t("plugins.genreExplorer.enqueueGenre", "Añadir a la cola")}
                >
                  <ListPlus size={16} />
                  <span>{t("plugins.genreExplorer.enqueueGenre", "Añadir a la cola")}</span>
                </button>
              </div>
            </div>

            <div className="relative z-10 w-44 h-44 md:w-56 md:h-56 shrink-0 flex items-center justify-center">
              {selectedGenre.covers.slice(0, 3).map((cover, idx) => (
                <div
                  key={cover}
                  className={`absolute w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 transition-transform duration-500 ${
                    idx === 0
                      ? "rotate-[-6deg] translate-x-[-15px] translate-y-[-10px] z-10"
                      : idx === 1
                        ? "rotate-[6deg] translate-x-[15px] translate-y-[-5px] z-20"
                        : "rotate-[0deg] translate-y-[15px] z-30 scale-105"
                  }`}
                >
                  <LazyCover src={buildCoverUrl(cover)} alt={selectedGenre.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 bg-background/95 backdrop-blur-xl border-b border-divider/50 shadow-xs mb-3 flex flex-col transition-all duration-300">
            <div
              className={`transition-all duration-300 ease-out overflow-hidden flex items-center justify-between ${
                isScrolled ? "h-14 opacity-100 py-2 border-b border-divider/30" : "h-0 opacity-0 py-0"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setActiveArtistFilter(null);
                    setGenreTrackSearch("");
                    navigate("/genres");
                  }}
                  className="w-8 h-8 rounded-full bg-surface border border-divider text-muted hover:text-content hover:border-brand-primary/50 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title={t("plugins.genreExplorer.backToGenres", "Volver a todos los géneros")}
                >
                  <ArrowLeft size={15} />
                </button>

                <button
                  onClick={(e) => handlePlayGenre(e, selectedGenre, false)}
                  className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform shrink-0 cursor-pointer"
                  title={t("plugins.genreExplorer.playGenre", "Reproducir todo")}
                >
                  <Play size={14} fill="currentColor" className="ml-0.5" />
                </button>

                <button
                  onClick={(e) => handlePlayGenre(e, selectedGenre, true)}
                  className="w-8 h-8 rounded-full bg-surface border border-divider text-muted hover:text-content hover:border-brand-primary/50 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title={t("plugins.genreExplorer.shuffleGenre", "Modo aleatorio")}
                >
                  <Shuffle size={14} />
                </button>

                <div className="flex items-baseline gap-2 truncate">
                  <h2 className="text-base font-bold text-content truncate">
                    {selectedGenre.name}
                  </h2>
                  <span className="text-xs text-muted font-medium shrink-0">
                    • {selectedGenreTracks.length} {t("plugins.genreExplorer.songs", "canciones")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => handleEnqueueGenre(e, selectedGenre)}
                  className="p-1.5 rounded-lg text-muted hover:text-content hover:bg-surface transition-colors cursor-pointer"
                  title={t("plugins.genreExplorer.enqueueGenre", "Añadir a la cola")}
                >
                  <ListPlus size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-2.5 flex-wrap">
              <div className="relative flex-1 max-w-xs md:max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder={t("search.placeholderLibrary", "Buscar en este género...")}
                  value={genreTrackSearch}
                  onChange={(e) => setGenreTrackSearch(e.target.value)}
                  className="w-full bg-surface border border-divider text-content text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                />
              </div>

              {selectedGenre.artists.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar max-w-full py-0.5">
                  <button
                    onClick={() => setActiveArtistFilter(null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      activeArtistFilter === null
                        ? "bg-brand-primary text-white shadow-xs"
                        : "bg-surface border border-divider text-muted hover:text-content"
                    }`}
                  >
                    {t("common.artists", "Todos")} ({selectedGenre.artists.length})
                  </button>
                  {selectedGenre.artists.slice(0, 10).map((artist) => (
                    <button
                      key={artist}
                      onClick={() => setActiveArtistFilter(activeArtistFilter === artist ? null : artist)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer truncate max-w-[150px] ${
                        activeArtistFilter === artist
                          ? "bg-brand-primary text-white shadow-xs"
                          : "bg-surface border border-divider text-muted hover:text-content"
                      }`}
                    >
                      {artist}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <TableHeader
              isScrolled={isScrolled}
              gridTemplate={gridTemplate}
              isMobile={isMobile}
              visibleColumns={visibleColumns}
            />
          </div>

          <div ref={tableContainerRef} className="w-full relative">
            {selectedGenreTracks.length > 0 ? (
              <div
                style={{
                  height: `${tracksVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {tracksVirtualizer.getVirtualItems().map((virtualRow) => {
                  const track = selectedGenreTracks[virtualRow.index];
                  const isPlaying = currentTrack?.path === track.path;
                  const isDropdownActive = activeDropdown === track.path;
                  return (
                    <div
                      key={`${track.path}-${virtualRow.index}`}
                      className={`absolute top-0 left-0 w-full ${isDropdownActive ? "z-50" : "z-0"}`}
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                      }}
                    >
                      <TrackRow
                        track={track}
                        index={virtualRow.index}
                        isCurrentTrack={isPlaying}
                        gridTemplate={gridTemplate}
                        isMobile={isMobile}
                        showArtistSubtitle={true}
                        isFavorite={favorites?.includes(track.path) ?? false}
                        onPlay={() => playSpecific(track.path, selectedGenreTracks)}
                        onToggleFavorite={() => toggleFavorite(track.path)}
                        onEnqueue={() => {
                          enqueueTracks([track]);
                          showToast(
                            t("plugins.graphView.trackEnqueued", "\"{{title}}\" añadida a la cola", {
                              title: track.title,
                            })
                          );
                        }}
                        isDropdownActive={isDropdownActive}
                        onToggleDropdown={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(
                            activeDropdown === track.path ? null : track.path
                          );
                        }}
                        dropdownMenu={
                          <TrackDropdownMenu
                            trackPath={track.path}
                            playlists={playlists}
                            onClose={() => setActiveDropdown(null)}
                            onAddToPlaylist={addToPlaylist}
                            showDetailsOption={true}
                          />
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-muted text-sm">
                {t("plugins.genreExplorer.noTracksInGenre", "No hay canciones disponibles en este género.")}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="shrink-0 flex flex-col gap-4 px-6 md:px-8 pt-6 pb-4 border-b border-divider/50 bg-background z-20">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface/80 backdrop-blur-md flex items-center justify-center border border-divider shadow-lg shrink-0">
                  <Tags size={24} className="text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-content tracking-tight">
                    {t("plugins.genreExplorer.title", "Explorador de Géneros")}
                  </h1>
                  <p className="text-xs font-semibold text-muted uppercase tracking-widest mt-1">
                    {t("plugins.genreExplorer.subtitle", "Descubre tu música clasificada por estilos y vibras")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder={t("plugins.genreExplorer.searchPlaceholder", "Filtrar géneros...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface border border-divider text-content text-xs md:text-sm rounded-xl pl-9 pr-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "count" | "name")}
                  className="bg-surface border border-divider text-content text-xs md:text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer transition-colors"
                >
                  <option value="count">{t("plugins.genreExplorer.sortByCount", "Más canciones")}</option>
                  <option value="name">{t("plugins.genreExplorer.sortByName", "Alfabético A-Z")}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-muted">
              <span>{filteredGenres.length} {t("plugins.genreExplorer.allGenres", "géneros")}</span>
              <span>•</span>
              <span>{totalCatalogedSongs} {t("plugins.genreExplorer.songsCataloged", "canciones catalogadas")}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-8 pt-5 pb-44">
            {filteredGenres.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {filteredGenres.map((genre) => (
                  <div
                    key={genre.slug}
                    onClick={() => navigate(`/genres/${genre.slug}`)}
                    className={`group relative h-48 md:h-52 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 p-5 flex flex-col justify-between cursor-pointer hover:scale-[1.02] bg-gradient-to-br ${genre.gradient}`}
                  >
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors duration-300 pointer-events-none" />

                    <div className="relative z-10 flex flex-col gap-1 max-w-[65%]">
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-md truncate">
                        {genre.name}
                      </h3>
                      <span className="text-xs font-medium text-white/80 drop-shadow-sm">
                        {genre.tracks.length} {t("plugins.genreExplorer.songs", "canciones")}
                      </span>
                      <span className="text-[11px] font-medium text-white/70 drop-shadow-sm">
                        {genre.artists.length} {t("plugins.genreExplorer.artists", "artistas")}
                      </span>
                    </div>

                    <div className="absolute right-[-15px] bottom-[-15px] w-32 h-32 md:w-36 md:h-36 pointer-events-none">
                      {genre.covers.slice(0, 2).map((cover, idx) => (
                        <div
                          key={cover}
                          className={`absolute w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden shadow-2xl border border-white/20 transition-transform duration-500 ${
                            idx === 0
                              ? "rotate-12 translate-x-3 translate-y-3 group-hover:rotate-15 group-hover:scale-105"
                              : "rotate-[-8deg] translate-x-[-10px] translate-y-[-5px] group-hover:rotate-[-12deg]"
                          }`}
                        >
                          <LazyCover src={buildCoverUrl(cover)} alt={genre.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>

                    <div className="relative z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 self-start">
                      <button
                        onClick={(e) => handlePlayGenre(e, genre, false)}
                        className="w-9 h-9 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"
                        title={t("plugins.genreExplorer.playGenre", "Reproducir género")}
                      >
                        <Play size={15} fill="currentColor" className="ml-0.5" />
                      </button>

                      <button
                        onClick={(e) => handlePlayGenre(e, genre, true)}
                        className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center shadow-lg hover:bg-black/75 hover:scale-110 active:scale-95 transition-all backdrop-blur-md border border-white/20"
                        title={t("plugins.genreExplorer.shuffleGenre", "Modo aleatorio")}
                      >
                        <Shuffle size={14} />
                      </button>

                      <button
                        onClick={(e) => handleEnqueueGenre(e, genre)}
                        className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center shadow-lg hover:bg-black/75 hover:scale-110 active:scale-95 transition-all backdrop-blur-md border border-white/20"
                        title={t("plugins.genreExplorer.enqueueGenre", "Añadir a la cola")}
                      >
                        <ListPlus size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-muted gap-3">
                <Music size={40} className="text-muted/40" />
                <p className="text-sm font-medium">
                  {t("plugins.genreExplorer.noGenresFound", "No se encontraron géneros coincidentes.")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreExplorer;
