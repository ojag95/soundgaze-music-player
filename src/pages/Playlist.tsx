import { useState, useEffect, useRef, useMemo } from "react";
import {
  Heart,
  ChevronRight,
  Plus,
  ListMusic,
  Trash2,
} from "lucide-react";
import { usePlayerStore } from "../store/playerStore";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLibrarySettingsStore } from "../store/librarySettingsStore";
import { useTranslation } from "react-i18next";
import HeaderBanner from "../components/shared/HeaderBanner";
import TrackRow from "../components/shared/TrackRow";
import TrackDropdownMenu from "../components/shared/TrackDropdownMenu";
import StickyHeader from "../components/shared/StickyHeader";
import TableHeader from "../components/shared/TableHeader";
import { useResponsiveSidebar } from "../hooks/useResponsiveSidebar";

const Playlists = () => {
  const playlists = usePlayerStore((s) => s.playlists);
  const selectedPlaylist = usePlayerStore((s) => s.selectedPlaylist);
  const currentViewTracks = usePlayerStore((s) => s.currentViewTracks);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const favorites = usePlayerStore((s) => s.favorites);
  const isFavoritesView = usePlayerStore((s) => s.isFavoritesView);

  const selectPlaylist = usePlayerStore((s) => s.selectPlaylist);
  const playSpecific = usePlayerStore((s) => s.playSpecific);
  const toggleFavorite = usePlayerStore((s) => s.toggleFavorite);
  const selectFavorites = usePlayerStore((s) => s.selectFavorites);
  const addToPlaylist = usePlayerStore((s) => s.addToPlaylist);
  const removeTrackFromPlaylist = usePlayerStore((s) => s.removeTrackFromPlaylist);
  const deletePlaylist = usePlayerStore((s) => s.deletePlaylist);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { isSidebarOpen, setIsSidebarOpen, isMobile } = useResponsiveSidebar();

  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const visibleColumns = useLibrarySettingsStore((s) => s.visibleColumns);
  
  const { t } = useTranslation();

  useEffect(() => {
    if (!selectedPlaylist && !isFavoritesView) {
      selectFavorites();
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrolled = e.currentTarget.scrollTop > 200;
    if (scrolled !== isScrolled) setIsScrolled(scrolled);
    if (activeDropdown) setActiveDropdown(null);
  };

  const headerCovers = currentViewTracks.slice(0, 3).map((t) => t.path);

  const handleConfirmCreate = () => {
    const name = newPlaylistName.trim();
    if (name !== "") {
      const { playlists } = usePlayerStore.getState();
      if (!playlists[name]) {
        usePlayerStore.setState({
          playlists: { ...playlists, [name]: [] },
        });
      }
      selectPlaylist(name);
      setIsModalOpen(false);
      setNewPlaylistName("");
      if (isMobile) setIsSidebarOpen(false);
    }
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
        <div className="w-full h-full overflow-hidden">
          <div className="w-64 h-full flex flex-col gap-4 pr-4 pb-20 overflow-y-auto select-none pt-2">
            <div className="mb-2">
              <button
                onClick={() => {
                  setNewPlaylistName("");
                  setIsModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted hover:text-content hover:bg-surface transition-colors"
              >
                <div className="w-8 h-8 rounded bg-surface border border-divider flex items-center justify-center">
                  <Plus size={16} />
                </div>
                {t("common.createPlaylist")}
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider px-3 mb-2">
                {t("common.collections")}
              </span>

              <button
                onClick={() => {
                  selectFavorites();
                  setSearchQuery("");
                  setIsSearchOpen(false);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3 ${isFavoritesView ? "bg-brand-primary/10 text-brand-primary font-medium" : "text-muted hover:text-content hover:bg-surface/50"}`}
              >
                <div
                  className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${isFavoritesView ? "bg-brand-primary text-background" : "bg-surface"}`}
                >
                  <Heart
                    size={16}
                    fill={isFavoritesView ? "currentColor" : "none"}
                  />
                </div>
                {t("common.likedSongs")}
              </button>

              {Object.keys(playlists).map((plName) => {
                const isActive =
                  selectedPlaylist === plName && !isFavoritesView;
                return (
                  <div
                    key={plName}
                    className={`group w-full flex items-center justify-between rounded-md text-sm transition-colors mt-1 ${isActive ? "bg-surface text-content font-medium" : "text-muted hover:bg-surface/50"}`}
                  >
                    <button
                      onClick={() => {
                        selectPlaylist(plName);
                        setSearchQuery("");
                        setIsSearchOpen(false);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                      className="flex-1 flex items-center gap-3 px-3 py-2 text-left truncate hover:text-content"
                    >
                      <div className="w-8 h-8 rounded bg-surface border border-divider flex items-center justify-center flex-shrink-0">
                        <ListMusic size={16} />
                      </div>
                      <span className="truncate">{plName}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            t("common.deletePlaylistConfirm", { plName }),
                          )
                        ) {
                          deletePlaylist(plName);
                        }
                      }}
                      className="px-3 invisible group-hover:visible hover:text-red-500 transition-colors"
                      title={t("common.deletePlaylist")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={parentRef}
        onScroll={handleScroll}
        className={`flex-1 flex flex-col pb-20 overflow-y-auto pr-2 transition-all duration-300 relative ${!isSidebarOpen ? "pl-10" : "pl-0"}`}
      >
        <HeaderBanner
          covers={headerCovers}
          subtitle="Playlist"
          title={
            isFavoritesView
              ? t("common.likedSongs")
              : selectedPlaylist || t("common.selectAList")
          }
          description={t("common.songCount", {
            query: currentViewTracks.length,
          })}
          emptyFallback={
            <div className="w-36 h-36 rounded-lg bg-surface flex items-center justify-center shadow-xl border border-divider ml-4 shrink-0">
              <ListMusic size={40} className="text-muted" />
            </div>
          }
        />

        <div className="w-full">
          <div className="sticky top-0 z-20 flex flex-col mb-2">
            <StickyHeader
              isScrolled={isScrolled}
              title={
                isFavoritesView
                  ? t("common.likedSongs")
                  : selectedPlaylist || ""
              }
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
                "search.placeholderPlaylist",
                "Buscar en playlist...",
              )}
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
                    showArtistSubtitle={true}
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
                        currentPlaylist={selectedPlaylist}
                        isFavoritesView={isFavoritesView}
                        onRemoveFromPlaylist={removeTrackFromPlaylist}
                      />
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-surface border border-divider rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-content mb-4">
              {t("common.createPlaylist")}
            </h3>
            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmCreate();
                if (e.key === "Escape") setIsModalOpen(false);
              }}
              placeholder={t("common.playlistNamePlaceholder")}
              className="w-full bg-background border border-divider rounded-lg px-4 py-3 text-content placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary mb-6 transition-all"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-content hover:bg-surface transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-primary text-background hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {t("common.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Playlists;