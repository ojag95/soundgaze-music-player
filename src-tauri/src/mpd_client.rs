use crate::models::{MpdConfig, PlayerStatePayload, TrackData};
use mpd::Client;
use std::fs;
use std::path::PathBuf;
use tauri::State;

pub fn connect_to_mpd_raw(address: &str, password: &str) -> Result<Client, String> {
    let mut conn = Client::connect(address).map_err(|e| e.to_string())?;
    if !password.is_empty() {
        conn.login(password).map_err(|e| e.to_string())?;
    }
    Ok(conn)
}

pub fn connect_to_mpd(state: &State<'_, MpdConfig>) -> Result<Client, String> {
    let address = state.address.lock().unwrap().clone();
    let password = state.password.lock().unwrap().clone();
    connect_to_mpd_raw(&address, &password)
}

pub fn get_music_dir() -> Option<String> {
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

pub fn get_mpd_state(address: &str, password: &str) -> Result<PlayerStatePayload, String> {
    let mut conn = connect_to_mpd_raw(address, password)?;
    let status = conn.status().map_err(|e| e.to_string())?;
    let current_song = conn.currentsong().map_err(|e| e.to_string())?;

    let (elapsed_secs, total_secs) = match status.time {
        Some((elapsed, total)) => (elapsed.as_secs(), total.as_secs()),
        None => (0, 0),
    };

    let current_track = current_song.map(TrackData::from);

    Ok(PlayerStatePayload {
        state: format!("{:?}", status.state),
        elapsed_secs,
        total_secs,
        current_track,
    })
}

