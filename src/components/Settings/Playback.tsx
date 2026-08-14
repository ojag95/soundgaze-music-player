import React from "react";
import { SlidersHorizontal, Volume2, PlayCircle, Speaker } from "lucide-react";
import { usePlaybackSettingsStore } from "../../store/playbackSettingsStore";
import { useTranslation } from "react-i18next";

const Playback: React.FC = () => {
  const {
    crossfade,
    normalizeVolume,
    resumeOnStartup,
    outputDevice,
    setCrossfade,
    toggleNormalizeVolume,
    toggleResumeOnStartup,
    setOutputDevice,
  } = usePlaybackSettingsStore();

  const { t } = useTranslation();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-bold text-content mb-1">{t("playback.title")}</h2>
        <p className="text-sm text-muted">{t("playback.subtitle")}</p>
      </div>

      <div className="space-y-6">
        
        <section className="flex flex-col gap-4 pb-6 border-b border-divider/50">
          <div className="flex items-start justify-between gap-8">
            <div className="flex gap-3">
              <SlidersHorizontal size={20} className="text-muted shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-content mb-1">{t("playback.crossfadeTitle")}</h3>
                <p className="text-xs text-muted max-w-md">
                  {t("playback.crossfadeDesc")}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xl font-bold text-brand-primary">{crossfade}s</span>
            </div>
          </div>
          
          <div className="pl-8 w-full max-w-lg flex items-center gap-4 mt-2">
            <span className="text-xs text-muted font-medium">0s</span>
            <input 
              type="range" 
              min="0" 
              max="12" 
              step="1"
              value={crossfade}
              onChange={(e) => setCrossfade(Number(e.target.value))}
              className="flex-1 h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-brand-primary"
            />
            <span className="text-xs text-muted font-medium">12s</span>
          </div>
        </section>

        <section className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <Volume2 size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("playback.normalizeTitle")}</h3>
              <p className="text-xs text-muted max-w-md">
                {t("playback.normalizeDesc")}
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleNormalizeVolume}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${normalizeVolume ? 'bg-brand-primary' : 'bg-surface border border-divider'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${normalizeVolume ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </section>

        <section className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <PlayCircle size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("playback.resumeTitle")}</h3>
              <p className="text-xs text-muted max-w-md">
                {t("playback.resumeDesc")}
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleResumeOnStartup}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${resumeOnStartup ? 'bg-brand-primary' : 'bg-surface border border-divider'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${resumeOnStartup ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </section>

        <section className="flex items-center justify-between gap-8 pb-6">
          <div className="flex gap-3">
            <Speaker size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("playback.outputTitle")}</h3>
              <p className="text-xs text-muted max-w-md">
                {t("playback.outputDesc")}
              </p>
            </div>
          </div>
          
          <select 
            value={outputDevice}
            onChange={(e) => setOutputDevice(e.target.value)}
            className="bg-background border border-divider text-content text-sm rounded-md px-4 py-2 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-48 cursor-pointer transition-colors"
          >
            <option className="bg-background text-content" value="default">{t("playback.outputDefault")}</option>
            <option className="bg-background text-content" value="hdmi">{t("playback.outputHdmi")}</option>
            <option className="bg-background text-content" value="analog">{t("playback.outputAnalog")}</option>
          </select>
        </section>

      </div>
    </div>
  );
};

export default Playback;