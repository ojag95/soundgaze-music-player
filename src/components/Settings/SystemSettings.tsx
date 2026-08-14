import React from "react";
import { AppWindow } from "lucide-react";
import { useSystemSettingsStore } from "../../store/systemSettingsStore";
import { useTranslation } from "react-i18next";

const SystemSettings: React.FC = () => {
  const { minimizeToTray, toggleMinimizeToTray } = useSystemSettingsStore();
  const { t } = useTranslation();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-bold text-content mb-1">{t("system.title")}</h2>
        <p className="text-sm text-muted">{t("system.subtitle")}</p>
      </div>

      <div className="space-y-6">
        
        <section className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <AppWindow size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("system.minimizeToTrayTitle")}</h3>
              <p className="text-xs text-muted max-w-md">
                {t("system.minimizeToTrayDesc")}
              </p>
            </div>
          </div>
          
          <button 
            onClick={toggleMinimizeToTray}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${minimizeToTray ? 'bg-brand-primary' : 'bg-surface border border-divider'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${minimizeToTray ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </section>

      </div>
    </div>
  );
};

export default SystemSettings;