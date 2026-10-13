use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;

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

impl From<mpd::Song> for TrackData {
    fn from(song: mpd::Song) -> Self {
        let path = song.file;
        let title = song.title.unwrap_or_else(|| {
            Path::new(&path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(&path)
                .to_string()
        });

        let artist = song
            .tags
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Artist") || k.eq_ignore_ascii_case("AlbumArtist"))
            .map(|(_, v)| v.clone())
            .unwrap_or_else(|| "Desconocido".to_string());

        let album = song
            .tags
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Album"))
            .map(|(_, v)| v.clone())
            .unwrap_or_else(|| "Desconocido".to_string());

        let genre = song
            .tags
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Genre"))
            .map(|(_, v)| v.clone());

        let date = song
            .tags
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Date") || k.eq_ignore_ascii_case("Year"))
            .map(|(_, v)| v.clone());

        let track_number = song
            .tags
            .iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("Track"))
            .map(|(_, v)| v.clone());

        let time = match song.duration {
            Some(d) => format!("{}:{:02}", d.as_secs() / 60, d.as_secs() % 60),
            None => "--:--".to_string(),
        };

        TrackData {
            path,
            title,
            artist,
            album,
            time,
            genre,
            date,
            track_number,
        }
    }
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

