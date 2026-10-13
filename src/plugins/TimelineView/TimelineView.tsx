import React, { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePlayerStore, TrackData } from "../../store/playerStore";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";
import { Play, Timeline, Disc3, X, ListPlus, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TimelineAlbum {
  id: string;
  artist: string;
  album: string;
  year: number;
  coverPath: string;
  tracks: TrackData[];
}

const LazyImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "600px", threshold: 0 },
    );
    if (placeholderRef.current) observer.observe(placeholderRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={placeholderRef}
      className="w-full h-full bg-surface/30 flex items-center justify-center"
    >
      {isVisible ? (
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Disc3 size={24} className="text-muted/30" />
      )}
    </div>
  );
};

const TimelineView: React.FC = () => {
  const { t } = useTranslation();

  const libraryTree = usePlayerStore((s) => s.libraryTree);
  const selectedArtist = usePlayerStore((s) => s.selectedArtist);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  
  const playSpecific = usePlayerStore((s) => s.playSpecific);
  const playTracks = usePlayerStore((s) => s.playTracks);
  const enqueueTracks = usePlayerStore((s) => s.enqueueTracks);
  
  const basePath = useLibrarySettingsStore((s) => s.basePath);
  const coverCacheBuster = useLibrarySettingsStore((s) => s.coverCacheBuster);

  const [selectedAlbum, setSelectedAlbum] = useState<TimelineAlbum | null>(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | "all">("all");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedAlbum(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setSelectedYearFilter("all");
  }, [selectedArtist]);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const groupedAlbums = useMemo(() => {
    const albumsArray: TimelineAlbum[] = [];

    Object.entries(libraryTree).forEach(([artist, albums]) => {
      if (selectedArtist && artist !== selectedArtist) return;

      Object.entries(albums).forEach(([album, tracks]) => {
        if (tracks.length > 0) {
          const yearRaw = tracks[0].date;
          const yearMatch = yearRaw ? yearRaw.match(/\d{4}/) : null;
          const year = yearMatch ? parseInt(yearMatch[0], 10) : 0;

          albumsArray.push({
            id: `${artist}-${album}`,
            artist,
            album,
            year,
            coverPath: tracks[0].path,
            tracks,
          });
        }
      });
    });

    albumsArray.sort((a, b) => {
      if (a.year === 0) return 1;
      if (b.year === 0) return -1;
      return a.year - b.year;
    });

    const groups = new Map<number, TimelineAlbum[]>();
    albumsArray.forEach((album) => {
      const group = groups.get(album.year) || [];
      group.push(album);
      groups.set(album.year, group);
    });

    return Array.from(groups.entries());
  }, [libraryTree, selectedArtist]);

  const availableYears = useMemo(() => {
    return Array.from(groupedAlbums, ([year]) => year).sort((a, b) => a - b);
  }, [groupedAlbums]);

  const displayedAlbums = useMemo(() => {
    if (selectedYearFilter === "all") return groupedAlbums;
    return groupedAlbums.filter(([year]) => year === selectedYearFilter);
  }, [groupedAlbums, selectedYearFilter]);

  const getTracksForYear = (year: number): TrackData[] => {
    const yearGroup = groupedAlbums.find(([y]) => y === year);
    if (!yearGroup) return [];
    return yearGroup[1].flatMap((album) => album.tracks);
  };

  const handlePlayYear = (year: number) => {
    const tracks = getTracksForYear(year);
    if (tracks.length > 0) {
      playTracks(tracks);
    }
  };

  const handleEnqueueYear = (year: number) => {
    const tracks = getTracksForYear(year);
    if (tracks.length > 0) {
      enqueueTracks(tracks);
      const yearLabel = year === 0 ? t("common.unknown", "Desconocido") : year.toString();
      showToast(
        t("plugins.timelineView.yearEnqueued", "{{count}} canciones de {{year}} añadidas a la cola", {
          count: tracks.length,
          year: yearLabel,
        })
      );
    }
  };

  const getCoverUrl = (path: string) => {
    return `cover://localhost/?path=${encodeURIComponent(path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    if (!sliderRef.current) return;
    startX.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeft.current = sliderRef.current.scrollLeft;
    sliderRef.current.style.scrollSnapType = 'none';
  };

  const handleMouseLeaveOrUp = () => {
    isDragging.current = false;
    if (sliderRef.current) {
      sliderRef.current.style.scrollSnapType = 'x mandatory';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !sliderRef.current) return;
    e.preventDefault();
    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 5) hasDragged.current = true;
    sliderRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    <div className="relative w-full h-full bg-background flex flex-col animate-in fade-in duration-500 overflow-hidden">
      
      <div className="shrink-0 p-6 md:p-8 flex items-center gap-4 bg-background z-10 flex-wrap">
        <div className="w-12 h-12 rounded-xl bg-surface/80 backdrop-blur-md flex items-center justify-center border border-divider shadow-lg shrink-0">
          <Timeline size={24} className="text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-content tracking-tight drop-shadow-md">
            {selectedArtist
              ? selectedArtist
              : t("plugins.timelineView.title", "Línea de Tiempo Musical")}
          </h1>
          <p className="text-xs font-semibold text-muted uppercase tracking-widest mt-1 drop-shadow-md">
            {selectedArtist
              ? t("plugins.timelineView.artistTimeline", "Cronología del artista")
              : t("plugins.timelineView.decadesJourney", "Un viaje musical por décadas")}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {selectedYearFilter !== "all" && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => handlePlayYear(Number(selectedYearFilter))}
                className="flex items-center gap-2 px-3.5 py-2 bg-brand-primary text-white text-xs md:text-sm font-bold rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                title={t("plugins.timelineView.playYearTitle", "Reproducir todos los álbumes de este año")}
              >
                <Play size={15} fill="currentColor" />
                <span>{t("plugins.timelineView.playYear", "Reproducir año")}</span>
              </button>

              <button
                onClick={() => handleEnqueueYear(Number(selectedYearFilter))}
                className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-divider text-content text-xs md:text-sm font-semibold rounded-xl shadow-sm hover:bg-surface-hover hover:border-brand-primary/50 active:scale-95 transition-all"
                title={t("plugins.timelineView.enqueueYearTitle", "Añadir todos los álbumes de este año a la cola")}
              >
                <ListPlus size={16} className="text-brand-primary" />
                <span className="hidden sm:inline">{t("plugins.timelineView.enqueueYear", "Añadir a la cola")}</span>
              </button>
            </div>
          )}

          {availableYears.length > 1 && (
            <div className="relative">
              <select
                value={selectedYearFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedYearFilter(val === "all" ? "all" : Number(val));
                  if (sliderRef.current) sliderRef.current.scrollLeft = 0;
                }}
                className="appearance-none bg-surface border border-divider text-content text-sm rounded-xl px-4 py-2 pr-8 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer transition-colors hover:border-brand-primary/50"
              >
                <option value="all">{t("common.allYears", "Todos los años")}</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year === 0 ? t("common.unknown", "Desconocido") : year}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={sliderRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className="flex-1 flex items-center justify-start overflow-x-auto custom-scrollbar px-8 snap-x snap-mandatory pb-8 cursor-grab active:cursor-grabbing"
      >
        <div className="flex gap-6 min-w-max items-center h-80">
          {displayedAlbums.map(([year, albums]) => (
            <div key={year} className="flex gap-4 pr-16 items-center">
              
              <div className="snap-start flex flex-col items-center justify-between min-w-[96px] md:min-w-[110px] h-48 md:h-56 border-r border-divider/40 pr-5 select-none group/year">
                <div className="flex-1 flex items-center justify-center">
                  <span className="font-black text-brand-primary/25 group-hover/year:text-brand-primary/60 transition-colors -rotate-90 origin-center whitespace-nowrap text-3xl md:text-4xl">
                    {year === 0 ? t("common.unknown", "Desconocido") : year}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1.5 pt-2">
                  <span className="text-[11px] font-semibold text-muted tracking-wider">
                    {albums.length} {albums.length === 1 ? t("common.album", "Álbum") : t("common.albums", "Álbumes")}
                  </span>

                  <div className="flex items-center gap-1.5 bg-surface/90 border border-divider rounded-full p-1 shadow-md">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasDragged.current) return;
                        handlePlayYear(year);
                      }}
                      className="w-7 h-7 rounded-full bg-brand-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xs"
                      title={`${t("plugins.timelineView.playYear", "Reproducir año")} ${year === 0 ? "" : year}`}
                    >
                      <Play size={12} fill="currentColor" className="ml-0.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasDragged.current) return;
                        handleEnqueueYear(year);
                      }}
                      className="w-7 h-7 rounded-full bg-surface-hover hover:bg-background text-muted hover:text-brand-primary flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                      title={`${t("plugins.timelineView.enqueueYear", "Añadir a la cola")} ${year === 0 ? "" : year}`}
                    >
                      <ListPlus size={13} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-6 items-center">
                {albums.map((album) => {
                  const isAlbumPlaying = currentTrack 
                    ? album.tracks.some(t => t.path === currentTrack.path) 
                    : false;
                  
                  const isSelected = selectedAlbum?.id === album.id;

                  return (
                    <button
                      key={album.id}
                      onClick={(e) => {
                        if (hasDragged.current) {
                          e.preventDefault();
                          return;
                        }
                        setSelectedAlbum(album);
                      }}
                      className={`snap-start group relative w-48 h-48 md:w-56 md:h-56 shrink-0 rounded-xl overflow-hidden shadow-lg transition-all duration-300 outline-none focus:ring-4 focus:ring-brand-primary select-none
                        ${isSelected ? "ring-4 ring-brand-primary scale-105 shadow-brand-primary/20 shadow-xl" : "hover:scale-105 hover:shadow-xl"}
                        ${isAlbumPlaying && !isSelected ? "ring-2 ring-brand-primary shadow-brand-primary/20" : ""}
                      `}
                    >
                      <LazyImage
                        src={getCoverUrl(album.coverPath)}
                        alt={album.album}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none"
                      />

                      {isAlbumPlaying && (
                        <div className="absolute top-3 right-3 bg-brand-primary/90 backdrop-blur-sm text-white rounded-full p-2 shadow-lg z-20 flex items-center justify-center">
                          <Play size={12} fill="currentColor" className="animate-pulse" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <span className="text-sm font-bold text-content truncate shadow-sm">
                          {album.album}
                        </span>
                        <span className="text-xs text-muted truncate">
                          {album.artist}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {displayedAlbums.length === 0 && (
            <div className="flex w-full items-center justify-center text-muted">
               <p>{t("plugins.timelineView.noAlbumsFound", "No se encontraron álbumes en este año.")}</p>
            </div>
          )}
        </div>
      </div>

      {selectedAlbum && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedAlbum(null)}
        >
          <div 
            className="w-full max-w-5xl bg-surface border border-divider shadow-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row max-h-[70vh] md:max-h-[70vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="w-full md:w-2/5 p-8 bg-surface/50 border-r border-divider flex flex-col items-center text-center shrink-0">
              <div className="w-48 h-48 lg:w-64 lg:h-64 aspect-square shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-divider mb-6 relative">
                <img
                  src={getCoverUrl(selectedAlbum.coverPath)}
                  alt={selectedAlbum.album}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <span className="text-xs font-bold tracking-widest text-brand-primary uppercase mb-2">
                {t("common.album")} •{" "}
                {selectedAlbum.year === 0 ? t("common.unknown", "Desconocido") : selectedAlbum.year}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-content mb-2 tracking-tight leading-tight line-clamp-2">
                {selectedAlbum.album}
              </h2>
              <h3 className="text-sm text-muted font-medium mb-6">
                {selectedAlbum.artist}
              </h3>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => playSpecific(selectedAlbum.tracks[0].path, selectedAlbum.tracks)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                >
                  <Play size={20} fill="currentColor" />
                  {t("common.play", "Reproducir")}
                </button>

                <button
                  onClick={() => {
                    enqueueTracks(selectedAlbum.tracks);
                    showToast(
                      t("plugins.timelineView.albumEnqueued", "{{count}} canciones de \"{{album}}\" añadidas a la cola", {
                        count: selectedAlbum.tracks.length,
                        album: selectedAlbum.album,
                      })
                    );
                  }}
                  className="p-3 bg-surface border border-divider hover:bg-surface-hover text-muted hover:text-brand-primary rounded-xl font-bold transition-all shadow-md active:scale-95"
                  title={t("plugins.timelineView.enqueueYearTitle", "Añadir a la cola")}
                >
                  <ListPlus size={20} />
                </button>
              </div>
            </div>

            <div className="w-full md:w-3/5 flex flex-col bg-background">
              <div className="flex items-center justify-between p-6 border-b border-divider shrink-0">
                <span className="text-sm font-semibold text-muted uppercase tracking-wider">
                  {t("common.songCount", { query: selectedAlbum.tracks.length })}
                </span>
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="p-2 text-muted hover:text-content hover:bg-surface rounded-full transition-colors"
                  title={t("common.closeModal", "Cerrar modal")}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {selectedAlbum.tracks.map((track, index) => {
                  const isPlaying = currentTrack?.path === track.path;

                  return (
                    <div
                      key={track.path}
                      onDoubleClick={() => playSpecific(track.path, selectedAlbum.tracks)}
                      className={`group flex items-center gap-4 px-4 py-3 hover:bg-surface/50 rounded-xl transition-colors cursor-pointer ${
                        isPlaying ? "bg-brand-primary/10" : ""
                      }`}
                    >
                      <div className="w-8 text-center text-sm font-medium text-muted group-hover:hidden shrink-0">
                        {isPlaying ? (
                          <Play size={14} className="mx-auto text-brand-primary animate-pulse" fill="currentColor" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <button
                        className="w-8 text-center text-content hidden group-hover:block shrink-0"
                        onClick={() => playSpecific(track.path, selectedAlbum.tracks)}
                      >
                        <Play size={16} fill="currentColor" className="mx-auto" />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isPlaying ? "text-brand-primary" : "text-content"}`}>
                          {track.title}
                        </p>
                      </div>

                      <div className={`text-sm font-variant-numeric flex items-center gap-1 shrink-0 ${isPlaying ? "text-brand-primary" : "text-muted"}`}>
                        {track.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {toastMessage &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[300] pointer-events-none flex items-center justify-center">
            <div className="pointer-events-auto flex items-center gap-2.5 px-5 py-2.5 bg-surface/95 backdrop-blur-md border border-divider shadow-2xl rounded-full text-xs md:text-sm font-medium text-content animate-in fade-in slide-in-from-bottom-5 duration-200">
              <div className="p-1 rounded-full bg-brand-primary/20 text-brand-primary shrink-0">
                <Check size={14} />
              </div>
              <span className="truncate max-w-xs md:max-w-md">{toastMessage}</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default TimelineView;