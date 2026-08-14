import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useLyricsStore } from '../../store/lyricsStore';
import { useLibrarySettingsStore } from '../../store/librarySettingsStore';
import { Disc3 } from 'lucide-react';

interface LyricsViewProps {
  isLight: boolean;
}

const LyricsView: React.FC<LyricsViewProps> = ({ isLight }) => {
  const { currentTrack, elapsedSecs } = usePlayerStore();
  const { lines, isLoading, error, fetchLyrics } = useLyricsStore();
  const { basePath } = useLibrarySettingsStore();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const firstLineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (currentTrack?.path && basePath) {
      const absolutePath = `${basePath}/${currentTrack.path}`.replace(/\\/g, '/').replace(/\/+/g, '/');
      fetchLyrics(currentTrack.artist, currentTrack.title, absolutePath, currentTrack.lyrics);
    }
  }, [currentTrack?.path, basePath]);

  const activeIndex = React.useMemo(() => {
    if (!lines.length || lines[0].time === -1) return -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (elapsedSecs >= lines[i].time) return i;
    }
    return -1;
  }, [elapsedSecs, lines]);

useEffect(() => {
    const targetRef = activeIndex === -1 ? firstLineRef.current : activeLineRef.current;
    
    if (targetRef && containerRef.current) {
      targetRef.scrollIntoView({ behavior: 'auto', block: 'center' });      
      const timeout = setTimeout(() => {
        targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 750);

      return () => clearTimeout(timeout);
    }
  }, [activeIndex]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center animate-in fade-in">
        <Disc3 size={40} className={`animate-[spin_3s_linear_infinite] ${isLight ? 'text-black/20' : 'text-white/20'}`} />
      </div>
    );
  }

  if (error || lines.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className={`text-xl font-medium ${isLight ? 'text-black/40' : 'text-white/40'}`}>
          No se encontraron letras
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-hide py-[40vh] pr-8"
      >
        <div className="space-y-6 flex flex-col items-start">
          {lines.map((line, index) => {
            const isActive = index === activeIndex;
            const isStatic = line.time === -1;
            
            let lineRef = null;
            if (isActive) lineRef = activeLineRef;
            else if (index === 0) lineRef = firstLineRef;

            return (
              <p 
                key={index}
                ref={lineRef}
                className={`text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight transition-all duration-500 cursor-pointer ${
                  isStatic 
                    ? (isLight ? 'text-black/80 hover:text-black' : 'text-white/80 hover:text-white')
                    : isActive
                      ? (isLight ? 'text-black drop-shadow-sm scale-[1.02] transform origin-left' : 'text-white drop-shadow-lg scale-[1.02] transform origin-left') 
                      : (isLight ? 'text-black/30 hover:text-black/60' : 'text-white/30 hover:text-white/60')
                }`}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LyricsView;