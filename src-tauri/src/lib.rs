#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lofty::prelude::*;
use lofty::probe::Probe;
use mpd::{Client, Idle, Query, Song, Subsystem, Term};
use serde::Serialize;
use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{mpsc, Mutex};
use std::thread;
use tauri::http::Response;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager, State};

// -----------------------------------------------------------------------------
// ESTRUCTURAS DE DATOS
// -----------------------------------------------------------------------------

pub struct MpdConfig {
    pub address: Mutex<String>,
    pub password: Mutex<String>,
}

pub struct AppSettings {
    pub minimize_to_tray: Mutex<bool>,
}

#[derive(Clone, Serialize)]
pub struct TrackData {
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub time: String,
    pub genre: Option<String>,
    pub date: Option<String>,
    pub track_number: Option<String>,
}

#[derive(Serialize)]
pub struct MpdStatus {
    pub state: String,
    pub volume: i8,
}

#[derive(Clone, Serialize)]
pub struct PlayerStatePayload {
    pub state: String,
    pub elapsed_secs: u64,
    pub total_secs: u64,
    pub current_track: Option<TrackData>,
}

// -----------------------------------------------------------------------------
// FUNCIONES AUXILIARES (HELPERS)
// -----------------------------------------------------------------------------

fn connect_to_mpd_raw(address: &str, password: &str) -> Result<Client, String> {
    let mut conn = Client::connect(address).map_err(|e| e.to_string())?;
    if !password.is_empty() {
        conn.login(password).map_err(|e| e.to_string())?;
    }
    Ok(conn)
}

fn connect_to_mpd(state: &State<'_, MpdConfig>) -> Result<Client, String> {
    let address = state.address.lock().unwrap().clone();
    let password = state.password.lock().unwrap().clone();
    connect_to_mpd_raw(&address, &password)
}

fn get_music_dir() -> Option<String> {
    let home = std::env::var("HOME").unwrap_or_default();
    let conf_path = PathBuf::from(&home).join(".config/mpd/mpd.conf");

    if let Ok(content) = fs::read_to_string(&conf_path) {
        for line in content.lines() {
            if line.trim_start().starts_with("music_directory") {
                let parts: Vec<&str> = line.split('"').collect();
                if parts.len() >= 3 {
                    let mut dir = parts[1].to_string();
                    if dir.starts_with('~') {
                        dir = dir.replacen('~', &home, 1);
                    }
                    return Some(dir);
                }
            }
        }
    }
    None
}

fn save_temp_cover(relative_path: &str) -> Option<String> {
    let base = get_music_dir()?;
    let full_path = Path::new(&base).join(relative_path);

    if let Ok(tagged_file) = Probe::open(&full_path).and_then(|p| p.read()) {
        if let Some(tag) = tagged_file.primary_tag().or_else(|| tagged_file.first_tag()) {
            if let Some(pic) = tag.pictures().first() {
                let temp_file_path = std::env::temp_dir().join("soundgaze_cover_current.jpg");
                if let Ok(mut file) = std::fs::File::create(&temp_file_path) {
                    if file.write_all(pic.data()).is_ok() {
                        return Some(format!("file://{}", temp_file_path.display()));
                    }
                }
            }
        }
    }
    None
}

fn get_mpd_state(address: &str, password: &str) -> Result<PlayerStatePayload, String> {
    let mut conn = connect_to_mpd_raw(address, password)?;
    let status = conn.status().map_err(|e| e.to_string())?;
    let current_song = conn.currentsong().map_err(|e| e.to_string())?;

    let (elapsed_secs, total_secs) = match status.time {
        Some((elapsed, total)) => (elapsed.as_secs(), total.as_secs()),
        None => (0, 0),
    };

    let current_track = current_song.map(|song| {
        let path = song.file.clone();
        let title = song.title.clone().unwrap_or_else(|| {
            Path::new(&path).file_stem().and_then(|s| s.to_str()).unwrap_or(&path).to_string()
        });
        let artist = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Artist") || k.eq_ignore_ascii_case("AlbumArtist"))
            .map(|(_, v)| v.clone()).unwrap_or_else(|| "Desconocido".to_string());
        let album = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Album"))
            .map(|(_, v)| v.clone()).unwrap_or_else(|| "Desconocido".to_string());
        let genre = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Genre"))
            .map(|(_, v)| v.clone());
        let date = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Date") || k.eq_ignore_ascii_case("Year"))
            .map(|(_, v)| v.clone());
        let track_number = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Track"))
            .map(|(_, v)| v.clone());
        let time = match song.duration {
            Some(d) => format!("{}:{:02}", d.as_secs() / 60, d.as_secs() % 60),
            None => "--:--".to_string(),
        };

        TrackData { path, title, artist, album, time, genre, date, track_number }
    });

    Ok(PlayerStatePayload {
        state: format!("{:?}", status.state),
        elapsed_secs,
        total_secs,
        current_track,
    })
}

// -----------------------------------------------------------------------------
// COMANDOS DE TAURI: CONFIGURACIÓN Y AJUSTES
// -----------------------------------------------------------------------------

#[tauri::command]
fn update_minimize_to_tray(minimize: bool, state: State<'_, AppSettings>) {
    let mut lock = state.minimize_to_tray.lock().unwrap();
    *lock = minimize;
}

#[tauri::command]
fn mpd_set_music_directory(new_path: String) -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "".to_string());
    let conf_path = PathBuf::from(&home).join(".config/mpd/mpd.conf");

    if !conf_path.exists() {
        return Err("No se encontró el archivo mpd.conf en ~/.config/mpd/".to_string());
    }

    let content = fs::read_to_string(&conf_path).map_err(|e| e.to_string())?;
    let mut new_content = String::new();

    for line in content.lines() {
        if line.trim_start().starts_with("music_directory") {
            new_content.push_str(&format!("music_directory \"{}\"\n", new_path));
        } else {
            new_content.push_str(line);
            new_content.push('\n');
        }
    }

    fs::write(&conf_path, new_content).map_err(|e| e.to_string())?;

    let output = Command::new("systemctl")
        .args(["--user", "restart", "mpd"])
        .output()
        .map_err(|e| format!("Error al ejecutar systemctl: {}", e))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("No se pudo reiniciar MPD: {}", error_msg));
    }

    std::thread::sleep(std::time::Duration::from_secs(1));
    Ok("Ruta actualizada y MPD reiniciado con éxito".to_string())
}

#[tauri::command]
fn mpd_test_connection(host: String, port: String, password: String) -> Result<String, String> {
    let address = format!("{}:{}", host, port);
    let mut conn = Client::connect(&address).map_err(|e| e.to_string())?;
    if !password.is_empty() {
        conn.login(&password).map_err(|e| format!("Fallo de autenticación: {}", e))?;
    }
    Ok("Conexión exitosa".to_string())
}

#[tauri::command]
fn mpd_update_global_config(
    host: String,
    port: String,
    password: String,
    state: State<'_, MpdConfig>,
) -> Result<(), String> {
    let mut addr_lock = state.address.lock().unwrap();
    *addr_lock = format!("{}:{}", host, port);

    let mut pass_lock = state.password.lock().unwrap();
    *pass_lock = password;

    Ok(())
}

#[tauri::command]
fn mpd_set_output(device_id: String) -> Result<String, String> {
    println!("Dispositivo de salida solicitado desde React: {}", device_id);
    Ok(format!("Salida ajustada a: {}", device_id))
}

// -----------------------------------------------------------------------------
// COMANDOS DE TAURI: BIBLIOTECA E INFORMACIÓN
// -----------------------------------------------------------------------------

#[tauri::command]
fn mpd_get_library(state: State<'_, MpdConfig>) -> Result<Vec<TrackData>, String> {
    let mut conn = connect_to_mpd(&state)?;
    let mut query = Query::new();
    query.and(Term::Any, "");

    let songs: Vec<Song> = conn.search(&query, None).map_err(|e| e.to_string())?;
    let mut tracks = Vec::new();

    for song in songs {
        let path = song.file.clone();
        let title = song.title.clone().unwrap_or_else(|| {
            Path::new(&path).file_stem().and_then(|s| s.to_str()).unwrap_or(&path).to_string()
        });
        let artist = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Artist") || k.eq_ignore_ascii_case("AlbumArtist"))
            .map(|(_, v)| v.clone()).unwrap_or_else(|| "Desconocido".to_string());
        let album = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Album"))
            .map(|(_, v)| v.clone()).unwrap_or_else(|| "Desconocido".to_string());
        let genre = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Genre"))
            .map(|(_, v)| v.clone());
        let date = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Date") || k.eq_ignore_ascii_case("Year"))
            .map(|(_, v)| v.clone());
        let track_number = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Track"))
            .map(|(_, v)| v.clone());
        let time = match song.duration {
            Some(d) => {
                let secs = d.as_secs();
                format!("{}:{:02}", secs / 60, secs % 60)
            }
            None => "--:--".to_string(),
        };

        tracks.push(TrackData { path, title, artist, album, time, genre, date, track_number });
    }

    Ok(tracks)
}

#[tauri::command]
fn mpd_update_db(state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.update().map_err(|e| e.to_string())?;
    Ok("Escaneo iniciado".to_string())
}

#[tauri::command]
fn mpd_get_status(state: State<'_, MpdConfig>) -> Result<MpdStatus, String> {
    let mut conn = connect_to_mpd(&state)?;
    let status = conn.status().map_err(|e| e.to_string())?;

    Ok(MpdStatus {
        state: format!("{:?}", status.state),
        volume: status.volume,
    })
}

#[tauri::command]
fn mpd_get_current_state(state: State<'_, MpdConfig>) -> Result<PlayerStatePayload, String> {
    let address = state.address.lock().unwrap().clone();
    let password = state.password.lock().unwrap().clone();
    get_mpd_state(&address, &password)
}

#[tauri::command]
fn read_local_lyrics(audio_path: String) -> Result<String, String> {
    let lrc_path = PathBuf::from(audio_path).with_extension("lrc");
    match fs::read_to_string(&lrc_path) {
        Ok(content) => Ok(content),
        Err(_) => Err(format!("No se encontró archivo LRC en: {:?}", lrc_path)),
    }
}

// -----------------------------------------------------------------------------
// COMANDOS DE TAURI: REPRODUCCIÓN Y COLA
// -----------------------------------------------------------------------------

#[tauri::command]
fn mpd_toggle_play(state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    let status = conn.status().map_err(|e| e.to_string())?;

    match status.state {
        mpd::State::Play => {
            conn.pause(true).map_err(|e| e.to_string())?;
            Ok("Pausado".to_string())
        }
        _ => {
            conn.play().map_err(|e| e.to_string())?;
            Ok("Reproduciendo".to_string())
        }
    }
}

#[tauri::command]
fn mpd_play_file(path: String, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.clear().map_err(|e| e.to_string())?;

    let song = Song {
        file: path.clone(),
        ..Default::default()
    };

    conn.push(song).map_err(|e| e.to_string())?;
    conn.play().map_err(|e| e.to_string())?;

    Ok(format!("Reproduciendo: {}", path))
}

#[tauri::command]
fn mpd_play_context(paths: Vec<String>, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.clear().map_err(|e| e.to_string())?;

    if paths.is_empty() {
        return Ok("No hay canciones".to_string());
    }

    for path in paths {
        let song = Song {
            file: path,
            ..Default::default()
        };
        let _ = conn.push(song);
    }

    conn.play().map_err(|e| e.to_string())?;
    Ok("Reproduciendo contexto".to_string())
}

#[tauri::command]
fn mpd_get_queue(state: State<'_, MpdConfig>) -> Result<Vec<TrackData>, String> {
    let mut conn = connect_to_mpd(&state)?;
    let queue_songs = conn.queue().map_err(|e| e.to_string())?;
    let mut tracks = Vec::new();

    for song in queue_songs {
        let path = song.file.clone();
        let title = song.title.clone().unwrap_or_else(|| {
            Path::new(&path).file_stem().and_then(|s| s.to_str()).unwrap_or(&path).to_string()
        });
        let artist = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Artist") || k.eq_ignore_ascii_case("AlbumArtist"))
            .map(|(_, v)| v.clone()).unwrap_or_else(|| "Desconocido".to_string());
        let album = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Album"))
            .map(|(_, v)| v.clone()).unwrap_or_else(|| "Desconocido".to_string());
        let genre = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Genre"))
            .map(|(_, v)| v.clone());
        let date = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Date") || k.eq_ignore_ascii_case("Year"))
            .map(|(_, v)| v.clone());
        let track_number = song.tags.iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Track"))
            .map(|(_, v)| v.clone());
        let time = match song.duration {
            Some(d) => format!("{}:{:02}", d.as_secs() / 60, d.as_secs() % 60),
            None => "--:--".to_string(),
        };

        tracks.push(TrackData { path, title, artist, album, time, genre, date, track_number });
    }

    Ok(tracks)
}

#[tauri::command]
fn mpd_move_track(from: u32, to: usize, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.shift(from..from + 1, to).map_err(|e| e.to_string())?;
    Ok("Pista reordenada".to_string())
}

#[tauri::command]
fn mpd_next(state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.next().map_err(|e| e.to_string())?;
    Ok("Siguiente pista".to_string())
}

#[tauri::command]
fn mpd_prev(state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.prev().map_err(|e| e.to_string())?;
    Ok("Pista anterior".to_string())
}

#[tauri::command]
fn mpd_seek(seconds: u64, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    let status = conn.status().map_err(|e| e.to_string())?;

    if let Some(song_pos) = status.song {
        conn.seek(song_pos.pos, std::time::Duration::from_secs(seconds)).map_err(|e| e.to_string())?;
    }

    Ok(format!("Saltado al segundo {}", seconds))
}

#[tauri::command]
fn mpd_set_volume(volume: i8, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.volume(volume).map_err(|e| e.to_string())?;
    Ok(format!("Volumen ajustado a {}", volume))
}

#[tauri::command]
fn mpd_set_crossfade(seconds: u32, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.crossfade(seconds as i64).map_err(|e| e.to_string())?;
    Ok(format!("Crossfade ajustado a {} segundos", seconds))
}

#[tauri::command]
fn mpd_set_replay_gain(mode: String, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    let gain_mode = match mode.to_lowercase().as_str() {
        "track" => mpd::ReplayGain::Track,
        "album" => mpd::ReplayGain::Album,
        "auto" => mpd::ReplayGain::Auto,
        _ => mpd::ReplayGain::Off,
    };

    conn.replaygain(gain_mode).map_err(|e| e.to_string())?;
    Ok(format!("ReplayGain ajustado a modo: {}", mode))
}

// -----------------------------------------------------------------------------
// OTROS COMANDOS
// -----------------------------------------------------------------------------

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// -----------------------------------------------------------------------------
// PUNTO DE ENTRADA PRINCIPAL
// -----------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(MpdConfig {
            address: Mutex::new("127.0.0.1:6600".to_string()),
            password: Mutex::new("".to_string()),
        })
        .manage(AppSettings {
            minimize_to_tray: Mutex::new(true),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app_handle = window.app_handle();
                let app_settings = app_handle.state::<AppSettings>();
                let minimize = *app_settings.minimize_to_tray.lock().unwrap();

                if minimize {
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    let state = app_handle.state::<MpdConfig>();
                    let address = state.address.lock().unwrap().clone();
                    let password = state.password.lock().unwrap().clone();

                    if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                        let _ = conn.stop();
                    }
                }
            }
        })
        .setup(|app| {
            let app_handle = app.handle().clone();

            let hwnd = None;
            let config = PlatformConfig {
                dbus_name: "soundgaze_music_player",
                display_name: "Soundgaze Music Player",
                hwnd,
            };

            let mut controls = MediaControls::new(config).expect("Error al iniciar MPRIS");
            let (tx, rx) = mpsc::channel();
            controls.attach(move |event: MediaControlEvent| {
                let _ = tx.send(event);
            }).unwrap();

            app.manage(Mutex::new(controls));

            let app_handle_mpris = app.handle().clone();
            thread::spawn(move || {
                for event in rx {
                    let state = app_handle_mpris.state::<MpdConfig>();
                    let address = state.address.lock().unwrap().clone();
                    let password = state.password.lock().unwrap().clone();

                    if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                        match event {
                            MediaControlEvent::Toggle | MediaControlEvent::Play | MediaControlEvent::Pause => {
                                if let Ok(status) = conn.status() {
                                    match status.state {
                                        mpd::State::Play => { let _ = conn.pause(true); }
                                        _ => { let _ = conn.play(); }
                                    }
                                }
                            }
                            MediaControlEvent::Next => { let _ = conn.next(); }
                            MediaControlEvent::Previous => { let _ = conn.prev(); }
                            _ => {}
                        }
                    }
                }
            });

            let show_i = MenuItem::with_id(app, "show", "Mostrar Reproductor", true, None::<&str>)?;
            let prev_i = MenuItem::with_id(app, "prev", "⏮ Anterior", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle", "⏯ Reproducir / Pausar", true, None::<&str>)?;
            let next_i = MenuItem::with_id(app, "next", "⏭ Siguiente", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;

            let tray_menu = Menu::with_items(
                app,
                &[&show_i, &separator, &prev_i, &toggle_i, &next_i, &separator, &quit_i],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            let state = app.state::<MpdConfig>();
                            let address = state.address.lock().unwrap().clone();
                            let password = state.password.lock().unwrap().clone();

                            if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                                let _ = conn.stop();
                            }
                            app.exit(0);
                        }
                        "next" => {
                            let state = app.state::<MpdConfig>();
                            let address = state.address.lock().unwrap().clone();
                            let password = state.password.lock().unwrap().clone();
                            if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                                let _ = conn.next();
                            }
                        }
                        "toggle" => {
                            let state = app.state::<MpdConfig>();
                            let address = state.address.lock().unwrap().clone();
                            let password = state.password.lock().unwrap().clone();

                            if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                                if let Ok(status) = conn.status() {
                                    match status.state {
                                        mpd::State::Play => { let _ = conn.pause(true); }
                                        _ => { let _ = conn.play(); }
                                    }
                                }
                            }
                        }
                        "prev" => {
                            let state = app.state::<MpdConfig>();
                            let address = state.address.lock().unwrap().clone();
                            let password = state.password.lock().unwrap().clone();
                            if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                                let _ = conn.prev();
                            }
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                                let _ = window.request_user_attention(Some(tauri::UserAttentionType::Critical));
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                            let _ = window.request_user_attention(Some(tauri::UserAttentionType::Critical));
                        }
                    }
                })
                .build(app)?;

            thread::spawn(move || loop {
                let state = app_handle.state::<MpdConfig>();
                let address = state.address.lock().unwrap().clone();
                let password = state.password.lock().unwrap().clone();

                if let Ok(mut watcher_conn) = connect_to_mpd_raw(&address, &password) {
                    if let Ok(_) = watcher_conn.wait(&[Subsystem::Player, Subsystem::Mixer]) {
                        if let Ok(new_state) = get_mpd_state(&address, &password) {
                            let _ = app_handle.emit("mpd-update", new_state.clone());

                            let controls_state = app_handle.state::<Mutex<MediaControls>>();
                            if let Ok(mut controls) = controls_state.inner().lock() {
                                let playback = if new_state.state == "Play" {
                                    MediaPlayback::Playing { progress: None }
                                } else {
                                    MediaPlayback::Paused { progress: None }
                                };
                                let _ = controls.set_playback(playback);

                                if let Some(track) = &new_state.current_track {
                                    let cover_uri = save_temp_cover(&track.path);
                                    let _ = controls.set_metadata(MediaMetadata {
                                        title: Some(&track.title),
                                        artist: Some(&track.artist),
                                        album: Some(&track.album),
                                        duration: Some(std::time::Duration::from_secs(new_state.total_secs)),
                                        cover_url: cover_uri.as_deref(),
                                    });
                                }
                            }
                        }
                    }
                } else {
                    thread::sleep(std::time::Duration::from_secs(2));
                }
            });

            Ok(())
        })
        .register_uri_scheme_protocol("cover", |_app, request| {
            let uri = request.uri().to_string();
            let query = uri.split('?').nth(1).unwrap_or("");

            let mut decoded_path = String::new();
            let mut decoded_base = String::new();

            for pair in query.split('&') {
                if pair.starts_with("path=") {
                    decoded_path = urlencoding::decode(&pair[5..]).unwrap_or_default().into_owned();
                } else if pair.starts_with("base=") {
                    decoded_base = urlencoding::decode(&pair[5..]).unwrap_or_default().into_owned();
                }
            }

            let home = std::env::var("HOME").unwrap_or_else(|_| "".to_string());
            let resolved_base = if decoded_base.starts_with('~') {
                decoded_base.replacen('~', &home, 1)
            } else {
                decoded_base
            };

            let full_path = if !resolved_base.is_empty() {
                Path::new(&resolved_base).join(decoded_path)
            } else {
                Path::new(&home).join("Música").join(decoded_path)
            };

            if let Ok(tagged_file) = Probe::open(&full_path).and_then(|p| p.read()) {
                if let Some(tag) = tagged_file.primary_tag().or_else(|| tagged_file.first_tag()) {
                    if let Some(pic) = tag.pictures().first() {
                        let mime = pic.mime_type().map(|m| m.to_string()).unwrap_or_else(|| "image/jpeg".to_string());
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

            Response::builder()
                .status(404)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .unwrap()
        })
        .invoke_handler(tauri::generate_handler![
            update_minimize_to_tray,
            mpd_set_music_directory,
            mpd_test_connection,
            mpd_update_global_config,
            mpd_set_output,
            mpd_get_library,
            mpd_update_db,
            mpd_get_status,
            mpd_get_current_state,
            read_local_lyrics,
            mpd_toggle_play,
            mpd_play_file,
            mpd_play_context,
            mpd_get_queue,
            mpd_move_track,
            mpd_next,
            mpd_prev,
            mpd_seek,
            mpd_set_volume,
            mpd_set_crossfade,
            mpd_set_replay_gain,
            greet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}