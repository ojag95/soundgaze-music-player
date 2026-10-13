use crate::mpd_client::get_music_dir;
use lofty::prelude::*;
use lofty::probe::Probe;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::http::{Request, Response};

static LAST_COVER_CACHE: Mutex<Option<(String, Option<String>)>> = Mutex::new(None);

pub fn save_temp_cover(relative_path: &str) -> Option<String> {
    // Si la pista actual no ha cambiado, devolvemos la URI en caché para evitar lecturas/escrituras continuas a disco
    if let Ok(cache) = LAST_COVER_CACHE.lock() {
        if let Some((cached_path, cached_uri)) = &*cache {
            if cached_path == relative_path {
                return cached_uri.clone();
            }
        }
    }

    let result = (|| {
        let base = get_music_dir()?;
        let clean_rel = relative_path.trim_start_matches('/');
        let full_path = Path::new(&base).join(clean_rel);

        if let Ok(tagged_file) = Probe::open(&full_path).and_then(|p| p.read()) {
            if let Some(tag) = tagged_file.primary_tag().or_else(|| tagged_file.first_tag()) {
                if let Some(pic) = tag.pictures().first() {
                    let ext = if pic.mime_type().map(|m| m.to_string()).as_deref() == Some("image/png") {
                        "png"
                    } else {
                        "jpg"
                    };
                    let temp_file_path = std::env::temp_dir().join(format!("soundgaze_cover_current.{}", ext));
                    if let Ok(mut file) = fs::File::create(&temp_file_path) {
                        if file.write_all(pic.data()).is_ok() {
                            return Some(format!("file://{}", temp_file_path.display()));
                        }
                    }
                }
            }
        }

        // 2. Fallback: buscar archivos de carátula comunes en la misma carpeta (cover.jpg, folder.jpg, etc.)
        if let Some(parent_dir) = full_path.parent() {
            let common_covers = [
                "cover.jpg",
                "cover.png",
                "cover.jpeg",
                "folder.jpg",
                "folder.png",
                "folder.jpeg",
                "front.jpg",
                "front.png",
                "front.jpeg",
            ];
            for cover_name in common_covers {
                let candidate = parent_dir.join(cover_name);
                if candidate.is_file() {
                    return Some(format!("file://{}", candidate.display()));
                }
            }
        }

        None
    })();

    if let Ok(mut cache) = LAST_COVER_CACHE.lock() {
        *cache = Some((relative_path.to_string(), result.clone()));
    }

    result
}

pub fn handle_cover_request(request: &Request<Vec<u8>>) -> Response<Vec<u8>> {
    let uri = request.uri().to_string();
    let query = uri.split('?').nth(1).unwrap_or("");

    let mut decoded_path = String::new();
    let mut decoded_base = String::new();

    for pair in query.split('&') {
        if let Some(val) = pair.strip_prefix("path=") {
            decoded_path = urlencoding::decode(val).unwrap_or_default().into_owned();
        } else if let Some(val) = pair.strip_prefix("base=") {
            decoded_base = urlencoding::decode(val).unwrap_or_default().into_owned();
        }
    }

    let home = std::env::var("HOME").unwrap_or_default();
    let resolved_base = if decoded_base.starts_with('~') {
        decoded_base.replacen('~', &home, 1)
    } else {
        decoded_base
    };

    let base_path = if !resolved_base.is_empty() {
        PathBuf::from(resolved_base)
    } else if let Some(dir) = get_music_dir() {
        PathBuf::from(dir)
    } else {
        let music_en = Path::new(&home).join("Music");
        if music_en.exists() {
            music_en
        } else {
            Path::new(&home).join("Música")
        }
    };

    // Sanitización contra path traversal: evitar rutas absolutas que sobrescriban base_path
    let clean_path = decoded_path.trim_start_matches('/');
    let full_path = base_path.join(clean_path);

    if full_path.exists() {
        // 1. Intentar extraer imagen embebida con Lofty
        if let Ok(tagged_file) = Probe::open(&full_path).and_then(|p| p.read()) {
            if let Some(tag) = tagged_file.primary_tag().or_else(|| tagged_file.first_tag()) {
                if let Some(pic) = tag.pictures().first() {
                    let mime = pic
                        .mime_type()
                        .map(|m| m.to_string())
                        .unwrap_or_else(|| "image/jpeg".to_string());

                    return Response::builder()
                        .header("Content-Type", mime)
                        .header("Cache-Control", "public, max-age=31536000")
                        .header("Access-Control-Allow-Origin", "*")
                        .status(200)
                        .body(pic.data().to_vec())
                        .unwrap();
                }
            }
        }

        // 2. Fallback: buscar archivos de carátula comunes en la misma carpeta (cover.jpg, folder.jpg, etc.)
        if let Some(parent_dir) = full_path.parent() {
            let common_covers = [
                "cover.jpg",
                "cover.png",
                "folder.jpg",
                "folder.png",
                "front.jpg",
                "front.png",
            ];
            for cover_name in common_covers {
                let candidate = parent_dir.join(cover_name);
                if candidate.is_file() {
                    if let Ok(bytes) = fs::read(&candidate) {
                        let mime = if cover_name.ends_with(".png") {
                            "image/png"
                        } else {
                            "image/jpeg"
                        };
                        return Response::builder()
                            .header("Content-Type", mime)
                            .header("Cache-Control", "public, max-age=31536000")
                            .header("Access-Control-Allow-Origin", "*")
                            .status(200)
                            .body(bytes)
                            .unwrap();
                    }
                }
            }
        }
    }

    Response::builder()
        .status(404)
        .header("Access-Control-Allow-Origin", "*")
        .body(Vec::new())
        .unwrap()
}

