import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clear } from "idb-keyval";

const StorageSettings: React.FC = () => {
  const { t } = useTranslation();

  const handleFactoryReset = async () => {
    const isConfirmed = window.confirm(
      t(
        "system.factoryResetConfirm",
        "¿Estás seguro de que quieres restablecer Soundgaze a su estado de fábrica? Perderás tus configuraciones, favoritos y la app se reiniciará."
      )
    );

    if (isConfirmed) {
      try {
        await clear();
        window.localStorage.clear();
        window.location.reload();
      } catch (error) {
        console.error("Error al restablecer de fábrica:", error);
        alert(
          t(
            "system.factoryResetError",
            "Hubo un error al intentar borrar los datos."
          )
        );
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-bold text-content mb-1">
          {t("storage.title", "Almacenamiento y Datos")}
        </h2>
        <p className="text-sm text-muted">
          {t("storage.subtitle", "Gestiona la base de datos local y el caché.")}
        </p>
      </div>

      <div className="space-y-6">
        <section className="flex items-center justify-between gap-8 pb-6 border-b border-divider/50">
          <div className="flex gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-500 mb-1">
                {t("system.dangerZoneTitle", "Zona de Peligro")}
              </h3>
              <p className="text-xs text-muted max-w-md">
                {t(
                  "system.dangerZoneDesc",
                  "Esto borrará todos tus ajustes, la caché de la biblioteca y el estado del reproductor."
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleFactoryReset}
            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm font-semibold shrink-0"
          >
            {t("system.factoryReset", "Restablecer de Fábrica")}
          </button>
        </section>
      </div>
    </div>
  );
};

export default StorageSettings;