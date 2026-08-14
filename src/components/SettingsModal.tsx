import { useState, useEffect } from "react";
import {
  X,
  Info,
  Palette,
  MonitorPlay,
  Keyboard,
  Library,
  Server,
  Computer,
  HardDrive,
  Puzzle,
} from "lucide-react";
import { useUIStore } from "../store/uiStore";
import Appearance from "./Settings/Appearance";
import Playback from "./Settings/Playback";
import LibraryData from "./Settings/LibraryData";
import Daemon from "./Settings/Daemon";
import SystemSettings from "./Settings/SystemSettings";
import { useTranslation } from "react-i18next";
import About from "./Settings/About";
import PluginsSettings from "./Settings/Plugins";
import StorageSettings from "./Settings/StorageSettings";

export default function SettingsModal() {
  const { isSettingsOpen, closeSettings } = useUIStore();
  const [activeTab, setActiveTab] = useState("about");
  
  const { t } = useTranslation();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeSettings]);

  if (!isSettingsOpen) return null;

  const tabs = [
    { id: "about", icon: <Info size={18} /> },
    { id: "appearance", icon: <Palette size={18} /> },
    { id: "library", icon: <Library size={18} /> },
    { id: "player", icon: <MonitorPlay size={18} /> },
    { id: "connection", icon: <Server size={18} /> },
    { id: "system", icon: <Computer size={18} /> },
    { id: "storage", icon: <HardDrive size={18} /> },
    { id: "plugins", icon: <Puzzle size={18} /> }, 
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl h-[85vh] bg-background border border-divider rounded-xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeSettings}
          className="absolute top-4 right-4 text-muted hover:text-content bg-surface/50 hover:bg-surface p-1.5 rounded-md transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="w-64 bg-surface/40 border-r border-divider flex flex-col py-6 overflow-y-auto">
          <div className="px-6 mb-4 text-xs font-bold text-muted uppercase tracking-wider">
            {t("settings.options")}
          </div>

          <nav className="space-y-0.5 px-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-muted hover:text-content hover:bg-surface"
                }`}
              >
                {tab.icon}
                {t(`settings.tabs.${tab.id}`)}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-background overflow-y-auto">
          <div className="max-w-3xl mx-auto px-10 py-12">
            {activeTab === "about" && <About />}

            {activeTab === "appearance" && <Appearance />}
            
            {activeTab === "player" && <Playback />}
            
            {activeTab === "library" && <LibraryData />}
            
            {activeTab === "connection" && <Daemon />}
            
            {activeTab === "system" && <SystemSettings />}

            {activeTab === "storage" && <StorageSettings />}

            {activeTab === "plugins" && <PluginsSettings/>}
              
          </div>
        </div>
      </div>
    </div>
  );
}