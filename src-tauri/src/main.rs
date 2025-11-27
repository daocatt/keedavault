// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};

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

#[tauri::command]
fn set_database_menu_state(app_handle: tauri::AppHandle, unlocked: bool) {
    #[cfg(target_os = "macos")]
    {
        if let Some(menu) = app_handle.menu() {
            let items = menu.items().unwrap_or_default();
            for item in items {
                if let tauri::menu::MenuItemKind::Submenu(submenu) = item {
                    let text = submenu.text().unwrap_or_default();
                    if text == "Database" {
                        let db_items = ["create_entry", "lock_database", "change_credentials", "database_setting"];
                        for id in db_items {
                            if let Some(db_item) = submenu.get(id) {
                                if let tauri::menu::MenuItemKind::MenuItem(i) = db_item {
                                    let _ = i.set_enabled(unlocked);
                                }
                            }
                        }
                        return;
                    }
                }
            }
        }
    }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .invoke_handler(tauri::generate_handler![reveal_in_finder, set_database_menu_state])
    .setup(|app| {
      #[cfg(target_os = "macos")]
      {
        use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};
        
        let handle = app.handle();
        
        // App Menu
        let app_menu = SubmenuBuilder::new(handle, "App")
            .item(&MenuItemBuilder::with_id("about", "About KeedaVault").build(handle)?)
            .separator()
            .quit()
            .build()?;

        // File Menu
        let file_menu = SubmenuBuilder::new(handle, "File")
            .item(&MenuItemBuilder::with_id("open_vault", "Open Vault...").accelerator("CmdOrCtrl+O").build(handle)?)
            .item(&MenuItemBuilder::with_id("create_vault", "New Vault...").accelerator("CmdOrCtrl+N").build(handle)?)
            .separator()
            .item(&MenuItemBuilder::with_id("import_database", "Import...").build(handle)?)
            .item(&MenuItemBuilder::with_id("export_database", "Export Database...").build(handle)?)
            .item(&MenuItemBuilder::with_id("export_selected", "Export Selected...").build(handle)?)
            .separator()
            .close_window()
            .build()?;

        // Edit Menu (Standard)
        let edit_menu = SubmenuBuilder::new(handle, "Edit")
            .undo()
            .redo()
            .separator()
            .cut()
            .copy()
            .paste()
            .select_all()
            .build()?;

        // Window Menu
        let window_menu = SubmenuBuilder::new(handle, "Window")
            .minimize()
            .maximize()
            .separator()
            .item(&MenuItemBuilder::with_id("close", "Close").accelerator("CmdOrCtrl+W").build(handle)?)
            .build()?;

        // Database Menu
        let database_menu = SubmenuBuilder::new(handle, "Database")
            .item(&MenuItemBuilder::with_id("password_generator", "Password Generator").build(handle)?)
            .item(&MenuItemBuilder::with_id("create_entry", "Create Entry").accelerator("CmdOrCtrl+I").enabled(false).build(handle)?)
            .separator()
            .item(&MenuItemBuilder::with_id("lock_database", "Lock Database").accelerator("CmdOrCtrl+L").enabled(false).build(handle)?)
            .item(&MenuItemBuilder::with_id("change_credentials", "Change Credentials").enabled(false).build(handle)?)
            .item(&MenuItemBuilder::with_id("database_setting", "Database Settings").enabled(false).build(handle)?)
            .build()?;

        let menu = MenuBuilder::new(handle)
            .items(&[&app_menu, &file_menu, &edit_menu, &database_menu, &window_menu])
            .build()?;

        app.set_menu(menu)?;
      }

      app.on_menu_event(move |app_handle, event| {
         match event.id().as_ref() {
            "open_vault" => {
              // Open the Launcher window
              if let Some(window) = app_handle.get_webview_window("launcher") {
                 let _ = window.set_focus();
                 let _ = window.emit("open-file-picker", ());
              } else {
                  let _window = tauri::WebviewWindowBuilder::new(
                    app_handle,
                    "launcher",
                    tauri::WebviewUrl::App("/?action=browse".into())
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
                 let _ = window.emit("create-new-vault", ());
              } else {
                  let _window = tauri::WebviewWindowBuilder::new(
                    app_handle,
                    "launcher",
                    tauri::WebviewUrl::App("/?action=create".into())
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
            "import_database" => {
                let _ = app_handle.emit("import-database", ());
            }
            "export_database" => {
                let _ = app_handle.emit("export-database", ());
            }
            "export_selected" => {
                let _ = app_handle.emit("export-selected", ());
            }
            "password_generator" => {
                if let Some(window) = app_handle.get_webview_window("password-generator") {
                    let _ = window.set_focus();
                } else {
                    let _window = tauri::WebviewWindowBuilder::new(
                        app_handle,
                        "password-generator",
                        tauri::WebviewUrl::App("/?mode=generator".into())
                    )
                    .title("Password Generator")
                    .inner_size(400.0, 500.0)
                    .resizable(false)
                    .hidden_title(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .center()
                    .build()
                    .unwrap();
                }
            }
            "create_entry" => {
                let _ = app_handle.emit("create-entry", ());
            }
            "lock_database" => {
                let _ = app_handle.emit("lock-database", ());
            }
            "change_credentials" => {
                let _ = app_handle.emit("change-credentials", ());
            }
            "database_setting" => {
                let _ = app_handle.emit("database-setting", ());
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
