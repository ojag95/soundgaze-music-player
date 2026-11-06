use crate::models::{MpdConfig, PlayerStatePayload};
use crate::mpd_client::connect_to_mpd_raw;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Manager};
use zbus::object_server::SignalEmitter;
use zbus::zvariant::{ObjectPath, Value};

#[derive(Clone, Default)]
pub struct MprisState {
    pub playback_status: String, // "Playing", "Paused", "Stopped"
    pub loop_status: String,     // "None", "Track", "Playlist"
    pub shuffle: bool,
    pub volume: f64,             // 0.0 to 1.0
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_micros: i64,
    pub position_micros: i64,
    pub last_position_instant: Option<Instant>,
    pub cover_url: Option<String>,
}

pub struct MprisManager {
    pub connection: zbus::Connection,
    pub state: Arc<Mutex<MprisState>>,
}

pub struct MprisRoot {
    app_handle: AppHandle,
}

#[zbus::interface(name = "org.mpris.MediaPlayer2")]
impl MprisRoot {
    #[zbus(property)]
    fn can_quit(&self) -> bool {
        true
    }

    #[zbus(property)]
    fn can_raise(&self) -> bool {
        true
    }

    #[zbus(property)]
    fn has_track_list(&self) -> bool {
        false
    }

    #[zbus(property)]
    fn identity(&self) -> &str {
        "Soundgaze Music Player"
    }

    #[zbus(property)]
    fn desktop_entry(&self) -> &str {
        "soundgaze-music-player"
    }

    #[zbus(property)]
    fn supported_uri_schemes(&self) -> Vec<&str> {
        vec!["file"]
    }

    #[zbus(property)]
    fn supported_mime_types(&self) -> Vec<&str> {
        vec!["audio/mpeg", "audio/flac", "audio/ogg", "audio/mp4", "audio/wav"]
    }

    fn quit(&self) {
        self.app_handle.exit(0);
    }

    fn raise(&self) {
        if let Some(w) = self.app_handle.get_webview_window("main") {
            let _ = w.unminimize();
            let _ = w.show();
            let _ = w.set_focus();
        }
    }
}

pub struct MprisPlayer {
    app_handle: AppHandle,
    state: Arc<Mutex<MprisState>>,
}

#[zbus::interface(name = "org.mpris.MediaPlayer2.Player")]
impl MprisPlayer {
    fn next(&self) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();
        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            let _ = conn.next();
        }
    }

    fn previous(&self) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();
        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            let _ = conn.prev();
        }
    }

    fn pause(&self) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();
        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            let _ = conn.pause(true);
        }
    }

    fn play_pause(&self) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();
        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
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
    }

    fn stop(&self) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();
        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            let _ = conn.stop();
        }
    }

    fn play(&self) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();
        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            let _ = conn.play();
        }
    }

    fn seek(&self, offset: i64) {
        let current_pos = self.position();
        let new_pos = (current_pos + offset).max(0);
        let new_pos_secs = (new_pos as f64) / 1_000_000.0;

        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();

        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            if let Ok(status) = conn.status() {
                if let Some(song_pos) = status.song {
                    let _ = conn.seek(
                        song_pos.pos,
                        std::time::Duration::from_secs_f64(new_pos_secs),
                    );
                    let mut st = self.state.lock().unwrap();
                    st.position_micros = new_pos;
                    st.last_position_instant = if st.playback_status == "Playing" {
                        Some(Instant::now())
                    } else {
                        None
                    };
                }
            }
        }
    }

    fn set_position(&self, _track_id: ObjectPath<'_>, position: i64) {
        let new_pos = position.max(0);
        let new_pos_secs = (new_pos as f64) / 1_000_000.0;

        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();

        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            if let Ok(status) = conn.status() {
                if let Some(song_pos) = status.song {
                    let _ = conn.seek(
                        song_pos.pos,
                        std::time::Duration::from_secs_f64(new_pos_secs),
                    );
                    let mut st = self.state.lock().unwrap();
                    st.position_micros = new_pos;
                    st.last_position_instant = if st.playback_status == "Playing" {
                        Some(Instant::now())
                    } else {
                        None
                    };
                }
            }
        }
    }

    fn open_uri(&self, _uri: String) {}

    #[zbus(property)]
    fn playback_status(&self) -> String {
        self.state.lock().unwrap().playback_status.clone()
    }

    #[zbus(property)]
    fn loop_status(&self) -> String {
        self.state.lock().unwrap().loop_status.clone()
    }

    #[zbus(property)]
    fn set_loop_status(&self, loop_status: String) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();

        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            match loop_status.as_str() {
                "Track" => {
                    let _ = conn.repeat(true);
                    let _ = conn.single(true);
                }
                "Playlist" => {
                    let _ = conn.repeat(true);
                    let _ = conn.single(false);
                }
                _ => {
                    let _ = conn.repeat(false);
                    let _ = conn.single(false);
                }
            }
            self.state.lock().unwrap().loop_status = loop_status;
        }
    }

    #[zbus(property)]
    fn rate(&self) -> f64 {
        1.0
    }

    #[zbus(property)]
    fn set_rate(&self, _rate: f64) {}

    #[zbus(property)]
    fn shuffle(&self) -> bool {
        self.state.lock().unwrap().shuffle
    }

    #[zbus(property)]
    fn set_shuffle(&self, shuffle: bool) {
        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();

        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            let _ = conn.random(shuffle);
            self.state.lock().unwrap().shuffle = shuffle;
        }
    }

    #[zbus(property)]
    fn metadata(&self) -> HashMap<String, Value<'static>> {
        let st = self.state.lock().unwrap();
        let mut map = HashMap::new();

        if let Ok(track_id) = ObjectPath::try_from("/org/mpris/MediaPlayer2/CurrentTrack") {
            map.insert("mpris:trackid".to_string(), Value::from(track_id));
        }

        if st.duration_micros > 0 {
            map.insert("mpris:length".to_string(), Value::from(st.duration_micros));
        }

        if !st.title.is_empty() {
            map.insert("xesam:title".to_string(), Value::from(st.title.clone()));
        }

        if !st.artist.is_empty() {
            map.insert(
                "xesam:artist".to_string(),
                Value::from(vec![st.artist.clone()]),
            );
            map.insert(
                "xesam:albumArtist".to_string(),
                Value::from(vec![st.artist.clone()]),
            );
        }

        if !st.album.is_empty() {
            map.insert("xesam:album".to_string(), Value::from(st.album.clone()));
        }

        if let Some(ref cover) = st.cover_url {
            map.insert("mpris:artUrl".to_string(), Value::from(cover.clone()));
        }

        map
    }

    #[zbus(property)]
    fn volume(&self) -> f64 {
        self.state.lock().unwrap().volume
    }

    #[zbus(property)]
    fn set_volume(&self, volume: f64) {
        let clamped = volume.clamp(0.0, 1.0);
        let vol_i8 = (clamped * 100.0) as i8;

        let state = self.app_handle.state::<MpdConfig>();
        let address = state.address.lock().unwrap().clone();
        let password = state.password.lock().unwrap().clone();

        if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
            let _ = conn.volume(vol_i8);
            self.state.lock().unwrap().volume = clamped;
        }
    }

    #[zbus(property)]
    fn position(&self) -> i64 {
        let st = self.state.lock().unwrap();
        if st.playback_status == "Playing" {
            if let Some(instant) = st.last_position_instant {
                let elapsed_micros = instant.elapsed().as_micros() as i64;
                let current = st.position_micros + elapsed_micros;
                if st.duration_micros > 0 {
                    return current.min(st.duration_micros);
                }
                return current;
            }
        }
        st.position_micros
    }

    #[zbus(property)]
    fn minimum_rate(&self) -> f64 {
        1.0
    }

    #[zbus(property)]
    fn maximum_rate(&self) -> f64 {
        1.0
    }

    #[zbus(property)]
    fn can_go_next(&self) -> bool {
        true
    }

    #[zbus(property)]
    fn can_go_previous(&self) -> bool {
        true
    }

    #[zbus(property)]
    fn can_play(&self) -> bool {
        true
    }

    #[zbus(property)]
    fn can_pause(&self) -> bool {
        true
    }

    #[zbus(property)]
    fn can_seek(&self) -> bool {
        true
    }

    #[zbus(property)]
    fn can_control(&self) -> bool {
        true
    }

    #[zbus(signal)]
    pub async fn seeked(emitter: &SignalEmitter<'_>, position: i64) -> zbus::Result<()>;
}

pub fn setup_mpris(app_handle: AppHandle) {
    let app_handle_clone = app_handle.clone();
    let initial_state = Arc::new(Mutex::new(MprisState {
        playback_status: "Stopped".to_string(),
        loop_status: "None".to_string(),
        shuffle: false,
        volume: 1.0,
        title: "".to_string(),
        artist: "".to_string(),
        album: "".to_string(),
        duration_micros: 0,
        position_micros: 0,
        last_position_instant: None,
        cover_url: None,
    }));

    let state_for_server = initial_state.clone();

    std::thread::spawn(move || {
        let rt = match tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
        {
            Ok(rt) => rt,
            Err(e) => {
                eprintln!("Error al crear runtime de Tokio para MPRIS: {:?}", e);
                return;
            }
        };

        rt.block_on(async move {
            let root = MprisRoot {
                app_handle: app_handle_clone.clone(),
            };
            let player = MprisPlayer {
                app_handle: app_handle_clone.clone(),
                state: state_for_server.clone(),
            };

            let connection = match zbus::connection::Builder::session() {
                Ok(b) => match b
                    .name("org.mpris.MediaPlayer2.soundgaze")
                    .and_then(|b| b.serve_at("/org/mpris/MediaPlayer2", root))
                    .and_then(|b| b.serve_at("/org/mpris/MediaPlayer2", player))
                {
                    Ok(b) => match b.build().await {
                        Ok(conn) => conn,
                        Err(e) => {
                            eprintln!("Error al conectar servidor MPRIS en D-Bus: {:?}", e);
                            return;
                        }
                    },
                    Err(e) => {
                        eprintln!("Error al configurar interfaz MPRIS en D-Bus: {:?}", e);
                        return;
                    }
                },
                Err(e) => {
                    eprintln!("Error al obtener bus de sesión D-Bus: {:?}", e);
                    return;
                }
            };

            let manager = MprisManager {
                connection,
                state: state_for_server,
            };

            app_handle_clone.manage(manager);

            std::future::pending::<()>().await;
        });
    });
}

pub fn update_mpris_state(
    app_handle: &AppHandle,
    new_state: &PlayerStatePayload,
    cover_uri: Option<&str>,
) {
    if let Some(manager) = app_handle.try_state::<MprisManager>() {
        let playback_status = match new_state.state.as_str() {
            "Play" => "Playing".to_string(),
            "Pause" => "Paused".to_string(),
            _ => "Stopped".to_string(),
        };

        let duration_micros = (new_state.total_secs as i64) * 1_000_000;
        let position_micros = (new_state.elapsed_secs as i64) * 1_000_000;

        let (title, artist, album) = if let Some(track) = &new_state.current_track {
            (track.title.clone(), track.artist.clone(), track.album.clone())
        } else {
            ("".to_string(), "".to_string(), "".to_string())
        };

        let cover_url = cover_uri.map(|c| {
            if c.starts_with("file://") {
                c.to_string()
            } else {
                format!("file://{}", c)
            }
        });

        {
            let mut st = manager.state.lock().unwrap();
            st.playback_status = playback_status;
            st.duration_micros = duration_micros;
            st.position_micros = position_micros;
            st.last_position_instant = if st.playback_status == "Playing" {
                Some(Instant::now())
            } else {
                None
            };
            st.title = title;
            st.artist = artist;
            st.album = album;
            st.cover_url = cover_url;

            // Sincronizar volumen, random y repeat si MPD responde
            let state_cfg = app_handle.state::<MpdConfig>();
            let address = state_cfg.address.lock().unwrap().clone();
            let password = state_cfg.password.lock().unwrap().clone();
            if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                if let Ok(status) = conn.status() {
                    if status.volume >= 0 {
                        st.volume = (status.volume as f64) / 100.0;
                    }
                    st.shuffle = status.random;
                    st.loop_status = if status.repeat && status.single {
                        "Track".to_string()
                    } else if status.repeat {
                        "Playlist".to_string()
                    } else {
                        "None".to_string()
                    };
                }
            }
        }

        let conn = manager.connection.clone();
        tauri::async_runtime::spawn(async move {
            if let Ok(iface_ref) = conn
                .object_server()
                .interface::<_, MprisPlayer>("/org/mpris/MediaPlayer2")
                .await
            {
                let emitter = iface_ref.signal_emitter();
                let iface = iface_ref.get().await;
                let _ = iface.playback_status_changed(emitter).await;
                let _ = iface.metadata_changed(emitter).await;
                let _ = iface.volume_changed(emitter).await;
                let _ = iface.loop_status_changed(emitter).await;
                let _ = iface.shuffle_changed(emitter).await;
            }
        });
    }
}
