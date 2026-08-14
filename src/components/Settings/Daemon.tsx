import React, { useState } from "react";
import { Server, Network, Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useDaemonSettingsStore } from "../../store/daemonSettingsStore";
import { useTranslation } from "react-i18next";

/**
 * Módulo de configuración para los parámetros del daemon MPD
 * @returns Componente de configuración de MPD
 */
const Daemon: React.FC = () => {
  const { host, port, password, isTesting, connectionStatus, testAndSaveConnection } = useDaemonSettingsStore();
  const { t } = useTranslation();
  
  const [localHost, setLocalHost] = useState(host);
  const [localPort, setLocalPort] = useState(port);
  const [localPassword, setLocalPassword] = useState(password);

  const handleTestConnection = () => {
    testAndSaveConnection(localHost, localPort, localPassword);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-bold text-content mb-1">{t("daemon.title")}</h2>
        <p className="text-sm text-muted">{t("daemon.subtitle")}</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        
        <section className="flex items-start justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <Server size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("daemon.hostTitle")}</h3>
              <p className="text-xs text-muted max-w-sm mb-2">
                {t("daemon.hostDesc1")} <code className="bg-surface px-1 py-0.5 rounded text-brand-primary">127.0.0.1</code> {t("daemon.hostDesc2")}
              </p>
            </div>
          </div>
          <input 
            type="text" 
            value={localHost}
            onChange={(e) => setLocalHost(e.target.value)}
            placeholder={t("daemon.hostPlaceholder")}
            className="w-48 bg-background border border-divider rounded-md px-3 py-2 text-sm text-content focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
          />
        </section>

        <section className="flex items-start justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <Network size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("daemon.portTitle")}</h3>
              <p className="text-xs text-muted max-w-sm">
                {t("daemon.portDesc")}
              </p>
            </div>
          </div>
          <input 
            type="text" 
            value={localPort}
            onChange={(e) => setLocalPort(e.target.value)}
            placeholder="6600"
            className="w-48 bg-background border border-divider rounded-md px-3 py-2 text-sm text-content focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
          />
        </section>

        <section className="flex items-start justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <Shield size={20} className="text-muted shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-content mb-1">{t("daemon.passwordTitle")}</h3>
              <p className="text-xs text-muted max-w-sm">
                {t("daemon.passwordDesc")}
              </p>
            </div>
          </div>
          <input 
            type="password" 
            value={localPassword}
            onChange={(e) => setLocalPassword(e.target.value)}
            placeholder="••••••••"
            className="w-48 bg-background border border-divider rounded-md px-3 py-2 text-sm text-content focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
          />
        </section>

        <div className="flex items-center gap-4 pt-2">
          <button 
            onClick={handleTestConnection}
            disabled={isTesting || !localHost || !localPort}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:opacity-90 disabled:opacity-50 text-sm font-medium rounded-md transition-all"
          >
            {isTesting && <Loader2 size={16} className="animate-spin" />}
            {isTesting ? t("daemon.connecting") : t("daemon.testAndSave")}
          </button>

          {connectionStatus === 'success' && (
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium animate-in fade-in">
              <CheckCircle2 size={18} />
              <span>{t("daemon.connectionSuccess")}</span>
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-in fade-in">
              <XCircle size={18} />
              <span>{t("daemon.connectionError")}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Daemon;