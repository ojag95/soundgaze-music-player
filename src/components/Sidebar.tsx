import { NavLink, useNavigate } from "react-router-dom";
import { usePlayerStore } from "../store/playerStore";
import {
  Library,
  Settings,
  X,
  List,
  ListMusic,
  PanelLeftClose,
  PanelLeftOpen,
  Heart,
  Waypoints,
  Timeline,
} from "lucide-react";
import { useState } from "react";
import { useUIStore } from "../store/uiStore";
import { usePluginStore } from "../store/pluginStore";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  isMobileOpen: boolean;
  closeMobile: () => void;
}

export default function Sidebar({ isMobileOpen, closeMobile }: SidebarProps) {
  const { openSettings } = useUIStore();
  const { t } = useTranslation();

  const playlists = usePlayerStore((s) => s.playlists);
  const selectedPlaylist = usePlayerStore((s) => s.selectedPlaylist);
  const isFavoritesView = usePlayerStore((s) => s.isFavoritesView);
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const selectPlaylist = usePlayerStore((s) => s.selectPlaylist);
  const selectFavorites = usePlayerStore((s) => s.selectFavorites);

  const { isPluginActive } = usePluginStore();
  const isGraphActive = isPluginActive("genre-explorer");
  const isTimelineActive = isPluginActive("timeline-view");

  const navigate = useNavigate();

  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const [hoveredPlaylist, setHoveredPlaylist] = useState<{
    name: string;
    top: number;
  } | null>(null);

  const showText = isMobileOpen || isDesktopExpanded;

  const links = [
    { to: "/", label: t("common.yourLibrary"), icon: <Library size={22} /> },
  ];

  if (isGraphActive) {
    links.push({
      to: "/graphical-view",
      label: "Vista Gráfica",
      icon: <Waypoints size={22} />,
    });
  }

  if (isTimelineActive) {
    links.push({
      to: "/timeline-view",
      label: t("plugins.timelineView.title", "Línea de Tiempo"),
      icon: <Timeline size={22} />,
    });
  }

  links.push({
      to: "/playlists",
      label: t("common.playlists"),
      icon: <List size={22} />,
    })
  const handlePlaylistClick = (plName: string) => {
    selectPlaylist(plName);
    navigate("/playlists");
    closeMobile();
  };

  const handleFavoritesClick = () => {
    selectFavorites();
    navigate("/playlists");
    closeMobile();
  };

  return (
    <aside
      className={`
      fixed inset-y-0 left-0 z-60 md:z-40 bg-surface border-r border-divider flex flex-col transition-all duration-300 ease-in-out h-full
      ${isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"} 
      md:relative md:translate-x-0 w-64 ${isDesktopExpanded ? "md:w-64" : "md:w-20"} 
    `}
    >
      <div className="space-y-6 p-4 shrink-0">
        <div
          className={`flex items-center ${showText ? "justify-between" : "justify-center"} px-2 py-2`}
        >
          {showText && (
            <span className="text-lg font-bold tracking-wider text-muted animate-in fade-in duration-200">
              SOUNDGAZE
            </span>
          )}

          <button
            className="hidden md:flex text-muted hover:text-content p-1 transition-transform"
            onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
            title={
              isDesktopExpanded
                ? t("common.collapseSidebar")
                : t("common.expandSidebar")
            }
          >
            {isDesktopExpanded ? (
              <PanelLeftClose size={24} className="ml-1" />
            ) : (
              <PanelLeftOpen size={24} className="ml-1" />
            )}
          </button>

          <button
            className="md:hidden text-muted hover:text-content p-1"
            onClick={closeMobile}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeMobile}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive && !isFavoritesView
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-muted hover:bg-surface-hover hover:text-content"
                } ${!showText ? "md:justify-center" : ""}`
              }
            >
              <span className="shrink-0">{link.icon}</span>
              <span className={`truncate ${showText ? "block" : "hidden"}`}>
                {link.label}
              </span>

              <div
                className={`absolute left-full ml-3 px-2 py-1 bg-background text-content text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden ${!isDesktopExpanded ? "md:block" : ""} z-50 whitespace-nowrap shadow-lg`}
              >
                {link.label}
              </div>
            </NavLink>
          ))}
        </nav>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1 border-t border-divider/50 mt-2 pt-4 custom-scrollbar"
        onWheel={() => setHoveredPlaylist(null)}
      >
        <span
          className={`text-xs font-semibold text-muted uppercase tracking-wider px-3 mb-2 ${showText ? "block" : "hidden"}`}
        >
          {t("common.playlists")}
        </span>

        <button
          onClick={handleFavoritesClick}
          onMouseEnter={(e) => {
            if (!isDesktopExpanded) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredPlaylist({
                name: t("common.likedSongs"),
                top: rect.top,
              });
            }
          }}
          onMouseLeave={() => setHoveredPlaylist(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            !showText ? "md:justify-center" : ""
          } ${isFavoritesView ? "text-brand-primary bg-brand-primary/10" : "text-muted hover:bg-surface-hover hover:text-content"}`}
        >
          <span className="shrink-0">
            <Heart size={20} fill={isFavoritesView ? "currentColor" : "none"} />
          </span>
          <span className={`truncate ${showText ? "block" : "hidden"}`}>
            {t("common.likedSongs")}
          </span>
        </button>

        {Object.keys(playlists).map((plName) => {
          const isActive = selectedPlaylist === plName;

          return (
            <button
              key={plName}
              onClick={() => handlePlaylistClick(plName)}
              onMouseEnter={(e) => {
                if (!isDesktopExpanded) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredPlaylist({ name: plName, top: rect.top });
                }
              }}
              onMouseLeave={() => setHoveredPlaylist(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !showText ? "md:justify-center" : ""
              } ${
                isActive
                  ? "text-brand-primary bg-brand-primary/10"
                  : "text-muted hover:bg-surface-hover hover:text-content"
              }`}
            >
              <span className="shrink-0">
                <ListMusic size={20} />
              </span>
              <span className={`truncate ${showText ? "block" : "hidden"}`}>
                {plName}
              </span>
            </button>
          );
        })}

        {Object.keys(playlists).length === 0 && (
          <div
            className={`px-3 pt-2 text-xs text-muted/70 italic ${showText ? "block" : "hidden"}`}
          >
            {t("common.noPlaylists")}
          </div>
        )}
      </div>

      <div
        className={`space-y-4 p-4 shrink-0 transition-all duration-500 ease-in-out ${
          currentTrack ? "pb-32 " : "pb-6"
        }`}
      >
        <nav className="space-y-2"></nav>
        <div className="space-y-2">
          <button
            onClick={() => {
              openSettings();
              closeMobile();
            }}
            className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-muted hover:bg-surface-hover hover:text-content ${
              !showText ? "md:justify-center" : ""
            }`}
          >
            <span className="shrink-0">
              <Settings size={22} />
            </span>
            <span className={`truncate ${showText ? "block" : "hidden"}`}>
              {t("common.settings")}
            </span>

            <div
              className={`absolute left-full ml-3 px-2 py-1 bg-background text-content text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden ${!isDesktopExpanded ? "md:block" : ""} z-50 whitespace-nowrap shadow-lg`}
            >
              {t("common.settings")}
            </div>
          </button>
        </div>
      </div>

      {hoveredPlaylist && !isMobileOpen && !isDesktopExpanded && (
        <div
          className="fixed left-20 ml-2 px-2 py-1 bg-background text-content text-xs rounded pointer-events-none hidden md:block z-[100] whitespace-nowrap shadow-lg animate-in fade-in duration-150"
          style={{ top: `${hoveredPlaylist.top + 8}px` }}
        >
          {hoveredPlaylist.name}
        </div>
      )}
    </aside>
  );
}
