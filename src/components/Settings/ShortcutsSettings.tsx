import { useTranslation } from "react-i18next";
import { Play, FastForward, Rewind, Volume2, Shuffle, Search, ListMusic, X } from "lucide-react";

export default function ShortcutsSettings() {
  const { t } = useTranslation();

  const shortcutSections = [
    {
      title: t("shortcutsSettings.playbackSection", "Reproducción y Volumen"),
      shortcuts: [
        {
          label: t("shortcutsSettings.playPause", "Reproducir / Pausar"),
          keys: [t("shortcutsSettings.keySpace", "Espacio")],
          icon: <Play size={16} className="text-brand-primary" />,
        },
        {
          label: t("shortcutsSettings.nextTrack", "Siguiente pista"),
          keys: ["Ctrl", "→"],
          altKeys: ["Shift", "N"],
          icon: <FastForward size={16} className="text-brand-primary" />,
        },
        {
          label: t("shortcutsSettings.prevTrack", "Pista anterior"),
          keys: ["Ctrl", "←"],
          altKeys: ["Shift", "P"],
          icon: <Rewind size={16} className="text-brand-primary" />,
        },
        {
          label: t("shortcutsSettings.volumeUp", "Subir volumen (+5%)"),
          keys: ["Ctrl", "↑"],
          icon: <Volume2 size={16} className="text-brand-primary" />,
        },
        {
          label: t("shortcutsSettings.volumeDown", "Bajar volumen (-5%)"),
          keys: ["Ctrl", "↓"],
          icon: <Volume2 size={16} className="text-brand-primary" />,
        },
        {
          label: t("shortcutsSettings.toggleShuffle", "Alternar modo aleatorio (Shuffle)"),
          keys: ["Ctrl", "S"],
          icon: <Shuffle size={16} className="text-brand-primary" />,
        },
      ],
    },
    {
      title: t("shortcutsSettings.navigationSection", "Búsqueda y Navegación"),
      shortcuts: [
        {
          label: t("shortcutsSettings.openPalette", "Abrir Paleta de Comandos / Búsqueda global"),
          keys: ["Ctrl", "K"],
          altKeys: ["/"],
          icon: <Search size={16} className="text-brand-primary" />,
        },
        {
          label: t("shortcutsSettings.toggleQueue", "Abrir / Cerrar Cola de reproducción"),
          keys: ["Ctrl", "Q"],
          icon: <ListMusic size={16} className="text-brand-primary" />,
        },
        {
          label: t("shortcutsSettings.closeModal", "Cerrar modal o ventana emergente activa"),
          keys: ["Escape"],
          icon: <X size={16} className="text-brand-primary" />,
        },
      ],
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-content flex items-center gap-2.5">
          {t("shortcutsSettings.title", "Atajos de teclado")}
        </h2>
        <p className="text-muted text-sm mt-1">
          {t(
            "shortcutsSettings.description",
            "Controla la reproducción, navega por tu colección y accede a comandos rápidos sin levantar las manos del teclado."
          )}
        </p>
      </div>

      <div className="space-y-6">
        {shortcutSections.map((section) => (
          <div key={section.title} className="bg-surface/50 border border-divider rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
              {section.title}
            </h3>

            <div className="divide-y divide-divider/60">
              {section.shortcuts.map((sc, i) => (
                <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-background border border-divider">
                      {sc.icon}
                    </div>
                    <span className="text-sm font-medium text-content">{sc.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-1 text-xs font-mono font-semibold bg-background border border-divider rounded-md text-content shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>

                    {sc.altKeys && (
                      <>
                        <span className="text-xs text-muted">
                          {t("shortcutsSettings.or", "o")}
                        </span>
                        <div className="flex items-center gap-1">
                          {sc.altKeys.map((k) => (
                            <kbd
                              key={k}
                              className="px-2 py-1 text-xs font-mono font-semibold bg-background border border-divider rounded-md text-content shadow-sm"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
