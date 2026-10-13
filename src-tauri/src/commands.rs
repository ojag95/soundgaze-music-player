use crate::models::{AppSettings, MpdConfig, MpdStatus, PlayerStatePayload, TrackData};
use crate::mpd_client::{connect_to_mpd, get_mpd_state};
use mpd::{Client, Query, Song, Term};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::State;

// -----------------------------------------------------------------------------
// CONFIGURACIÓN Y AJUSTES
// -----------------------------------------------------------------------------

#[tauri::command]
pub fn update_minimize_to_tray(minimize: bool, state: State<'_, AppSettings>) {
    let mut lock = state.minimize_to_tray.lock().unwrap();
    *lock = minimize;
}

#[tauri::command]
pub fn mpd_set_music_directory(new_path: String) -> Result<String, String> {
    let home = std::env::var("HOME").unwrap_or_default();
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

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("systemctl")
            .args(["--user", "restart", "mpd"])
            .output()
            .map_err(|e| format!("Error al ejecutar systemctl: {}", e))?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            return Err(format!("No se pudo reiniciar MPD: {}", error_msg));
        }
        std::thread::sleep(std::time::Duration::from_secs(1));
    }

    Ok("Ruta actualizada y MPD reiniciado con éxito".to_string())
}

#[tauri::command]
pub fn mpd_test_connection(host: String, port: String, password: String) -> Result<String, String> {
    let address = format!("{}:{}", host, port);
    let mut conn = Client::connect(&address).map_err(|e| e.to_string())?;
    if !password.is_empty() {
        conn.login(&password)
            .map_err(|e| format!("Fallo de autenticación: {}", e))?;
    }
    Ok("Conexión exitosa".to_string())
}

#[tauri::command]
pub fn mpd_update_global_config(
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
pub fn mpd_set_output(device_id: String) -> Result<String, String> {
    println!("Dispositivo de salida solicitado desde React: {}", device_id);
    Ok(format!("Salida ajustada a: {}", device_id))
}

// -----------------------------------------------------------------------------
// BIBLIOTECA E INFORMACIÓN
// -----------------------------------------------------------------------------

#[tauri::command]
pub fn mpd_get_library(state: State<'_, MpdConfig>) -> Result<Vec<TrackData>, String> {
    let mut conn = connect_to_mpd(&state)?;
    let mut query = Query::new();
    query.and(Term::Any, "");

    let songs: Vec<Song> = conn.search(&query, None).map_err(|e| e.to_string())?;
    Ok(songs.into_iter().map(TrackData::from).collect())
}

#[tauri::command]
pub fn mpd_update_db(state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.update().map_err(|e| e.to_string())?;
    Ok("Escaneo iniciado".to_string())
}

#[tauri::command]
pub fn mpd_get_status(state: State<'_, MpdConfig>) -> Result<MpdStatus, String> {
    let mut conn = connect_to_mpd(&state)?;
    let status = conn.status().map_err(|e| e.to_string())?;

    Ok(MpdStatus {
        state: format!("{:?}", status.state),
        volume: status.volume,
    })
}

#[tauri::command]
pub fn mpd_get_current_state(state: State<'_, MpdConfig>) -> Result<PlayerStatePayload, String> {
    let address = state.address.lock().unwrap().clone();
    let password = state.password.lock().unwrap().clone();
    get_mpd_state(&address, &password)
}

#[tauri::command]
pub fn read_local_lyrics(audio_path: String) -> Result<String, String> {
    let lrc_path = PathBuf::from(audio_path).with_extension("lrc");
    match fs::read_to_string(&lrc_path) {
        Ok(content) => Ok(content),
        Err(_) => Err(format!("No se encontró archivo LRC en: {:?}", lrc_path)),
    }
}

// -----------------------------------------------------------------------------
// REPRODUCCIÓN Y COLA
// -----------------------------------------------------------------------------

#[tauri::command]
pub fn mpd_toggle_play(state: State<'_, MpdConfig>) -> Result<String, String> {
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
pub fn mpd_play_file(path: String, state: State<'_, MpdConfig>) -> Result<String, String> {
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
pub fn mpd_play_context(paths: Vec<String>, state: State<'_, MpdConfig>) -> Result<String, String> {
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
pub fn mpd_append_context(paths: Vec<String>, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
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

    Ok("Canciones añadidas a la cola".to_string())
}

#[tauri::command]
pub fn mpd_get_queue(state: State<'_, MpdConfig>) -> Result<Vec<TrackData>, String> {
    let mut conn = connect_to_mpd(&state)?;
    let queue_songs = conn.queue().map_err(|e| e.to_string())?;
    Ok(queue_songs.into_iter().map(TrackData::from).collect())
}

#[tauri::command]
pub fn mpd_move_track(from: u32, to: usize, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.shift(from..from + 1, to).map_err(|e| e.to_string())?;
    Ok("Pista reordenada".to_string())
}

#[tauri::command]
pub fn mpd_next(state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.next().map_err(|e| e.to_string())?;
    Ok("Siguiente pista".to_string())
}

#[tauri::command]
pub fn mpd_prev(state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.prev().map_err(|e| e.to_string())?;
    Ok("Pista anterior".to_string())
}

#[tauri::command]
pub fn mpd_seek(seconds: u64, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    let status = conn.status().map_err(|e| e.to_string())?;

    if let Some(song_pos) = status.song {
        conn.seek(song_pos.pos, std::time::Duration::from_secs(seconds))
            .map_err(|e| e.to_string())?;
    }

    Ok(format!("Saltado al segundo {}", seconds))
}

#[tauri::command]
pub fn mpd_set_volume(volume: i8, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.volume(volume).map_err(|e| e.to_string())?;
    Ok(format!("Volumen ajustado a {}", volume))
}

#[tauri::command]
pub fn mpd_set_crossfade(seconds: u32, state: State<'_, MpdConfig>) -> Result<String, String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.crossfade(seconds as i64).map_err(|e| e.to_string())?;
    Ok(format!("Crossfade ajustado a {} segundos", seconds))
}

#[tauri::command]
pub fn mpd_set_replay_gain(mode: String, state: State<'_, MpdConfig>) -> Result<String, String> {
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

#[tauri::command]
pub fn mpd_shuffle(state: State<'_, MpdConfig>) -> Result<(), String> {
    let mut conn = connect_to_mpd(&state)?;
    conn.shuffle(..).map_err(|e| format!("Error haciendo shuffle: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

