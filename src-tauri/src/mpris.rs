use crate::models::{MpdConfig, PlayerStatePayload};
use crate::mpd_client::connect_to_mpd_raw;
use souvlaki::{MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, PlatformConfig};
use std::sync::{mpsc, Mutex};
use std::thread;
use tauri::{AppHandle, Manager};

pub fn setup_mpris(app_handle: AppHandle) -> Option<Mutex<MediaControls>> {
    let hwnd = None;
    let config = PlatformConfig {
        dbus_name: "soundgaze_music_player",
        display_name: "Soundgaze Music Player",
        hwnd,
    };

    match MediaControls::new(config) {
        Ok(mut controls) => {
            let (tx, rx) = mpsc::channel();
            if let Err(e) = controls.attach(move |event: MediaControlEvent| {
                let _ = tx.send(event);
            }) {
                eprintln!("Advertencia: Error adjuntando listener de MPRIS: {:?}", e);
            }

            let app_handle_mpris = app_handle.clone();
            thread::spawn(move || {
                for event in rx {
                    let state = app_handle_mpris.state::<MpdConfig>();
                    let address = state.address.lock().unwrap().clone();
                    let password = state.password.lock().unwrap().clone();

                    if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                        match event {
                            MediaControlEvent::Toggle
                            | MediaControlEvent::Play
                            | MediaControlEvent::Pause => {
                                if let Ok(status) = conn.status() {
                                    match status.state {
                                        mpd::State::Play => {
                                            let _ = conn.pause(true);
                                        }
                                        _ => {
                                            let _ = conn.play();
                                        }
                                    }
                                }
                            }
                            MediaControlEvent::Next => {
                                let _ = conn.next();
                            }
                            MediaControlEvent::Previous => {
                                let _ = conn.prev();
                            }
                            _ => {}
                        }
                    }
                }
            });

            Some(Mutex::new(controls))
        }
        Err(e) => {
            eprintln!("Advertencia: No se pudo inicializar MPRIS: {:?}", e);
            None
        }
    }
}

pub fn update_mpris_state(
    controls: &mut MediaControls,
    new_state: &PlayerStatePayload,
    cover_uri: Option<&str>,
) {
    let playback = if new_state.state == "Play" {
        MediaPlayback::Playing { progress: None }
    } else {
        MediaPlayback::Paused { progress: None }
    };
    let _ = controls.set_playback(playback);

    if let Some(track) = &new_state.current_track {
        let _ = controls.set_metadata(MediaMetadata {
            title: Some(&track.title),
            artist: Some(&track.artist),
            album: Some(&track.album),
            duration: Some(std::time::Duration::from_secs(new_state.total_secs)),
            cover_url: cover_uri,
        });
    }
}

