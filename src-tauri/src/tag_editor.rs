use crate::cover::invalidate_cover_cache;
use crate::models::{FullTrackMetadata, MpdConfig, UpdateTrackMetadataPayload};
use crate::mpd_client::{connect_to_mpd, get_music_dir};
use base64::Engine;
use lofty::config::WriteOptions;
use lofty::file::AudioFile;
use lofty::picture::{Picture, PictureType};
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::tag::{ItemKey, Tag};
use std::fs;
use std::path::Path;
use tauri::State;

#[tauri::command]
pub fn get_track_metadata(path: String) -> Result<FullTrackMetadata, String> {
    let base = get_music_dir().ok_or_else(|| "No se encontró el directorio de música en mpd.conf".to_string())?;
    let clean_rel = path.trim_start_matches('/');
    let full_path = Path::new(&base).join(clean_rel);

    if !full_path.exists() {
        return Err(format!("El archivo no existe en el disco: {:?}", full_path));
    }

    let file_size_bytes = fs::metadata(&full_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let tagged_file = Probe::open(&full_path)
        .map_err(|e| format!("Error al abrir el archivo de audio: {}", e))?
        .read()
        .map_err(|e| format!("Error al leer metadatos de audio: {}", e))?;

    let file_format = format!("{:?}", tagged_file.file_type());
    let properties = tagged_file.properties();

    let duration_secs = properties.duration().as_secs();
    let bitrate_kbps = properties.audio_bitrate().or_else(|| properties.overall_bitrate());
    let sample_rate_hz = properties.sample_rate();
    let bit_depth = properties.bit_depth();
    let channels = properties.channels();

    let tag = tagged_file.primary_tag().or_else(|| tagged_file.first_tag());

    let title = tag
        .and_then(|t| t.title().as_deref().map(String::from))
        .unwrap_or_else(|| {
            full_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(&path)
                .to_string()
        });

    let artist = tag
        .and_then(|t| t.artist().as_deref().map(String::from))
        .unwrap_or_else(|| "Desconocido".to_string());

    let album_artist = tag.and_then(|t| t.get_string(&ItemKey::AlbumArtist).map(String::from));
    let album = tag
        .and_then(|t| t.album().as_deref().map(String::from))
        .unwrap_or_else(|| "Desconocido".to_string());

    let genre = tag.and_then(|t| t.genre().as_deref().map(String::from));
    let year = tag.and_then(|t| t.year());
    let track_number = tag.and_then(|t| t.track());
    let track_total = tag.and_then(|t| t.track_total());
    let disc_number = tag.and_then(|t| t.disk());
    let disc_total = tag.and_then(|t| t.disk_total());
    let comment = tag.and_then(|t| t.comment().as_deref().map(String::from));
    let lyrics = tag.and_then(|t| t.get_string(&ItemKey::Lyrics).map(String::from));

    let mut has_cover = false;
    let mut cover_mime = None;
    let mut cover_base64 = None;

    if let Some(t) = tag {
        if let Some(pic) = t
            .pictures()
            .iter()
            .find(|p| p.pic_type() == PictureType::CoverFront)
            .or_else(|| t.pictures().first())
        {
            has_cover = true;
            cover_mime = pic.mime_type().map(|m| m.to_string());
            cover_base64 = Some(base64::engine::general_purpose::STANDARD.encode(pic.data()));
        }
    }

    Ok(FullTrackMetadata {
        path,
        full_path: full_path.to_string_lossy().to_string(),
        title,
        artist,
        album_artist,
        album,
        genre,
        year,
        track_number,
        track_total,
        disc_number,
        disc_total,
        comment,
        lyrics,
        has_cover,
        cover_mime,
        cover_base64,
        format: file_format,
        duration_secs,
        bitrate_kbps,
        sample_rate_hz,
        bit_depth,
        channels,
        file_size_bytes,
    })
}

#[tauri::command]
pub fn update_track_metadata(
    payload: UpdateTrackMetadataPayload,
    state: State<'_, MpdConfig>,
) -> Result<(), String> {
    let base = get_music_dir().ok_or_else(|| "No se encontró el directorio de música en mpd.conf".to_string())?;
    let clean_rel = payload.path.trim_start_matches('/');
    let full_path = Path::new(&base).join(clean_rel);

    if !full_path.exists() {
        return Err(format!("El archivo no existe en el disco: {:?}", full_path));
    }

    let mut tagged_file = Probe::open(&full_path)
        .map_err(|e| format!("Error al abrir archivo para escritura: {}", e))?
        .read()
        .map_err(|e| format!("Error al leer estructura de etiquetas: {}", e))?;

    let tag = match tagged_file.primary_tag_mut() {
        Some(t) => t,
        None => {
            if let Some(t) = tagged_file.first_tag_mut() {
                t
            } else {
                let tag_type = tagged_file.primary_tag_type();
                tagged_file.insert_tag(Tag::new(tag_type));
                tagged_file
                    .primary_tag_mut()
                    .ok_or_else(|| "No se pudo inicializar la etiqueta de metadatos en el archivo".to_string())?
            }
        }
    };

    if let Some(title) = payload.title {
        let trimmed = title.trim();
        if !trimmed.is_empty() {
            tag.set_title(trimmed.to_string());
        } else {
            tag.remove_title();
        }
    }

    if let Some(artist) = payload.artist {
        let trimmed = artist.trim();
        if !trimmed.is_empty() {
            tag.set_artist(trimmed.to_string());
        } else {
            tag.remove_artist();
        }
    }

    if let Some(album_artist) = payload.album_artist {
        let trimmed = album_artist.trim();
        if !trimmed.is_empty() {
            tag.insert_text(ItemKey::AlbumArtist, trimmed.to_string());
        } else {
            tag.remove_key(&ItemKey::AlbumArtist);
        }
    }

    if let Some(album) = payload.album {
        let trimmed = album.trim();
        if !trimmed.is_empty() {
            tag.set_album(trimmed.to_string());
        } else {
            tag.remove_album();
        }
    }

    if let Some(genre) = payload.genre {
        let trimmed = genre.trim();
        if !trimmed.is_empty() {
            tag.set_genre(trimmed.to_string());
        } else {
            tag.remove_genre();
        }
    }

    if let Some(year) = payload.year {
        if year > 0 {
            tag.set_year(year);
        } else {
            tag.remove_year();
        }
    }

    if let Some(track) = payload.track_number {
        if track > 0 {
            tag.set_track(track);
        } else {
            tag.remove_track();
        }
    }

    if let Some(track_total) = payload.track_total {
        if track_total > 0 {
            tag.set_track_total(track_total);
        } else {
            tag.remove_track_total();
        }
    }

    if let Some(disc) = payload.disc_number {
        if disc > 0 {
            tag.set_disk(disc);
        } else {
            tag.remove_disk();
        }
    }

    if let Some(disc_total) = payload.disc_total {
        if disc_total > 0 {
            tag.set_disk_total(disc_total);
        } else {
            tag.remove_disk_total();
        }
    }

    if let Some(comment) = payload.comment {
        let trimmed = comment.trim();
        if !trimmed.is_empty() {
            tag.set_comment(trimmed.to_string());
        } else {
            tag.remove_comment();
        }
    }

    if let Some(lyrics) = payload.lyrics {
        let trimmed = lyrics.trim();
        if !trimmed.is_empty() {
            tag.insert_text(ItemKey::Lyrics, trimmed.to_string());
        } else {
            tag.remove_key(&ItemKey::Lyrics);
        }
    }

    // Gestionar acción sobre carátula
    match payload.cover_action.as_deref() {
        Some("remove") => {
            tag.remove_picture_type(PictureType::CoverFront);
            tag.remove_picture_type(PictureType::Other);
        }
        Some("replace") => {
            if let Some(b64) = payload.new_cover_base64 {
                let data = base64::engine::general_purpose::STANDARD
                    .decode(b64)
                    .map_err(|e| format!("Error decodificando imagen base64: {}", e))?;
                let mut cursor = std::io::Cursor::new(data);
                let mut pic = Picture::from_reader(&mut cursor)
                    .map_err(|e| format!("Formato de imagen inválido: {}", e))?;
                pic.set_pic_type(PictureType::CoverFront);
                tag.remove_picture_type(PictureType::CoverFront);
                tag.remove_picture_type(PictureType::Other);
                tag.push_picture(pic);
            }
        }
        _ => {}
    }

    // Guardar cambios en el archivo físico
    tag.save_to_path(&full_path, WriteOptions::default())
        .map_err(|e| format!("Error al escribir metadatos en el archivo: {}", e))?;

    // Limpiar caché de portada para forzar recarga si se modificó
    invalidate_cover_cache(&payload.path);

    // Actualizar base de datos de MPD
    if let Ok(mut conn) = connect_to_mpd(&state) {
        let _ = conn.update();
    }

    Ok(())
}
