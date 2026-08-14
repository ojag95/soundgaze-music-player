import React, { useRef, useState } from "react";
import { useThemeStore, CustomColors } from "../../store/themeStore";
import { RotateCcw, Download, Upload, CheckCircle2, AlertCircle } from "lucide-react"; 
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useTranslation } from "react-i18next";

const LINUX_SCHEMES = [
  {
    name: "Breeze (KDE)",
    light: {
      brandPrimary: "#3DAEE9",
      background: "#EFF0F1",
      surface: "#FCFCFC",
      surfaceHover: "#E2E8F0",
      textContent: "#31363B",
      textMuted: "#7F8C8D",
      borderSubtle: "#BDC3C7",
    },
    dark: {
      brandPrimary: "#3DAEE9",
      background: "#232629",
      surface: "#31363B",
      surfaceHover: "#3D4247",
      textContent: "#EFF0F1",
      textMuted: "#7F8C8D",
      borderSubtle: "#4D545B",
    },
  },
  {
    name: "Nord",
    light: {
      brandPrimary: "#5E81AC",
      background: "#ECEFF4",
      surface: "#E5E9F0",
      surfaceHover: "#D8DEE9",
      textContent: "#2E3440",
      textMuted: "#4C566A",
      borderSubtle: "#D8DEE9",
    },
    dark: {
      brandPrimary: "#88C0D0",
      background: "#2E3440",
      surface: "#3B4252",
      surfaceHover: "#434C5E",
      textContent: "#ECEFF4",
      textMuted: "#D8DEE9",
      borderSubtle: "#4C566A",
    },
  },
  {
    name: "Arc",
    light: {
      brandPrimary: "#5294E2",
      background: "#F5F6F7",
      surface: "#FFFFFF",
      surfaceHover: "#E5E9F0",
      textContent: "#5C616C",
      textMuted: "#8BA4B4",
      borderSubtle: "#CFD6E6",
    },
    dark: {
      brandPrimary: "#5294E2",
      background: "#2F343F",
      surface: "#383C4A",
      surfaceHover: "#404552",
      textContent: "#D3DAE3",
      textMuted: "#8BA4B4",
      borderSubtle: "#21252B",
    },
  },
  {
    name: "Materia",
    light: {
      brandPrimary: "#00BCD4",
      background: "#ECEFF1",
      surface: "#FFFFFF",
      surfaceHover: "#CFD8DC",
      textContent: "#263238",
      textMuted: "#78909C",
      borderSubtle: "#B0BEC5",
    },
    dark: {
      brandPrimary: "#00BCD4",
      background: "#263238",
      surface: "#2C393F",
      surfaceHover: "#37474F",
      textContent: "#FFFFFF",
      textMuted: "#B0BEC5",
      borderSubtle: "#1F292E",
    },
  },
  {
    name: "Yaru (Ubuntu)",
    light: {
      brandPrimary: "#E95420",
      background: "#F7F7F7",
      surface: "#FFFFFF",
      surfaceHover: "#EEEEEE",
      textContent: "#3D3D3D",
      textMuted: "#77767B",
      borderSubtle: "#D3D3D3",
    },
    dark: {
      brandPrimary: "#E95420",
      background: "#1E1E1E",
      surface: "#2C2C2C",
      surfaceHover: "#3D3D3D",
      textContent: "#F7F7F7",
      textMuted: "#B5B5B5",
      borderSubtle: "#323232",
    },
  },
  {
    name: "WhiteSur",
    light: {
      brandPrimary: "#007AFF",
      background: "#F2F2F7",
      surface: "#FFFFFF",
      surfaceHover: "#E5E5EA",
      textContent: "#1C1C1E",
      textMuted: "#8E8E93",
      borderSubtle: "#D1D1D6",
    },
    dark: {
      brandPrimary: "#0A84FF",
      background: "#1C1C1E",
      surface: "#2C2C2E",
      surfaceHover: "#3A3A3C",
      textContent: "#FFFFFF",
      textMuted: "#98989D",
      borderSubtle: "#38383A",
    },
  },
  {
    name: "Vimix",
    light: {
      brandPrimary: "#1ABC9C",
      background: "#ECEFF1",
      surface: "#FFFFFF",
      surfaceHover: "#F5F5F5",
      textContent: "#37474F",
      textMuted: "#90A4AE",
      borderSubtle: "#CFD8DC",
    },
    dark: {
      brandPrimary: "#1ABC9C",
      background: "#263238",
      surface: "#37474F",
      surfaceHover: "#455A64",
      textContent: "#ECEFF1",
      textMuted: "#90A4AE",
      borderSubtle: "#263238",
    },
  },
];

const Appearance: React.FC = () => {
  const {
    isDark,
    setBaseTheme,
    lightPalette,
    darkPalette,
    updateCustomColor,
    resetToDefaults,
    applyScheme,
  } = useThemeStore();
  
  const { t } = useTranslation(); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: "",
    type: "success"
  });

  const currentPalette = isDark ? darkPalette : lightPalette;
  const currentThemeLabel = isDark ? "dark" : "light";

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleResetColors = () => {
    resetToDefaults(currentThemeLabel);
    showToast(t("appearance.resetSuccess", "Colores restablecidos a los valores por defecto."));
  };

  const handleColorChange = (key: keyof CustomColors, value: string) => {
    updateCustomColor(currentThemeLabel, key, value);
  };

  const handleExportTheme = async () => {
    try {
      const themeData = {
        light: lightPalette,
        dark: darkPalette,
      };

      const jsonString = JSON.stringify(themeData, null, 2);

      const filePath = await save({
        title: t("appearance.exportDialogTitle"),
        defaultPath: "soundgaze-theme.json",
        filters: [
          {
            name: t("appearance.jsonFiles"),
            extensions: ["json"],
          },
        ],
      });

      if (filePath) {
        await writeTextFile(filePath, jsonString);
        showToast(t("appearance.exportSuccess", "Tema exportado exitosamente."));
      }
    } catch (error) {
      console.error("Error al exportar el tema:", error);
      showToast(t("appearance.exportError", "Ocurrió un error al exportar el tema."), "error");
    }
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const importedData = JSON.parse(result);

        if (
          importedData.light &&
          importedData.dark &&
          importedData.light.brandPrimary
        ) {
          applyScheme(importedData.light, importedData.dark);
          showToast(t("appearance.importSuccess", "Tema importado y aplicado correctamente."));
        } else {
          showToast(t("appearance.invalidThemeFile"), "error");
        }
      } catch (error) {
        showToast(t("appearance.readError"), "error");
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-content">{t("appearance.title")}</h2>
        <button
          onClick={handleResetColors}
          className="flex items-center gap-2 text-xs text-muted hover:text-brand-primary transition-colors px-3 py-1.5 rounded-md hover:bg-surface"
        >
          <RotateCcw size={14} />
          {t("appearance.resetColors")}
        </button>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          {t("appearance.baseTheme")}
        </h3>
        <div className="flex items-center justify-between gap-8 p-5 bg-surface rounded-lg border border-divider/50">
          <div>
            <h4 className="text-sm font-medium text-content mb-1">
              {t("appearance.lightOrDarkScheme")}
            </h4>
            <p className="text-xs text-muted max-w-md">
              {t("appearance.baseThemeDesc")}
            </p>
          </div>
          <select 
            value={isDark ? "dark" : "light"}
            onChange={(e) => setBaseTheme(e.target.value as 'light' | 'dark')}
            className="bg-background border border-divider text-content text-sm rounded-md px-4 py-2 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary w-40 cursor-pointer transition-colors"
          >
            <option value="light" className="bg-background text-content">{t("appearance.light")}</option>
            <option value="dark" className="bg-background text-content">{t("appearance.dark")}</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          {t("appearance.builtInSchemes")}
        </h3>
        <p className="text-xs text-muted mb-4">
          {t("appearance.builtInSchemesDesc")}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {LINUX_SCHEMES.map((scheme) => {
            const previewColors = isDark ? scheme.dark : scheme.light;

            return (
              <button
                key={scheme.name}
                onClick={() => {
                  applyScheme(scheme.light, scheme.dark);
                  showToast(t("appearance.schemeApplied", `Esquema '${scheme.name}' aplicado.`));
                }}
                className="group flex flex-col gap-3 p-3 bg-surface rounded-lg border border-divider/50 hover:border-brand-primary transition-all text-left"
              >
                <span className="text-sm font-medium text-content">
                  {scheme.name}
                </span>

                <div className="flex w-full h-8 rounded-md overflow-hidden shadow-inner border border-divider">
                  <div style={{ backgroundColor: previewColors.background }} className="flex-1" />
                  <div style={{ backgroundColor: previewColors.surface }} className="flex-1" />
                  <div style={{ backgroundColor: previewColors.brandPrimary }} className="flex-1" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            {t("appearance.manualTuning")} ({isDark ? t("appearance.darkMode") : t("appearance.lightMode")})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {Object.keys(currentPalette).map((key) => {
            const colorKey = key as keyof CustomColors;
            const colorValue = currentPalette[colorKey];

            return (
              <div
                key={colorKey}
                className="flex items-center justify-between gap-4 p-4 bg-surface rounded-lg border border-divider/50 hover:border-divider transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor={colorKey}
                    className="text-sm font-medium text-content cursor-pointer"
                  >
                    {t(`appearance.colors.${colorKey}`)}
                  </label>
                  <span className="text-xs font-mono text-muted uppercase">
                    {colorValue}
                  </span>
                </div>

                <div className="relative w-12 h-10 rounded-md border-2 border-background overflow-hidden shadow-inner shrink-0">
                  <input
                    type="color"
                    id={colorKey}
                    value={colorValue}
                    onChange={(e) => handleColorChange(colorKey, e.target.value)}
                    className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer border-none bg-transparent"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-divider/50">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          {t("appearance.themeManagement")}
        </h3>
        <p className="text-xs text-muted mb-4">
          {t("appearance.themeManagementDesc")}
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportTheme}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-divider text-content text-sm font-medium rounded-md transition-colors"
          >
            <Download size={16} />
            {t("appearance.exportTheme")}
          </button>

          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportTheme}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white hover:opacity-90 text-sm font-medium rounded-md transition-opacity"
          >
            <Upload size={16} />
            {t("appearance.importTheme")}
          </button>
        </div>
      </section>

      {toast.visible && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-surface border shadow-2xl rounded-full animate-in fade-in slide-in-from-bottom-5 duration-300 ${toast.type === "error" ? "border-red-500/50" : "border-divider"}`}>
          {toast.type === "success" 
            ? <CheckCircle2 size={18} className="text-brand-primary" /> 
            : <AlertCircle size={18} className="text-red-500" />
          }
          <span className="text-sm font-semibold text-content shadow-sm">
            {toast.message}
          </span>
        </div>
      )}

    </div>
  );
};

export default Appearance;