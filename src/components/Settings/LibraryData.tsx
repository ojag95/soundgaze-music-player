import React, { useState } from "react";
import { FolderOpen, RefreshCw, ImageMinus, Columns, CheckCircle2 } from "lucide-react"; // <--- AÑADIDO CheckCircle2
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";
import { useTranslation } from "react-i18next"; 

const ToggleSwitch = ({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: () => void; 
}) => (
  <div className="flex items-center justify-between p-3 bg-background border border-divider rounded-lg hover:border-brand-primary/50 transition-colors">
    <span className="text-sm font-medium text-content">{label}</span>
    <button
      onClick={onChange}
      className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 ${
        checked ? "bg-brand-primary" : "bg-surface-hover border border-divider"
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

const LibraryData: React.FC = () => {
  const { 
    basePath, 
    isScanning, 
    selectDirectory, 
    scanDatabase, 
    clearCoverCache,
    visibleColumns,
    toggleColumn    
  } = useLibrarySettingsStore();

  const { t } = useTranslation(); 
  
  const [showToast, setShowToast] = useState(false);

  const handleClearCache = () => {
    clearCoverCache();
    setShowToast(true);
    
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-bold text-content mb-1">{t("settings.libraryAndData")}</h2>
        <p className="text-sm text-muted">{t("libraryData.subtitle")}</p>
      </div>

      <div className="space-y-6">
        
        <section className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <FolderOpen size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("libraryData.pathTitle")}</h3>
              <p className="text-xs text-muted max-w-md mb-2">
                {t("libraryData.pathDesc")}
              </p>
              <div className="bg-background border border-divider px-3 py-1.5 rounded-md inline-block">
                <span className="text-xs font-mono text-muted">
                  {basePath || t("libraryData.defaultPath")}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={selectDirectory}
            className="shrink-0 px-4 py-2 bg-surface hover:bg-surface-hover border border-divider text-content text-sm font-medium rounded-md transition-colors"
          >
            {t("libraryData.changePath")}
          </button>
        </section>

        <section className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <RefreshCw size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("libraryData.scanTitle")}</h3>
              <p className="text-xs text-muted max-w-md">
                {t("libraryData.scanDesc")}
              </p>
            </div>
          </div>
          
          <button 
            onClick={scanDatabase}
            disabled={isScanning}
            className="flex items-center gap-2 shrink-0 px-4 py-2 bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 text-sm font-medium rounded-md transition-all"
          >
            <RefreshCw size={16} className={isScanning ? "animate-spin" : ""} />
            {isScanning ? t("libraryData.scanning") : t("libraryData.updateDb")}
          </button>
        </section>

        <section className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <ImageMinus size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("libraryData.cacheTitle")}</h3>
              <p className="text-xs text-muted max-w-md">
                {t("libraryData.cacheDesc")}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleClearCache} // ✨ NUEVO: Usamos nuestra función personalizada
            className="shrink-0 px-4 py-2 bg-surface hover:bg-red-500/10 border border-divider text-red-500 hover:text-red-500 hover:border-red-500/50 text-sm font-medium rounded-md transition-colors"
          >
            {t("libraryData.clearCache")}
          </button>
        </section>

        <section className="flex flex-col gap-4 pb-6">
          <div className="flex gap-3 mb-2">
            <Columns size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("settings.columnsTitle")}</h3>
              <p className="text-xs text-muted max-w-md">
                {t("libraryData.columnsDesc")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pl-0 sm:pl-8">
            <ToggleSwitch 
              label={t("common.album")} 
              checked={visibleColumns.album} 
              onChange={() => toggleColumn("album")} 
            />
            <ToggleSwitch 
              label={t("common.genre")} 
              checked={visibleColumns.genre} 
              onChange={() => toggleColumn("genre")} 
            />
            <ToggleSwitch 
              label={t("common.year")} 
              checked={visibleColumns.date} 
              onChange={() => toggleColumn("date")} 
            />
            <ToggleSwitch 
              label={t("common.duration")} 
              checked={visibleColumns.time} 
              onChange={() => toggleColumn("time")} 
            />
          </div>
        </section>

      </div>

      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-surface border border-divider shadow-2xl rounded-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <CheckCircle2 size={18} className="text-brand-primary" />
          <span className="text-sm font-semibold text-content shadow-sm">
            {t("libraryData.cacheAlert")}
          </span>
        </div>
      )}

    </div>
  );
};

export default LibraryData;