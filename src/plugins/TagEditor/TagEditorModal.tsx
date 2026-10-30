import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import {
  X,
  FileEdit,
  Save,
  Image as ImageIcon,
  FileText,
  Info,
  Sliders,
  Upload,
  Trash2,
  RotateCcw,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { usePlayerStore, TrackData } from "../../store/playerStore";

export interface FullTrackMetadata {
  path: string;
  full_path: string;
  title: string;
  artist: string;
  album_artist?: string;
  album: string;
  genre?: string;
  year?: number;
  track_number?: number;
  track_total?: number;
  disc_number?: number;
  disc_total?: number;
  comment?: string;
  lyrics?: string;
  has_cover: boolean;
  cover_mime?: string;
  cover_base64?: string;
  format: string;
  duration_secs: number;
  bitrate_kbps?: number;
  sample_rate_hz?: number;
  bit_depth?: number;
  channels?: number;
  file_size_bytes: number;
}

interface TagEditorModalProps {
  trackPath: string | null;
  onClose: () => void;
}

type TabType = "general" | "artwork" | "lyrics" | "tech";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDuration = (totalSecs: number): string => {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const TagEditorModal: React.FC<TagEditorModalProps> = ({
  trackPath,
  onClose,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [initialData, setInitialData] = useState<FullTrackMetadata | null>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState<string>("");
  const [trackNumber, setTrackNumber] = useState<string>("");
  const [trackTotal, setTrackTotal] = useState<string>("");
  const [discNumber, setDiscNumber] = useState<string>("");
  const [discTotal, setDiscTotal] = useState<string>("");
  const [comment, setComment] = useState("");
  const [lyrics, setLyrics] = useState("");

  const [coverAction, setCoverAction] = useState<"keep" | "remove" | "replace">("keep");
  const [newCoverBase64, setNewCoverBase64] = useState<string | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!trackPath) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setCoverAction("keep");
    setNewCoverBase64(null);
    setNewCoverPreview(null);

    invoke<FullTrackMetadata>("get_track_metadata", { path: trackPath })
      .then((data) => {
        if (!isMounted) return;
        setInitialData(data);
        setTitle(data.title || "");
        setArtist(data.artist || "");
        setAlbumArtist(data.album_artist || "");
        setAlbum(data.album || "");
        setGenre(data.genre || "");
        setYear(data.year ? data.year.toString() : "");
        setTrackNumber(data.track_number ? data.track_number.toString() : "");
        setTrackTotal(data.track_total ? data.track_total.toString() : "");
        setDiscNumber(data.disc_number ? data.disc_number.toString() : "");
        setDiscTotal(data.disc_total ? data.disc_total.toString() : "");
        setComment(data.comment || "");
        setLyrics(data.lyrics || "");
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(typeof err === "string" ? err : "Error al cargar metadatos");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [trackPath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  if (!trackPath) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setNewCoverPreview(result);
      const base64Data = result.split(",")[1];
      setNewCoverBase64(base64Data);
      setCoverAction("replace");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!trackPath || saving) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      path: trackPath,
      title: title.trim(),
      artist: artist.trim(),
      album_artist: albumArtist.trim() || undefined,
      album: album.trim(),
      genre: genre.trim() || undefined,
      year: year ? parseInt(year, 10) : undefined,
      track_number: trackNumber ? parseInt(trackNumber, 10) : undefined,
      track_total: trackTotal ? parseInt(trackTotal, 10) : undefined,
      disc_number: discNumber ? parseInt(discNumber, 10) : undefined,
      disc_total: discTotal ? parseInt(discTotal, 10) : undefined,
      comment: comment.trim() || undefined,
      lyrics: lyrics.trim() || undefined,
      cover_action: coverAction,
      new_cover_base64: coverAction === "replace" ? newCoverBase64 : undefined,
    };

    try {
      await invoke("update_track_metadata", { payload });
      setSuccessMessage(t("plugins.tagEditor.saveSuccess", "Etiquetas actualizadas con éxito"));

      invoke<TrackData[]>("mpd_get_library")
        .then((tracks) => {
          usePlayerStore.getState().setLibrary(tracks);
        })
        .catch(() => {});

      const currentTrack = usePlayerStore.getState().currentTrack;
      if (currentTrack?.path === trackPath) {
        usePlayerStore.getState().fetchState();
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : t("plugins.tagEditor.saveError", "Error al guardar etiquetas")
      );
      setSaving(false);
    }
  };

  const currentCoverDisplay = () => {
    if (coverAction === "replace" && newCoverPreview) {
      return newCoverPreview;
    }
    if (coverAction === "remove") {
      return null;
    }
    if (initialData?.has_cover && initialData.cover_base64) {
      return `data:${initialData.cover_mime || "image/jpeg"};base64,${initialData.cover_base64}`;
    }
    return null;
  };

  const coverSrc = currentCoverDisplay();

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-divider rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider bg-surface shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/20">
              <FileEdit size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-content truncate">
                {t("plugins.tagEditor.modalTitle", "Editor de Etiquetas")}
              </h2>
              <p className="text-xs text-muted truncate max-w-md">
                {initialData?.title || trackPath}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="text-muted hover:text-content p-1.5 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-3 pb-2 border-b border-divider/60 bg-surface/50 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-muted hover:text-content hover:bg-surface"
            }`}
          >
            <Sliders size={14} />
            <span>{t("plugins.tagEditor.tabGeneral", "General")}</span>
          </button>

          <button
            onClick={() => setActiveTab("artwork")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "artwork"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-muted hover:text-content hover:bg-surface"
            }`}
          >
            <ImageIcon size={14} />
            <span>{t("plugins.tagEditor.tabArtwork", "Carátula")}</span>
          </button>

          <button
            onClick={() => setActiveTab("lyrics")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "lyrics"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-muted hover:text-content hover:bg-surface"
            }`}
          >
            <FileText size={14} />
            <span>{t("plugins.tagEditor.tabLyrics", "Letras")}</span>
          </button>

          <button
            onClick={() => setActiveTab("tech")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "tech"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-muted hover:text-content hover:bg-surface"
            }`}
          >
            <Info size={14} />
            <span>{t("plugins.tagEditor.tabTechnical", "Información Técnica")}</span>
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-400 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-2.5 text-xs text-green-400 animate-in fade-in">
            <Check size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted">
              <Loader2 size={32} className="animate-spin text-brand-primary" />
              <p className="text-sm font-medium">
                {t("plugins.tagEditor.loading", "Cargando metadatos...")}
              </p>
            </div>
          ) : (
            <>
              {/* PESTAÑA 1: GENERAL */}
              {activeTab === "general" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">
                      {t("plugins.tagEditor.fieldTitle", "Título")} *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Título de la canción"
                      className="w-full bg-background border border-divider rounded-xl px-3.5 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider">
                        {t("plugins.tagEditor.fieldArtist", "Artista")}
                      </label>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="Artista principal"
                        className="w-full bg-background border border-divider rounded-xl px-3.5 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider">
                        {t("plugins.tagEditor.fieldAlbumArtist", "Artista del Álbum")}
                      </label>
                      <input
                        type="text"
                        value={albumArtist}
                        onChange={(e) => setAlbumArtist(e.target.value)}
                        placeholder="Ej. Banda o Artista del disco"
                        className="w-full bg-background border border-divider rounded-xl px-3.5 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider">
                        {t("plugins.tagEditor.fieldAlbum", "Álbum")}
                      </label>
                      <input
                        type="text"
                        value={album}
                        onChange={(e) => setAlbum(e.target.value)}
                        placeholder="Nombre del álbum"
                        className="w-full bg-background border border-divider rounded-xl px-3.5 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider">
                        {t("plugins.tagEditor.fieldYear", "Año")}
                      </label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        placeholder="Ej. 1997"
                        min="1000"
                        max="2999"
                        className="w-full bg-background border border-divider rounded-xl px-3.5 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider">
                        {t("plugins.tagEditor.fieldGenre", "Género")}
                      </label>
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="Ej. Rock, Pop, Jazz..."
                        className="w-full bg-background border border-divider rounded-xl px-3.5 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider">
                        {t("plugins.tagEditor.fieldTrackNumber", "Pista (# / Total)")}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={trackNumber}
                          onChange={(e) => setTrackNumber(e.target.value)}
                          placeholder="Pista"
                          min="1"
                          className="w-full bg-background border border-divider rounded-xl px-3 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                        />
                        <span className="text-muted">/</span>
                        <input
                          type="number"
                          value={trackTotal}
                          onChange={(e) => setTrackTotal(e.target.value)}
                          placeholder="Total"
                          min="1"
                          className="w-full bg-background border border-divider rounded-xl px-3 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted uppercase tracking-wider">
                        {t("plugins.tagEditor.fieldDiscNumber", "Disco (# / Total)")}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={discNumber}
                          onChange={(e) => setDiscNumber(e.target.value)}
                          placeholder="Disco"
                          min="1"
                          className="w-full bg-background border border-divider rounded-xl px-3 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                        />
                        <span className="text-muted">/</span>
                        <input
                          type="number"
                          value={discTotal}
                          onChange={(e) => setDiscTotal(e.target.value)}
                          placeholder="Total"
                          min="1"
                          className="w-full bg-background border border-divider rounded-xl px-3 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">
                      {t("plugins.tagEditor.fieldComment", "Comentario")}
                    </label>
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Comentarios u observaciones"
                      className="w-full bg-background border border-divider rounded-xl px-3.5 py-2 text-content text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: CARÁTULA */}
              {activeTab === "artwork" && (
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 animate-in fade-in duration-150">
                  <div className="w-52 h-52 rounded-2xl overflow-hidden bg-background border border-divider shadow-md shrink-0 flex items-center justify-center relative group">
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt="Carátula"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted gap-2">
                        <ImageIcon size={40} className="text-muted/40" />
                        <span className="text-xs">
                          {t("plugins.tagEditor.noCover", "Sin carátula")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 flex-1 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-divider text-content text-sm font-semibold hover:border-brand-primary hover:text-brand-primary transition-all cursor-pointer shadow-xs"
                    >
                      <Upload size={16} />
                      <span>{t("plugins.tagEditor.changeCover", "Cambiar carátula...")}</span>
                    </button>

                    {coverSrc && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverAction("remove");
                          setNewCoverPreview(null);
                          setNewCoverBase64(null);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                        <span>{t("plugins.tagEditor.removeCover", "Eliminar carátula")}</span>
                      </button>
                    )}

                    {coverAction !== "keep" && (
                      <button
                        type="button"
                        onClick={() => {
                          setCoverAction("keep");
                          setNewCoverPreview(null);
                          setNewCoverBase64(null);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-muted text-xs hover:text-content transition-colors cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        <span>{t("plugins.tagEditor.restoreCover", "Restablecer carátula original")}</span>
                      </button>
                    )}

                    <div className="mt-2 p-3 rounded-xl bg-background border border-divider text-xs text-muted space-y-1">
                      <div className="font-semibold text-content">
                        {coverAction === "replace" && (
                          <span className="text-brand-primary">
                            • {t("plugins.tagEditor.coverReplaced", "Se reemplazará con la nueva imagen al guardar")}
                          </span>
                        )}
                        {coverAction === "remove" && (
                          <span className="text-red-400">
                            • {t("plugins.tagEditor.coverRemoved", "Se eliminará la carátula al guardar")}
                          </span>
                        )}
                        {coverAction === "keep" && (
                          <span>
                            • {initialData?.has_cover ? "Carátula incrustada detectada en el archivo" : "El archivo no contiene carátula incrustada"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted">
                        Formatos soportados: JPG, PNG, WEBP. Se guardará directamente dentro de las etiquetas ID3/Vorbis del archivo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: LETRAS */}
              {activeTab === "lyrics" && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <label className="text-xs font-bold text-muted uppercase tracking-wider">
                    {t("plugins.tagEditor.fieldLyrics", "Letras incrustadas en el archivo")}
                  </label>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={12}
                    placeholder={t(
                      "plugins.tagEditor.lyricsPlaceholder",
                      "Escribe o pega las letras de la canción aquí..."
                    )}
                    className="w-full bg-background border border-divider rounded-xl p-3.5 text-content text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all custom-scrollbar font-mono resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* PESTAÑA 4: DETALLES TÉCNICOS */}
              {activeTab === "tech" && initialData && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-background border border-divider rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider text-muted font-bold block mb-1">
                        {t("plugins.tagEditor.fileFormat", "Formato")}
                      </span>
                      <span className="text-sm font-extrabold text-content">
                        {initialData.format}
                      </span>
                    </div>

                    <div className="p-3 bg-background border border-divider rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider text-muted font-bold block mb-1">
                        {t("plugins.tagEditor.duration", "Duración")}
                      </span>
                      <span className="text-sm font-extrabold text-content">
                        {formatDuration(initialData.duration_secs)}
                      </span>
                    </div>

                    <div className="p-3 bg-background border border-divider rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider text-muted font-bold block mb-1">
                        {t("plugins.tagEditor.bitrate", "Bitrate")}
                      </span>
                      <span className="text-sm font-extrabold text-content">
                        {initialData.bitrate_kbps ? `${initialData.bitrate_kbps} kbps` : "--"}
                      </span>
                    </div>

                    <div className="p-3 bg-background border border-divider rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider text-muted font-bold block mb-1">
                        {t("plugins.tagEditor.sampleRate", "Frecuencia")}
                      </span>
                      <span className="text-sm font-extrabold text-content">
                        {initialData.sample_rate_hz ? `${initialData.sample_rate_hz} Hz` : "--"}
                      </span>
                    </div>

                    <div className="p-3 bg-background border border-divider rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider text-muted font-bold block mb-1">
                        {t("plugins.tagEditor.bitDepth", "Profundidad")}
                      </span>
                      <span className="text-sm font-extrabold text-content">
                        {initialData.bit_depth ? `${initialData.bit_depth}-bit` : "--"}
                      </span>
                    </div>

                    <div className="p-3 bg-background border border-divider rounded-xl">
                      <span className="text-[11px] uppercase tracking-wider text-muted font-bold block mb-1">
                        {t("plugins.tagEditor.fileSize", "Tamaño")}
                      </span>
                      <span className="text-sm font-extrabold text-content">
                        {formatBytes(initialData.file_size_bytes)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3.5 bg-background border border-divider rounded-xl">
                    <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">
                      {t("plugins.tagEditor.filePath", "Ruta en disco")}
                    </span>
                    <span className="text-xs text-content font-mono break-all select-all">
                      {initialData.full_path}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del modal con acciones */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-divider bg-surface shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-muted hover:text-content hover:bg-surface-hover border border-divider transition-colors cursor-pointer"
          >
            {t("plugins.tagEditor.cancel", "Cancelar")}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !title.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>
              {saving
                ? t("plugins.tagEditor.saving", "Guardando...")
                : t("plugins.tagEditor.save", "Guardar Cambios")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagEditorModal;

