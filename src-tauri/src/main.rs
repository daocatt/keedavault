// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::Manager;

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    #[cfg(target_os = "linux")]
    {
        // Try to use dbus to show the file
        let result = std::process::Command::new("dbus-send")
            .arg("--session")
            .arg("--dest=org.freedesktop.FileManager1")
            .arg("--type=method_call")
            .arg("/org/freedesktop/FileManager1")
            .arg("org.freedesktop.FileManager1.ShowItems")
            .arg(format!("array:string:file://{}", path))
            .arg("string:")
            .spawn();
        
        // Fallback to xdg-open if dbus fails
        if result.is_err() {
            std::process::Command::new("xdg-open")
                .arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new(&path)))
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .invoke_handler(tauri::generate_handler![reveal_in_finder])
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
