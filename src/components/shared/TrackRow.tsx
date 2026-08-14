import React from "react";
import { Play, Heart, MoreHorizontal } from "lucide-react";
import { TrackData } from "../../store/playerStore";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";
import { useTranslation } from "react-i18next";

interface TrackRowProps {
  track: TrackData;
  index: number;
  isCurrentTrack: boolean;
  gridTemplate: string;
  isMobile: boolean;
  showArtistSubtitle?: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFavorite: () => void;
  isDropdownActive: boolean;
  onToggleDropdown: (e: React.MouseEvent) => void;
  dropdownMenu: React.ReactNode;
}

const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrentTrack,
  gridTemplate,
  isMobile,
  showArtistSubtitle = true,
  isFavorite,
  onPlay,
  onToggleFavorite,
  isDropdownActive,
  onToggleDropdown,
  dropdownMenu,
}) => {
  const { visibleColumns } = useLibrarySettingsStore();
  const { t } = useTranslation();

  return (
    <div
      onDoubleClick={onPlay}
      className="group grid gap-4 px-4 py-2 rounded-md hover:bg-surface transition-colors items-center text-sm box-border h-full"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="w-8 flex justify-center text-muted relative">
        <span className="group-hover:invisible">{index + 1}</span>
        <button onClick={onPlay} className="absolute invisible group-hover:visible text-content">
          <Play size={16} fill="currentColor" />
        </button>
      </div>

      <div className="flex flex-col min-w-0">
        <span className={`font-medium truncate ${isCurrentTrack ? "text-brand-primary" : "text-content"}`}>
          {track.title}
        </span>
        {showArtistSubtitle && (
          <span className="text-muted text-xs truncate group-hover:text-content/70 transition-colors">
            {track.artist}
            {isMobile && visibleColumns.album && track.album && ` • ${track.album}`}
            {isMobile && visibleColumns.genre && track.genre && ` • ${track.genre}`}
            {isMobile && visibleColumns.date && track.date && ` • ${track.date}`}
          </span>
        )}
      </div>

      {!isMobile && visibleColumns.album && (
        <div className="hidden md:flex items-center truncate text-muted">
          <span className="truncate">{track.album}</span>
        </div>
      )}

      {!isMobile && visibleColumns.genre && (
        <div className="hidden md:flex items-center truncate text-muted">
          <span className="truncate">{track.genre || t("common.unknown")}</span>
        </div>
      )}

      {!isMobile && visibleColumns.date && (
        <div className="hidden md:flex items-center text-muted">
          <span>{track.date || "--"}</span>
        </div>
      )}

      <div className="flex items-center gap-4 justify-end relative">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`transition-colors hover:scale-110 ${isFavorite ? "text-brand-primary visible" : "invisible group-hover:visible text-muted hover:text-content"}`}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>

        {visibleColumns.time && (
          <span className="text-muted font-variant-numeric w-10 text-right">
            {track.time}
          </span>
        )}

        <div className="relative flex items-center justify-center">
          <button
            onClick={onToggleDropdown}
            className={`transition-colors text-muted hover:text-content ${isDropdownActive ? "visible text-content" : "invisible group-hover:visible"}`}
          >
            <MoreHorizontal size={16} />
          </button>

          {isDropdownActive && dropdownMenu}
        </div>
      </div>
    </div>
  );
};

export default TrackRow;