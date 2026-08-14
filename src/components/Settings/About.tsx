import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-shell";
import SoundgazeLogo from "../../assets/SoundgazeLogo.png";

export default function About() {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleOpenGithub = async () => {
    try {
      await open("https://github.com/ojag95");
    } catch (error) {
      console.error("Error al abrir el enlace externo:", error);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-2xl font-bold text-content">{t("about.title")}</h2>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div>
            <div className="flex flex-row gap-x-4 justify-center items-center pb-8">
              <img
                src={SoundgazeLogo}
                alt="Portada del álbum"
                className="w-16 h-16 object-cover animate-in fade-in duration-300"
              />
              <div>
                <h1 className="text-4xl font-bold">Soundgaze Music player</h1>
                <span className="text-sm font-medium text-content mb-1">
                  {t("about.version")}
                </span>
              </div>
            </div>

            {/*
            <button className="text-xs text-brand-primary hover:underline mt-1">
              {t("about.readChangelog")}
            </button>*/}
          </div>
          {/*
          <button className="px-4 py-2 bg-surface hover:bg-surface-hover border border-divider text-content text-sm font-medium rounded-md transition-colors">
            {t("about.checkForUpdates")}
          </button>*/}
        </div>

        <div className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div>
            <h3 className="text-sm font-medium text-content mb-1">
              {t("about.language")}
            </h3>
            <p className="text-xs text-muted">{t("about.languageDesc")}</p>
          </div>
          <select
            value={i18n.language.slice(0, 2)}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-surface border border-divider text-content text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-primary cursor-pointer"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
      {/** 
      <h2 className="text-xl font-bold text-content pt-4">
        {t("about.advanced")}
      </h2>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div>
            <h3 className="text-sm font-medium text-content mb-1">
              {t("about.notifySlowOpen")}
            </h3>
            <p className="text-xs text-muted">
              {t("about.notifySlowOpenDesc")}
            </p>
          </div>
          <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface border border-divider cursor-pointer transition-colors">
            <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-muted transition-transform" />
          </div>
        </div>
      </div>
      */}
      <div className="pt-8 mt-auto">
        <div className="flex flex-col items-center justify-center p-6 bg-surface/30 rounded-xl border border-divider/50 text-center">
          <p className="text-sm text-content font-medium flex items-center justify-center gap-1.5 flex-wrap">
            {t("about.madeWithHeart")}
            <button
              onClick={handleOpenGithub}
              className="font-bold flex items-center gap-1 text-brand-primary hover:underline transition-all hover:scale-105"
            >
              Oscar Josué Avila Gutierrez
              <ExternalLink size={14} />
            </button>
          </p>
          <p className="text-xs text-muted mt-2">{t("about.license")}</p>
        </div>
      </div>
    </div>
  );
}
