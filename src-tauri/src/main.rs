// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      // ... (omitted lines) ...
      app.on_menu_event(move |app_handle, event| {
         match event.id().as_ref() {
            // ... (omitted lines) ...
            "open_vault" => {
              // Open the Launcher window
              if let Some(window) = app_handle.get_webview_window("launcher") {
                 let _ = window.set_focus();
              } else {
                  let _window = tauri::WebviewWindowBuilder::new(
                    app_handle,
                    "launcher",
                    tauri::WebviewUrl::App("/".into())
                  )
                  .title("KeedaVault")
                  .hidden_title(true)
                  .title_bar_style(tauri::TitleBarStyle::Overlay)
                  .inner_size(700.0, 580.0)
                  .resizable(false)
                  .center()
                  .build()
                  .unwrap();
              }
            }
            "create_vault" => {
              // Open the Launcher window
              if let Some(window) = app_handle.get_webview_window("launcher") {
                 let _ = window.set_focus();
              } else {
                  let _window = tauri::WebviewWindowBuilder::new(
                    app_handle,
                    "launcher",
                    tauri::WebviewUrl::App("/".into())
                  )
                  .title("KeedaVault")
                  .hidden_title(true)
                  .title_bar_style(tauri::TitleBarStyle::Overlay)
                  .inner_size(700.0, 580.0)
                  .resizable(false)
                  .center()
                  .build()
                  .unwrap();
              }
            }
            "about" => {
                // Open About window
                if let Some(window) = app_handle.get_webview_window("about") {
                    let _ = window.set_focus();
                } else {
                    let _window = tauri::WebviewWindowBuilder::new(
                        app_handle,
                        "about",
                        tauri::WebviewUrl::App("/?mode=about".into())
                    )
                    .title("About KeedaVault")
                    .inner_size(360.0, 480.0)
                    .resizable(false)
                    .hidden_title(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .center()
                    .build()
                    .unwrap();
                }
            }
            "close" => {
              // Close the currently focused window
              // if let Some(window) = app_handle.get_focused_window() {
              //   let _ = window.close();
              // }
            }
            "quit" => {
                app_handle.exit(0);
            }
            _ => {}
         }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
