#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod commands;
pub mod cover;
pub mod models;
pub mod mpd_client;
pub mod mpris;
pub mod tray;

use commands::*;
use cover::handle_cover_request;
use models::{AppSettings, MpdConfig};
use mpd_client::{connect_to_mpd_raw, get_mpd_state};
use mpris::{setup_mpris, update_mpris_state};
use tray::setup_tray;

use mpd::{Idle, Subsystem};
use souvlaki::MediaControls;
use std::sync::Mutex;
use std::thread;
use tauri::{Emitter, Manager};

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

            // Configuración de MPRIS (Media Controls)
            if let Some(controls) = setup_mpris(app_handle.clone()) {
                app.manage(controls);
            }

            // Configuración de Bandeja del Sistema (Tray)
            setup_tray(app)?;

            // Hilo observador de MPD (Idle watcher)
            thread::spawn(move || loop {
                let state = app_handle.state::<MpdConfig>();
                let address = state.address.lock().unwrap().clone();
                let password = state.password.lock().unwrap().clone();

                if let Ok(mut watcher_conn) = connect_to_mpd_raw(&address, &password) {
                    if watcher_conn.wait(&[Subsystem::Player, Subsystem::Mixer]).is_ok() {
                        if let Ok(new_state) = get_mpd_state(&address, &password) {
                            let _ = app_handle.emit("mpd-update", new_state.clone());

                            if let Some(controls_state) = app_handle.try_state::<Mutex<MediaControls>>() {
                                if let Ok(mut controls) = controls_state.lock() {
                                    let cover_uri = new_state
                                        .current_track
                                        .as_ref()
                                        .and_then(|t| cover::save_temp_cover(&t.path));

                                    update_mpris_state(&mut controls, &new_state, cover_uri.as_deref());
                                }
                            }
                        }
                    } else {
                        // Si falla el wait (desconexión o error en el socket de MPD), esperar para evitar 100% CPU
                        thread::sleep(std::time::Duration::from_millis(500));
                    }
                } else {
                    thread::sleep(std::time::Duration::from_secs(2));
                }
            });

            Ok(())
        })
        .register_uri_scheme_protocol("cover", |_app, request| {
            handle_cover_request(&request)
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
            mpd_append_context,
            mpd_get_queue,
            mpd_move_track,
            mpd_next,
            mpd_prev,
            mpd_seek,
            mpd_set_volume,
            mpd_set_crossfade,
            mpd_set_replay_gain,
            mpd_shuffle,
            greet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}