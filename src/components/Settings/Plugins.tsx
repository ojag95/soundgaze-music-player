import React, { useState } from "react";
import {
  Maximize2,
  Settings,
  Mic2,
  Network,
  Calendar,
} from "lucide-react";
import {
  usePluginStore,
  PluginID,
  LargeArtSettings,
} from "../../store/pluginStore";
import { useTranslation } from "react-i18next";

const PluginsSettings: React.FC = () => {
  const {
    activePlugins,
    togglePlugin,
    largeArtSettings,
    updateLargeArtSettings,
    graphViewSettings,
    updateGraphViewSettings,
  } = usePluginStore();

  const { t } = useTranslation();

  const [expandedPlugin, setExpandedPlugin] = useState<PluginID | null>(null);

  const toggleSettings = (id: PluginID) => {
    setExpandedPlugin(expandedPlugin === id ? null : id);
  };

  const showAlbumCovers = graphViewSettings?.showAlbumCovers ?? true;

    const mainToggleBgClass = (isActive: boolean) =>
    `relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${isActive ? "bg-brand-primary" : "bg-surface border border-divider"}`;

  const mainToggleKnobClass = (isActive: boolean) =>
    `inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ${isActive ? "translate-x-6" : "translate-x-1"}`;

  const innerToggleBgClass = (isActive: boolean) =>
    `relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${isActive ? "bg-brand-primary" : "bg-surface border border-divider"}`;

  const innerToggleKnobClass = (isActive: boolean) =>
    `inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 ${isActive ? "translate-x-5" : "translate-x-1"}`;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-bold text-content mb-1 flex items-center gap-2">
          {t("plugins.title", "Plugins y Extensiones")}
        </h2>
        <p className="text-sm text-muted">
          {t(
            "plugins.subtitle",
            "Habilita y configura funcionalidades adicionales.",
          )}
        </p>
      </div>

      <div className="space-y-6">
        <section className="flex flex-col border-b border-divider/50 pb-6 last:border-0">
          <div className="flex items-center justify-between gap-8">
            <div className="flex gap-3">
              <div className="text-muted shrink-0 mt-0.5">
                <Maximize2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-content mb-1">
                  {t("plugins.largeArtTitle", "Arte en Pantalla Completa")}
                </h3>
                <p className="text-xs text-muted max-w-md">
                  {t(
                    "plugins.largeArtDesc",
                    "Visualiza el arte del álbum en un modal inmersivo.",
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={() => toggleSettings("large-art")}
                className={`p-2 rounded-md transition-colors ${expandedPlugin === "large-art" ? "bg-surface-hover text-brand-primary" : "text-muted hover:text-content hover:bg-surface"}`}
                title={t(
                  "plugins.graphView.settingsTooltip",
                  "Ajustes del plugin",
                )}
              >
                <Settings size={18} />
              </button>

              <button
                onClick={() => togglePlugin("large-art")}
                className={mainToggleBgClass(activePlugins["large-art"])}
              >
                <span className={mainToggleKnobClass(activePlugins["large-art"])} />
              </button>
            </div>
          </div>

          {expandedPlugin === "large-art" && (
            <div className="mt-6 p-5 bg-surface/50 rounded-lg border border-divider space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-content">
                    {t("plugins.bgTypeTitle", "Tipo de Fondo")}
                  </h4>
                  <p className="text-xs text-muted">
                    {t(
                      "plugins.bgTypeDesc",
                      "Elige cómo se renderiza el fondo detrás de la portada.",
                    )}
                  </p>
                </div>
                <select
                  value={largeArtSettings.backgroundType}
                  onChange={(e) =>
                    updateLargeArtSettings({
                      backgroundType: e.target
                        .value as LargeArtSettings["backgroundType"],
                    })
                  }
                  className="bg-surface border border-divider text-content text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-primary"
                >
                  <option value="cover">
                    {t("plugins.bgCover", "Portada del Álbum")}
                  </option>
                  <option value="gradient">
                    {t("plugins.bgGradient", "Gradiente Sutil")}
                  </option>
                  <option value="solid">
                    {t("plugins.bgSolid", "Color Sólido")}
                  </option>
                </select>
              </div>

              {largeArtSettings.backgroundType === "cover" && (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-content">
                      {t("plugins.blurTitle", "Desenfocar Fondo (Blur)")}
                    </h4>
                    <p className="text-xs text-muted">
                      {t(
                        "plugins.blurDesc",
                        "Aplica un difuminado extremo a la imagen de fondo.",
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updateLargeArtSettings({
                        enableBlur: !largeArtSettings.enableBlur,
                      })
                    }
                    className={innerToggleBgClass(largeArtSettings.enableBlur)}
                  >
                    <span
                      className={innerToggleKnobClass(largeArtSettings.enableBlur)}
                    />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-content">
                    {t("plugins.animTitle", "Animación de Respiración")}
                  </h4>
                  <p className="text-xs text-muted">
                    {t(
                      "plugins.animDesc",
                      "Efecto de zoom lento mientras se reproduce la música.",
                    )}
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateLargeArtSettings({
                      enableAnimation: !largeArtSettings.enableAnimation,
                    })
                  }
                  className={innerToggleBgClass(largeArtSettings.enableAnimation)}
                >
                  <span
                    className={innerToggleKnobClass(
                      largeArtSettings.enableAnimation,
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-content">
                    {t("plugins.themeTitle", "Tema Dinámico")}
                  </h4>
                  <p className="text-xs text-muted">
                    {t(
                      "plugins.themeDesc",
                      "Adapta los colores del texto según la luminosidad de la portada.",
                    )}
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateLargeArtSettings({
                      dynamicTheme: !largeArtSettings.dynamicTheme,
                    })
                  }
                  className={innerToggleBgClass(largeArtSettings.dynamicTheme)}
                >
                  <span
                    className={innerToggleKnobClass(largeArtSettings.dynamicTheme)}
                  />
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col border-b border-divider/50 pb-6 mt-6 last:border-0">
          <div className="flex items-center justify-between gap-8">
            <div className="flex gap-3">
              <div className="text-muted shrink-0 mt-0.5">
                <Mic2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-content mb-1">
                  {t(
                    "plugins.lyrics.lyricsTitle",
                    "Letras en Pantalla Completa",
                  )}
                </h3>
                <p className="text-xs text-muted max-w-md">
                  {t(
                    "plugins.lyrics.lyricsDesc",
                    "Muestra las letras sincronizadas en el lado derecho cuando el Arte en Pantalla Completa está activo.",
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={() => togglePlugin("lyrics")}
                className={mainToggleBgClass(activePlugins["lyrics"])}
              >
                <span
                  className={mainToggleKnobClass(activePlugins["lyrics"])}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col border-b border-divider/50 pb-6 mt-6 last:border-0">
          <div className="flex items-center justify-between gap-8">
            <div className="flex gap-3">
              <div className="text-muted shrink-0 mt-0.5">
                <Network size={20} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-content mb-1">
                  {t(
                    "plugins.graphView.graphicalViewTitle",
                    "Vista Gráfica Interactiva",
                  )}
                </h3>
                <p className="text-xs text-muted max-w-md">
                  {t(
                    "plugins.graphView.graphicalViewDesc",
                    "Explora tu biblioteca como una red interactiva de nodos con físicas en tiempo real.",
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={() => toggleSettings("genre-explorer")}
                className={`p-2 rounded-md transition-colors ${expandedPlugin === "genre-explorer" ? "bg-surface-hover text-brand-primary" : "text-muted hover:text-content hover:bg-surface"}`}
                title={t(
                  "plugins.graphView.settingsTooltip",
                  "Ajustes del plugin",
                )}
              >
                <Settings size={18} />
              </button>

              <button
                onClick={() => togglePlugin("genre-explorer")}
                className={mainToggleBgClass(activePlugins["genre-explorer"])}
              >
                <span
                  className={mainToggleKnobClass(activePlugins["genre-explorer"])}
                />
              </button>
            </div>
          </div>

          {expandedPlugin === "genre-explorer" && (
            <div className="mt-6 p-5 bg-surface/50 rounded-lg border border-divider space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-medium text-content">
                    {t(
                      "plugins.graphView.showAlbumCoversTitle",
                      "Mostrar Portadas en los Nodos",
                    )}
                  </h4>
                  <p className="text-xs text-muted">
                    {t(
                      "plugins.graphView.showAlbumCoversDesc",
                      "Dibuja la imagen del álbum directamente en el nodo circular. Apagar esto mejora el rendimiento en bibliotecas muy grandes.",
                    )}
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateGraphViewSettings({
                      showAlbumCovers: !showAlbumCovers,
                    })
                  }
                  className={innerToggleBgClass(showAlbumCovers)}
                >
                  <span className={innerToggleKnobClass(showAlbumCovers)} />
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col border-b border-divider/50 pb-6 mt-6 last:border-0">
          <div className="flex items-center justify-between gap-8">
            <div className="flex gap-3">
              <div className="text-muted shrink-0 mt-0.5">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-content mb-1">
                  {t("plugins.timelineView.title", "Línea de Tiempo Musical")}
                </h3>
                <p className="text-xs text-muted max-w-md">
                  {t(
                    "plugins.timelineView.desc",
                    "Agrupa y explora todos tus álbumes ordenados cronológicamente por año de lanzamiento.",
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={() => togglePlugin("timeline-view")}
                className={mainToggleBgClass(activePlugins["timeline-view"])}
              >
                <span
                  className={mainToggleKnobClass(activePlugins["timeline-view"])}
                />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PluginsSettings;