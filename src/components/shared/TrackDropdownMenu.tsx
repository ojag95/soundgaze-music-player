import React from "react";
import { useTranslation } from "react-i18next";

interface TrackDropdownMenuProps {
  trackPath: string;
  playlists: Record<string, string[]>;
  onClose: () => void;
  onAddToPlaylist: (plName: string, trackPath: string) => void;
  currentPlaylist?: string | null;
  isFavoritesView?: boolean;
  onRemoveFromPlaylist?: (plName: string, trackPath: string) => void;
  showDetailsOption?: boolean;
}

const TrackDropdownMenu: React.FC<TrackDropdownMenuProps> = ({
  trackPath,
  playlists,
  onClose,
  onAddToPlaylist,
  currentPlaylist,
  isFavoritesView,
  onRemoveFromPlaylist,
  showDetailsOption = false,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        className="absolute right-0 top-6 mt-1 w-48 bg-surface border border-divider rounded-xl shadow-2xl z-40 py-2 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {onRemoveFromPlaylist && currentPlaylist && !isFavoritesView && (
          <>
            <button
              onClick={() => {
                onRemoveFromPlaylist(currentPlaylist, trackPath);
                onClose();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              Eliminar de la playlist
            </button>
            <div className="border-t border-divider my-1"></div>
          </>
        )}

        <div className="px-4 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider">
          {t("common.addToPlaylist", "Añadir a Playlist...")}
        </div>
        <div className="max-h-40 overflow-y-auto custom-scrollbar">
          {Object.keys(playlists)
            .filter((pl) => pl !== currentPlaylist)
            .map((plName) => (
              <button
                key={plName}
                onClick={() => {
                  onAddToPlaylist(plName, trackPath);
                  onClose();
                }}
                className="w-full text-left px-4 py-2 text-sm text-content hover:bg-brand-primary/10 hover:text-brand-primary transition-colors truncate"
              >
                {plName}
              </button>
            ))}
          {Object.keys(playlists).filter((pl) => pl !== currentPlaylist)
            .length === 0 && (
            <div className="px-4 py-2 text-sm text-muted/70 italic">
              {t("common.noPlaylists", "No hay otras playlists")}
            </div>
          )}
        </div>

        {showDetailsOption && (
          <>
            <div className="border-t border-divider my-1"></div>
            <button
              onClick={() => onClose()} 
              className="w-full text-left px-4 py-2 text-sm text-content hover:bg-background transition-colors"
            >
              {t("common.seeDetails", "Ver detalles")}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default TrackDropdownMenu;
