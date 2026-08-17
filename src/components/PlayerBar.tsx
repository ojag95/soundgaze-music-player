import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Disc3,
  VolumeX,
  Volume,
  Volume1,
  ListMusic,
} from "lucide-react";
import { usePlayerStore } from "../store/playerStore";
import { useLibrarySettingsStore } from "../store/librarySettingsStore";
import { listen } from "@tauri-apps/api/event";
import QueueDrawer from "./QueueDrawer";
import { useUIStore } from "../store/uiStore";
import { usePluginStore } from "../store/pluginStore";

const formatTime = (secs: number) => {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return isVisible;
}

const ProgressBar = () => {
  const globalElapsed = usePlayerStore((s) => s.elapsedSecs);
  const totalSecs = usePlayerStore((s) => s.totalSecs);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const state = usePlayerStore((s) => s.state);
  const seekTo = usePlayerStore((s) => s.seekTo);

  const isVisible = usePageVisibility(); 

  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const [localElapsed, setLocalElapsed] = useState(globalElapsed);

  useEffect(() => {
    if (!isDraggingTime) {
      setLocalElapsed(globalElapsed);
    }
  }, [globalElapsed, isDraggingTime]);

  useEffect(() => {
    if (state !== 'Play' || !isVisible) return; 
    
    const timer = setInterval(() => {
      setLocalElapsed(usePlayerStore.getState().getRealElapsedTime());
    }, 1000);
    return () => clearInterval(timer);
  }, [state, isDraggingTime, isVisible]); 

  const displaySecs = localElapsed;
  const timePercentage = totalSecs > 0 ? (displaySecs / totalSecs) * 100 : 0;
  const scaleFraction = totalSecs > 0 ? displaySecs / totalSecs : 0;

  return (
    <div className="w-full flex items-center gap-3 text-xs text-muted font-variant-numeric">
      <span className="w-8 text-right">{formatTime(displaySecs)}</span>

      <div className="relative flex-1 h-1.5 flex items-center group cursor-pointer">
        <div className="absolute inset-0 bg-background border border-divider/50 rounded-full overflow-hidden pointer-events-none transform-gpu">
          <div
            className="h-full bg-brand-primary origin-left will-change-transform"
            style={{
              transform: `scaleX(${scaleFraction})`,
              transition: isDraggingTime ? "none" : "transform 1s linear",
            }}
          />
        </div>

        <div
          className={`absolute w-3 h-3 bg-brand-primary rounded-full top-1/2 -translate-y-1/2 pointer-events-none transition-opacity shadow-sm will-change-transform transform-gpu ${
            isDraggingTime ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ left: `calc(${timePercentage}% - 6px)` }}
        />

        <input
          type="range"
          min="0"
          max={totalSecs || 100}
          value={displaySecs}
          disabled={!currentTrack || totalSecs === 0}
          onPointerDown={() => setIsDraggingTime(true)}
          onPointerUp={(e) => {
            setIsDraggingTime(false);
            seekTo(Number(e.currentTarget.value));
          }}
          onChange={(e) => setLocalElapsed(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0 disabled:cursor-not-allowed"
        />
      </div>

      <span className="w-8 text-left">
        {currentTrack ? formatTime(totalSecs) : "0:00"}
      </span>
    </div>
  );
};

export default function PlayerBar() {
  const state = usePlayerStore((s) => s.state);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const fetchState = usePlayerStore((s) => s.fetchState);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const volume = usePlayerStore((s) => s.volume);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const { basePath, coverCacheBuster } = useLibrarySettingsStore();
  const { isPluginActive } = usePluginStore();
  const { openLargeArt } = useUIStore();

  const isVisible = usePageVisibility();

  const [imgError, setImgError] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const [isDraggingVol, setIsDraggingVol] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    if (!isDraggingVol) setLocalVolume(volume);
  }, [volume, isDraggingVol]);

  useEffect(() => {
    setImgError(false);
  }, [currentTrack?.path, basePath, coverCacheBuster]);

  useEffect(() => {
    fetchState();
    const unlisten = listen("mpd-update", (event) => {
      const payload: any = event.payload;
      usePlayerStore.setState({
        state: payload.state,
        elapsedSecs: payload.elapsed_secs,
        totalSecs: payload.total_secs,
        currentTrack: payload.current_track,
        lastUpdateTimestamp: Date.now(),
      });
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const isPlaying = state === "Play";
  
  const shouldAnimate = isPlaying && isVisible;

  const coverUrl = currentTrack?.path
    ? `cover://localhost/?path=${encodeURIComponent(currentTrack.path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`
    : null;

  const volPercentage = localVolume;

  const handleInfoClick = () => {
    if (isPluginActive("large-art")) {
      openLargeArt();
    }
  };

  return (
    <>
      <footer
        className={`absolute bottom-4 left-4 right-4 h-24 rounded-lg bg-surface/95 border border-divider px-4 flex items-center justify-between z-40 md:z-50 shadow-lg transition-all duration-500 ease-in-out transform-gpu ${
          currentTrack
            ? "translate-y-0 opacity-100"
            : "translate-y-[150%] opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`flex items-center gap-3 w-1/4 ${isPluginActive("large-art") ? "cursor-pointer hover:bg-surface-hover/50 p-1.5 -ml-1.5 rounded-lg transition-colors group" : ""}`}
          onClick={handleInfoClick}
          title={isPluginActive("large-art") ? "Ver portada en grande" : ""}
        >
          <div className="w-12 h-12 bg-background rounded-md complex-shadow flex items-center justify-center text-muted flex-shrink-0 overflow-hidden group-hover:shadow-md transition-shadow">
            {coverUrl && !imgError ? (
              <img
                src={coverUrl}
                alt="Portada del álbum"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover animate-in fade-in duration-300"
              />
            ) : (
              <div
                className={`flex items-center justify-center transform-gpu will-change-transform ${shouldAnimate ? "animate-[spin_4s_linear_infinite]" : ""}`}
              >
                <Disc3 size={24} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p
              className={`text-sm font-medium text-content truncate ${isPluginActive("large-art") ? "group-hover:text-brand-primary transition-colors" : ""}`}
            >
              {currentTrack ? currentTrack.title : "Selecciona una pista"}
            </p>
            <p className="text-xs text-muted truncate">
              {currentTrack ? currentTrack.artist : "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
          <div className="flex items-center gap-5">
            <button
              onClick={playPrev}
              className="text-muted hover:text-content transition-colors"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!currentTrack}
              className="w-9 h-9 rounded-full bg-content text-background flex items-center justify-center hover:scale-105 transition-transform shadow-md disabled:opacity-50 transform-gpu"
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-1" />
              )}
            </button>
            <button
              onClick={playNext}
              className="text-muted hover:text-content transition-colors"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>
          </div>

          <ProgressBar />
        </div>

        <div className="flex items-center justify-end gap-3 w-1/4">
          <button
            className="text-muted hover:text-content transition-colors"
            onClick={() => setIsQueueOpen(true)}
          >
            <ListMusic size={20} />
          </button>
          <button
            className="text-muted hover:text-content transition-colors"
            onClick={() => {
              const newVal = localVolume === 0 ? 100 : 0;
              setLocalVolume(newVal);
              setVolume(newVal);
            }}
          >
            {localVolume === 0 ? (
              <VolumeX size={20} />
            ) : localVolume < 20 ? (
              <Volume size={20} />
            ) : localVolume < 50 ? (
              <Volume1 size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </button>

          <div className="relative w-24 h-1.5 flex items-center group cursor-pointer">
            <div className="absolute inset-0 bg-background border border-divider/50 rounded-full overflow-hidden pointer-events-none">
              <div
                className="h-full bg-brand-primary transition-all duration-75 transform-gpu"
                style={{ width: `${volPercentage}%` }}
              />
            </div>

            <div
              className={`absolute w-3 h-3 bg-brand-primary rounded-full top-1/2 -translate-y-1/2 pointer-events-none transition-opacity shadow-sm transform-gpu ${
                isDraggingVol
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              style={{ left: `calc(${volPercentage}% - 6px)` }}
            />

            <input
              type="range"
              step={10}
              min="0"
              max="100"
              value={localVolume}
              onPointerDown={() => setIsDraggingVol(true)}
              onPointerUp={() => {
                setIsDraggingVol(false);
                setVolume(localVolume);
              }}
              onChange={(e) => setLocalVolume(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
            />
          </div>
        </div>
      </footer>
      <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />
    </>
  );
}