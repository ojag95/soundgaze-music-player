use crate::models::MpdConfig;
use crate::mpd_client::connect_to_mpd_raw;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, Manager};

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
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

    let show_window = |app_handle: &tauri::AppHandle| {
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
            let _ = window.request_user_attention(Some(tauri::UserAttentionType::Critical));
        }
    };

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app_handle, event| {
            let state = app_handle.state::<MpdConfig>();
            let address = state.address.lock().unwrap().clone();
            let password = state.password.lock().unwrap().clone();

            match event.id.as_ref() {
                "quit" => {
                    if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                        let _ = conn.stop();
                    }
                    app_handle.exit(0);
                }
                "next" => {
                    if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                        let _ = conn.next();
                    }
                }
                "toggle" => {
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
                "prev" => {
                    if let Ok(mut conn) = connect_to_mpd_raw(&address, &password) {
                        let _ = conn.prev();
                    }
                }
                "show" => {
                    show_window(app_handle);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

