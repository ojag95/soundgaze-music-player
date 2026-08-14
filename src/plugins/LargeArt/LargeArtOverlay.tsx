import React, { useEffect, useState } from "react";
import { X, Disc3, Play, Pause, SkipBack, SkipForward, Mic2 } from "lucide-react";
import { usePlayerStore } from "../../store/playerStore";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";
import { useUIStore } from "../../store/uiStore";
import { usePluginStore } from "../../store/pluginStore";
import LyricsView from "../Lyrics/LyricsView";

const formatTime = (secs: number) => {
  if (isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const LargeArtOverlay: React.FC = () => {
  const { currentTrack, state, togglePlay, playNext, playPrev, elapsedSecs, totalSecs, seekTo } = usePlayerStore();
  const { basePath, coverCacheBuster } = useLibrarySettingsStore();
  const { closeLargeArt } = useUIStore();
  
  const { largeArtSettings, isPluginActive } = usePluginStore();
  const isLyricsActive = isPluginActive('lyrics'); 
  const [showLyrics, setShowLyrics] = useState(true); 
  
  const displayLyrics = isLyricsActive && showLyrics;
  
  const { backgroundType, enableBlur, enableAnimation, dynamicTheme } = largeArtSettings;

  const [imgError, setImgError] = useState(false);
  const [isLightState, setIsLightState] = useState(false);

  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const [localElapsedSecs, setLocalElapsedSecs] = useState(elapsedSecs);

  useEffect(() => {
    if (!isDraggingTime) setLocalElapsedSecs(elapsedSecs);
  }, [elapsedSecs, isDraggingTime]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLargeArt();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeLargeArt]);

  useEffect(() => {
    setImgError(false);
  }, [currentTrack?.path]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!dynamicTheme) return; 
    
    const img = e.currentTarget;
    const canvas = document.createElement('canvas');
    canvas.width = 50; 
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    try {
      ctx.drawImage(img, 0, 0, 50, 50);
      const data = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i + 1]; b += data[i + 2];
      }
      const pixels = data.length / 4;
      r = Math.floor(r / pixels);
      g = Math.floor(g / pixels);
      b = Math.floor(b / pixels);
      
      const brightness = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
      setIsLightState(brightness > 130);
    } catch (err) {
      console.warn("No se pudo leer el color de la imagen", err);
    }
  };

  if (!currentTrack) return null;

  const isPlaying = state === "Play";
  const coverUrl = `cover://localhost/?path=${encodeURIComponent(currentTrack.path)}&base=${encodeURIComponent(basePath)}&t=${coverCacheBuster}`;
  const isLight = dynamicTheme ? isLightState : false; 

  const displaySecs = isDraggingTime ? localElapsedSecs : elapsedSecs;
  const timePercentage = totalSecs > 0 ? (displaySecs / totalSecs) * 100 : 0;

  return (
    <div 
      className={`fixed inset-0 z-[200] flex flex-col justify-end p-6 md:p-12 lg:p-16 animate-in fade-in duration-500 overflow-hidden transition-colors duration-1000 isolate ${
        backgroundType === 'solid' ? (isLight ? 'bg-white' : 'bg-[#121212]') : 
        isLight ? 'bg-white' : 'bg-background'
      }`}
      onClick={closeLargeArt}
    >
      {enableAnimation && (
        <style>{`
          @keyframes breathe { 0% { transform: scale(1.1); } 50% { transform: scale(1.25); } 100% { transform: scale(1.1); } }
        `}</style>
      )}

      {backgroundType === 'cover' && (
        <div 
          key={`bg-${currentTrack.path}`}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat animate-in fade-in duration-1000 transition-all ${
            !enableBlur 
              ? 'opacity-30 scale-100 saturate-100' 
              : isLight 
                ? 'blur-3xl scale-125 opacity-70 saturate-100 brightness-100' 
                : 'blur-3xl scale-125 opacity-70 saturate-150 brightness-90'
          }`}
          style={{ 
            backgroundImage: !imgError ? `url("${coverUrl}")` : "none",
            animation: enableAnimation ? 'breathe 25s ease-in-out infinite' : 'none',
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        />
      )}

      {backgroundType === 'gradient' && (
        <div className={`absolute inset-0 bg-gradient-to-br ${isLight ? 'from-gray-100 to-gray-300' : 'from-surface to-background'}`} />
      )}

      {backgroundType === 'cover' && (
         <div className={`absolute inset-x-0 bottom-0 h-[75%] pointer-events-none bg-gradient-to-t transition-colors duration-1000 ${isLight ? 'from-white via-white/80 to-transparent' : 'from-background via-background/90 to-transparent'}`} />
      )}

      <button
        onClick={(e) => { e.stopPropagation(); closeLargeArt(); }}
        className={`absolute top-8 right-8 backdrop-blur-md p-3 rounded-full transition-all hover:scale-110 z-20 ${isLight ? 'text-black/70 hover:text-black bg-white/40 hover:bg-white/60' : 'text-white/70 hover:text-white bg-black/20 hover:bg-black/40'}`}
      >
        <X size={28} />
      </button>

      <div 
        key={`content-${currentTrack.path}`} 
        className={`relative z-10 flex w-full h-full animate-in slide-in-from-bottom-12 fade-in duration-700 gap-6 md:gap-12 lg:gap-16 ${
          displayLyrics ? 'flex-col md:flex-row items-center justify-center' : 'flex-col justify-end'
        }`} 
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className={`flex min-h-0 ${
          displayLyrics 
            ? 'w-full md:w-1/2 lg:w-5/12 flex-col shrink justify-center gap-4 md:gap-6' 
            : 'w-full flex-col md:flex-row md:items-end shrink-0 gap-6 md:gap-8'
        }`}>
          
          <div className={`rounded-xl shadow-2xl overflow-hidden border flex items-center justify-center shrink min-h-0 mx-auto md:mx-0 ${isLight ? 'bg-white/50 border-black/10' : 'bg-surface/80 border-white/10'} ${
            displayLyrics 
              ? 'w-full max-w-[200px] sm:max-w-[260px] lg:max-w-[350px] aspect-square' 
              : 'w-40 h-40 md:w-64 md:h-64 lg:w-80 lg:h-80 shrink-0'
          }`}>
            {!imgError ? (
              <img
                src={coverUrl}
                alt={currentTrack.title}
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover shadow-[0_0_40px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <Disc3 size={80} className={`${isLight ? 'text-black/20' : 'text-white/20'} animate-[spin_10s_linear_infinite]`} />
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0 transition-colors duration-1000 justify-end w-full">
            <div className="mb-4 md:mb-6 text-center md:text-left">
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl xl:text-6xl py-1 font-extrabold drop-shadow-lg truncate mb-1 md:mb-2 ${isLight ? 'text-black' : 'text-white'}`}>
                {currentTrack.title}
              </h1>
              <p className={`text-lg sm:text-xl lg:text-3xl py-1 font-medium drop-shadow-md truncate ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                {currentTrack.artist}
              </p>
              <p className={`text-xs sm:text-sm mt-2 lg:mt-3 tracking-widest uppercase truncate font-semibold ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                {currentTrack.album} {currentTrack.date ? `• ${currentTrack.date}` : ""}
              </p>
            </div>

            <div className={`w-full flex items-center gap-3 text-xs sm:text-sm font-variant-numeric mb-6 transition-colors duration-1000 ${isLight ? 'text-black/70' : 'text-white/70'}`}>
              <span className="w-10 text-right md:text-left">{formatTime(displaySecs)}</span>

              <div className="relative flex-1 h-1.5 md:h-2 flex items-center group cursor-pointer">
                <div className={`absolute inset-0 border rounded-full overflow-hidden pointer-events-none transition-colors duration-1000 ${isLight ? 'bg-black/10 border-black/10' : 'bg-white/10 border-white/10'}`}>
                  <div
                    className={`h-full transition-colors duration-1000 ${isLight ? 'bg-black' : 'bg-white'}`}
                    style={{
                      width: `${timePercentage}%`,
                      transition: isDraggingTime ? "none" : "width 1s linear",
                    }}
                  />
                </div>

                <div
                  className={`absolute w-3 h-3 md:w-4 md:h-4 rounded-full top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 shadow-sm ${
                    isLight ? 'bg-black' : 'bg-white'
                  } ${
                    isDraggingTime
                      ? "opacity-100 scale-125"
                      : "opacity-0 group-hover:opacity-100 scale-100"
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
                  onChange={(e) => setLocalElapsedSecs(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0 disabled:cursor-not-allowed"
                />
              </div>

              <span className="w-10 text-left md:text-right">
                {currentTrack ? formatTime(totalSecs) : "0:00"}
              </span>
            </div>

            <div className="flex items-center gap-6 justify-center md:justify-start">
              <button onClick={playPrev} className={`transition-colors hover:scale-110 transform ${isLight ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white'}`}>
                <SkipBack size={32} fill="currentColor" />
              </button>
              <button onClick={togglePlay} className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={playNext} className={`transition-colors hover:scale-110 transform ${isLight ? 'text-black/60 hover:text-black' : 'text-white/60 hover:text-white'}`}>
                <SkipForward size={32} fill="currentColor" />
              </button>
              
              {isLyricsActive && (
                <button 
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`ml-4 transition-all hover:scale-110 transform ${
                    showLyrics 
                      ? (isLight ? 'text-black drop-shadow-sm' : 'text-white drop-shadow-md') 
                      : (isLight ? 'text-black/30 hover:text-black/70' : 'text-white/30 hover:text-white/70')
                  }`}
                  title={showLyrics ? "Ocultar letras" : "Mostrar letras"}
                >
                  <Mic2 size={24} />
                </button>
              )}
            </div>
          </div>
        </div>

        {displayLyrics && (
          <div className="hidden md:flex flex-1 h-[80vh] md:h-full relative pl-8 border-l border-white/10 animate-in fade-in duration-500">
            <LyricsView isLight={isLight} />
          </div>
        )}
        
      </div>
    </div>
  );
};

export default LargeArtOverlay;