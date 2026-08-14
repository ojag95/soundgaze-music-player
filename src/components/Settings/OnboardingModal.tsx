import React, { useState } from "react";
import { Server, Music, Settings, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLibrarySettingsStore } from "../../store/librarySettingsStore";

const OnboardingModal: React.FC = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  
  const { hasSeenOnboarding, setHasSeenOnboarding } = useLibrarySettingsStore();

  if (hasSeenOnboarding) return null;

  const handleFinish = () => {
    setHasSeenOnboarding(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-surface border border-divider shadow-2xl rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        <div className="bg-brand-primary p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
          <h1 className="text-3xl font-black text-white relative z-10">
            {t("onboarding.title", "Bienvenido a Soundgaze")}
          </h1>
          <p className="text-white/80 mt-2 font-medium relative z-10">
            {t("onboarding.subtitle", "Tu biblioteca musical, reimaginada.")}
          </p>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className={`flex items-start gap-4 transition-opacity duration-300 ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <Server size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-content">
                {t("onboarding.step1Title", "1. El Motor (MPD)")}
              </h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {t("onboarding.step1Desc1", "Soundgaze es un cliente hermoso, pero no reproduce música por sí solo. Necesitas tener ")}
                <strong>Music Player Daemon (MPD)</strong>
                {t("onboarding.step1Desc2", " instalado y ejecutándose en tu computadora (o en un servidor remoto).")}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-4 transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-content">
                {t("onboarding.step2Title", "2. Configura tu conexión")}
              </h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {t("onboarding.step2Desc1", "Por defecto, intentaremos conectarnos a ")}
                <code>localhost:6600</code>
                {t("onboarding.step2Desc2", ". Si tu MPD tiene contraseña o está en otra IP, puedes cambiarlo en la pestaña de Ajustes del reproductor.")}
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-4 transition-opacity duration-300 ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0">
              <Music size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-content">
                {t("onboarding.step3Title", "3. Escanea tu música")}
              </h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {t("onboarding.step3Desc1", "Asegúrate de configurar tu ")}
                <code>music_directory</code>
                {t("onboarding.step3Desc2", ". Una vez conectado, ve a los Ajustes y presiona \"Escanear Biblioteca\" para que Soundgaze descargue todas tus portadas e indexe tu catálogo.")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-divider bg-background flex justify-between items-center">
          <div className="flex gap-2">
            <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-brand-primary' : 'bg-divider'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-brand-primary' : 'bg-divider'}`} />
            <div className={`w-2 h-2 rounded-full ${step === 3 ? 'bg-brand-primary' : 'bg-divider'}`} />
          </div>

          <button
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else handleFinish();
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg shadow-brand-primary/20"
          >
            {step < 3 ? (
              t("common.next", "Siguiente")
            ) : (
              <>
                <CheckCircle2 size={18} />
                {t("onboarding.startListening", "Empezar a escuchar")}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;