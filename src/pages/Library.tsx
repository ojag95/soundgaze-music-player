import { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronRight,
  Waypoints,
  Timeline,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { usePlayerStore, TrackData } from "../store/playerStore";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLibrarySettingsStore } from "../store/librarySettingsStore";
import { useTranslation } from "react-i18next";
import { usePluginStore } from "../store/pluginStore";
import { useNavigate } from "react-router-dom";
import HeaderBanner from "../components/shared/HeaderBanner";
import TrackRow from "../components/shared/TrackRow";
import TrackDropdownMenu from "../components/shared/TrackDropdownMenu";
import StickyHeader from "../components/shared/StickyHeader";
import TableHeader from "../components/shared/TableHeader";
import { useResponsiveSidebar } from "../hooks/useResponsiveSidebar";

const Library = () => {
  const {
    libraryTree,
    artists,
    selectedArtist,
    selectedAlbum,
    currentViewTracks,
    setLibrary,
    selectArtist,
    selectAlbum,
    playSpecific,
    currentTrack,
    favorites,
    isFavoritesView,
    toggleFavorite,
    restoreLibraryView,
    playlists,
    addToPlaylist,
  } = usePlayerStore();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { visibleColumns } = useLibrarySettingsStore();
  const navigate = useNavigate();
  const { activePlugins } = usePluginStore();

  const { isSidebarOpen, setIsSidebarOpen, isMobile } = useResponsiveSidebar();

  useEffect(() => {
    restoreLibraryView();
    const loadLibrary = async () => {
      try {
        setIsLoading(true);
        const mpdTracks: TrackData[] = await invoke("mpd_get_library");
        setLibrary(mpdTracks);
      } catch (error) {
        console.error("Error al cargar la biblioteca:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLibrary();
  }, []);

  const albumsOfSelectedArtist = selectedArtist
    ? Object.keys(libraryTree[selectedArtist] || {})
    : [];

  let headerCovers: string[] = [];

  if (selectedArtist && !selectedAlbum) {
    headerCovers = albumsOfSelectedArtist
      .slice(0, 3)
      .map((albumName) => libraryTree[selectedArtist][albumName][0].path);
  } else if (currentViewTracks.length > 0) {
    headerCovers = [currentViewTracks[0].path];
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 200;
    if (scrolled !== isScrolled) {
      setIsScrolled(scrolled);
    }
    if (activeDropdown) setActiveDropdown(null);
  };

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return currentViewTracks;

    const lowerQuery = searchQuery.toLowerCase();
    return currentViewTracks.filter(
      (track) =>
        track.title?.toLowerCase().includes(lowerQuery) ||
        track.artist?.toLowerCase().includes(lowerQuery) ||
        track.album?.toLowerCase().includes(lowerQuery),
    );
  }, [currentViewTracks, searchQuery]);

  const rowVirtualizer = useVirtualizer({
    count: filteredTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const gridTemplate = isMobile
    ? `auto minmax(0, 1fr) ${visibleColumns.time ? "auto" : ""}`
        .replace(/\s+/g, " ")
        .trim()
    : `
        auto 
        minmax(0, 2fr) 
        ${visibleColumns.album ? "minmax(0, 1fr)" : ""} 
        ${visibleColumns.genre ? "minmax(0, 1fr)" : ""} 
        ${visibleColumns.date ? "80px" : ""} 
        ${visibleColumns.time ? "100px" : ""}
      `
        .replace(/\s+/g, " ")
        .trim();

  if (isLoading) {
    return (
      <div className="text-center py-20 text-muted">{t("common.syncing")}</div>
    );
  }

  const handleGraphicalView = () => {
    navigate("/graphical-view", { state: { tracks: filteredTracks } });
  };
  const handleTimelineView = () => {
    navigate("/timeline-view", { state: { tracks: filteredTracks } });
  };

  return (
    <div className="relative flex h-[calc(100vh-60px)] animate-in fade-in duration-300">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-2 z-50 flex items-center justify-center w-6 h-6 rounded-full bg-surface border border-divider text-muted hover:text-brand-primary shadow-sm hover:scale-110 transition-all duration-300 ${
          isSidebarOpen ? "left-[244px]" : "left-2"
        }`}
        title={
          isSidebarOpen ? "Ocultar barra lateral" : "Mostrar barra lateral"
        }
      >
        <ChevronRight
          size={14}
          className={`transition-transform duration-300 ${
            isSidebarOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed top-14 inset-0 z-50 bg-background/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={`
          transition-all duration-300 ease-in-out h-full overflow-hidden bg-background 
          ${
            isMobile
              ? `fixed top-14 left-0 z-50 pb-2 px-2 shadow-2xl ${isSidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full"}`
              : `relative flex-shrink-0 ${isSidebarOpen ? "w-64 mr-6 border-r border-divider" : "w-0 mr-0 border-r-0"}`
          }
        `}
      >
        <div className="w-64 h-full flex flex-col gap-4 pr-4 pb-20 overflow-y-auto select-none pt-2">
          <div>
            <button
              onClick={() => {
                selectArtist(null);
                setSearchQuery("");
                setIsSearchOpen(false);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                !selectedArtist && !isFavoritesView
                  ? "bg-brand-primary/10 text-brand-primary"
                  : "text-muted hover:text-content hover:bg-surface"
              }`}
            >
              {t("common.allSongs")}
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider px-3 mb-1">
              {t("common.artists")}
            </span>
            {artists.map((artist) => {
              const isArtistActive = selectedArtist === artist;
              return (
                <div key={artist} className="flex flex-col">
                  <button
                    onClick={() => {
                      selectArtist(artist);
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center justify-between group ${
                      isArtistActive
                        ? "bg-surface text-content font-medium"
                        : "text-muted hover:text-content hover:bg-surface/50"
                    }`}
                  >
                    <span className="truncate">{artist}</span>
                    {isArtistActive && (
                      <ChevronRight size={14} className="text-brand-primary" />
                    )}
                  </button>

                  {isArtistActive && albumsOfSelectedArtist.length > 0 && (
                    <div className="ml-4 pl-2 border-l border-divider flex flex-col gap-1 mt-1 mb-2 animate-in slide-in-from-top-1 duration-200">
                      <button
                        onClick={() => {
                          selectAlbum(null);
                          setSearchQuery("");
                          setIsSearchOpen(false);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                        className={`text-left px-2 py-1 rounded text-xs transition-colors truncate ${
                          !selectedAlbum
                            ? "text-brand-primary font-medium"
                            : "text-muted hover:text-content"
                        }`}
                      >
                        {t("common.allAlbums")}
                      </button>
                      {albumsOfSelectedArtist.map((album) => (
                        <div className="flex-row" key={album}>
                          <button
                            onClick={() => {
                              selectAlbum(album);
                              setSearchQuery("");
                              setIsSearchOpen(false);
                              if (isMobile) setIsSidebarOpen(false);
                            }}
                            className={`text-left px-2 py-1 rounded text-xs transition-colors truncate ${
                              selectedAlbum === album
                                ? "text-brand-primary font-medium"
                                : "text-muted hover:text-content"
                            }`}
                          >
                            {album}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={parentRef}
        onScroll={handleScroll}
        className={`flex-1 flex flex-col pb-20 overflow-y-auto pr-2 transition-all duration-300 relative ${
          !isSidebarOpen ? "pl-10" : "pl-0"
        }`}
      >
        {headerCovers.length > 0 && (
          <HeaderBanner
            covers={headerCovers}
            subtitle={
              searchQuery
                ? t("search.resultsIn", { query: searchQuery })
                : selectedAlbum
                  ? t("common.album")
                  : selectedArtist
                    ? t("common.artist")
                    : t("common.catalog")
            }
            title={selectedAlbum || selectedArtist || t("common.yourLibrary")}
            description={
              (selectedArtist && selectedAlbum
                ? `${t("common.byArtist", { query: selectedArtist })} • `
                : "") +
              t("common.songCount", { query: currentViewTracks.length })
            }
          />
        )}

        <div className="w-full">
          <div className="sticky top-0 z-20 flex flex-col mb-2">
            <StickyHeader
              isScrolled={isScrolled}
              title={selectedAlbum || selectedArtist || t("common.yourLibrary")}
              coverPath={headerCovers.length > 0 ? headerCovers[0] : undefined}
              onPlayAll={() =>
                filteredTracks.length > 0 &&
                playSpecific(filteredTracks[0].path, filteredTracks)
              }
              isPlayDisabled={filteredTracks.length === 0}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isSearchOpen={isSearchOpen}
              onSearchOpenChange={setIsSearchOpen}
              searchInputRef={
                searchInputRef as React.RefObject<HTMLInputElement>
              }
              searchPlaceholder={t(
                "search.placeholderLibrary",
                "Buscar en la biblioteca...",
              )}
              extraActions={
                <>
                  {activePlugins["genre-explorer"] && (
                    <div
                      className={`group relative flex items-center transition-all duration-300 ease-out overflow-hidden bg-surface border w-10 h-10 rounded-full border-divider cursor-pointer hover:border-brand-primary shadow-sm`}
                      onClick={() => handleGraphicalView()}
                    >
                      <Waypoints
                        className="absolute transition-all duration-300 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted group-hover:text-brand-primary"
                        size={20}
                      />
                    </div>
                  )}
                  {activePlugins["timeline-view"] && !selectedAlbum && (
                    <div
                      className={`group relative flex items-center transition-all duration-300 ease-out overflow-hidden bg-surface border w-10 h-10 rounded-full border-divider cursor-pointer hover:border-brand-primary shadow-sm`}
                      onClick={() => handleTimelineView()}
                    >
                      <Timeline
                        className="absolute transition-all duration-300 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted group-hover:text-brand-primary"
                        size={20}
                      />
                    </div>
                  )}
                </>
              }
            />
            <TableHeader
              isScrolled={isScrolled}
              gridTemplate={gridTemplate}
              isMobile={isMobile}
              visibleColumns={visibleColumns}
            />
          </div>

          {filteredTracks.length === 0 && (
            <div className="text-center py-20 text-muted">
              {searchQuery ? t("common.noResults") : t("common.noSongs")}
            </div>
          )}

          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const track = filteredTracks[virtualRow.index];
              const isCurrentTrack = currentTrack?.path === track.path;
              const isDropdownActive = activeDropdown === track.path;

              return (
                <div
                  key={virtualRow.key}
                  className={`absolute top-0 left-0 w-full ${isDropdownActive ? "z-50" : "z-0"}`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <TrackRow
                    track={track}
                    index={virtualRow.index}
                    isCurrentTrack={isCurrentTrack}
                    gridTemplate={gridTemplate}
                    isMobile={isMobile}
                    showArtistSubtitle={!selectedArtist || isMobile}
                    isFavorite={favorites?.includes(track.path) ?? false}
                    onPlay={() => playSpecific(track.path, filteredTracks)}
                    onToggleFavorite={() => toggleFavorite(track.path)}
                    isDropdownActive={isDropdownActive}
                    onToggleDropdown={(e) => {
                      e.stopPropagation();
                      setActiveDropdown(
                        activeDropdown === track.path ? null : track.path,
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
        </div>
      </div>
    </div>
  );
};

export default Library;
