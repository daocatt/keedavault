// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod biometric;
mod secure_storage;

use tauri::window::Color;
use tauri::{Emitter, Manager};

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
                .arg(
                    std::path::Path::new(&path)
                        .parent()
                        .unwrap_or(std::path::Path::new(&path)),
                )
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
                        let db_items = [
                            "create_entry",
                            "lock_database",
                            "change_credentials",
                            "database_setting",
                        ];
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

// Helper function to get background color based on system theme
fn get_background_color() -> Color {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSApplication;
        use cocoa::base::nil;
        use objc::{msg_send, sel, sel_impl};

        unsafe {
            let app = NSApplication::sharedApplication(nil);
            let appearance: *mut objc::runtime::Object = msg_send![app, effectiveAppearance];
            let name: *mut objc::runtime::Object = msg_send![appearance, name];
            let name_str: *const i8 = msg_send![name, UTF8String];
            let name_string = std::ffi::CStr::from_ptr(name_str).to_string_lossy();

            // Check if dark mode
            if name_string.contains("Dark") {
                Color(28, 28, 30, 255) // Dark background
            } else {
                Color(255, 255, 255, 255) // Light background
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Default to light on other platforms
        Color(255, 255, 255, 255)
    }
}

fn create_main_window(app_handle: &tauri::AppHandle, url: &str) -> tauri::WebviewWindow {
    tauri::WebviewWindowBuilder::new(app_handle, "main", tauri::WebviewUrl::App(url.into()))
        .title("KeedaVault")
        .inner_size(700.0, 580.0)
        .min_inner_size(700.0, 450.0)
        .resizable(false)
        .center()
        .visible(false) // Start hidden, React will show after theme applied
        .hidden_title(true)
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .background_color(get_background_color())
        .accept_first_mouse(true)
        .build()
        .unwrap()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            reveal_in_finder,
            set_database_menu_state,
            biometric::check_biometric_available,
            biometric::authenticate_biometric,
            secure_storage::secure_store_password,
            secure_storage::secure_get_password,
            secure_storage::secure_delete_password,
            secure_storage::secure_has_password
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Regular);

            // Create the main window programmatically to ensure dynamic background color
            let _window = create_main_window(app.handle(), "index.html");

            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

                let handle = app.handle();

                // App Menu
                let app_menu = SubmenuBuilder::new(handle, "App")
                    .item(&MenuItemBuilder::with_id("about", "About").build(handle)?)
                    .item(
                        &MenuItemBuilder::with_id("settings", "Settings...")
                            .accelerator("CmdOrCtrl+,")
                            .build(handle)?,
                    )
                    .separator()
                    .quit()
                    .build()?;

                // File Menu
                let file_menu = SubmenuBuilder::new(handle, "File")
                    .item(
                        &MenuItemBuilder::with_id("open_vault", "Open Vault...")
                            .accelerator("CmdOrCtrl+O")
                            .build(handle)?,
                    )
                    .item(
                        &MenuItemBuilder::with_id("create_vault", "New Vault...")
                            .accelerator("CmdOrCtrl+N")
                            .build(handle)?,
                    )
                    .separator()
                    .item(
                        &MenuItemBuilder::with_id("open_launcher", "Launcher")
                            .accelerator("CmdOrCtrl+Shift+L")
                            .build(handle)?,
                    )
                    .separator()
                    .item(&MenuItemBuilder::with_id("import_database", "Import...").build(handle)?)
                    .item(
                        &MenuItemBuilder::with_id("export_database", "Export Database...")
                            .build(handle)?,
                    )
                    .item(
                        &MenuItemBuilder::with_id("export_selected", "Export Selected...")
                            .build(handle)?,
                    )
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
                    .item(
                        &MenuItemBuilder::with_id("center_window", "Center Window")
                            .build(handle)?,
                    )
                    .item(&MenuItemBuilder::with_id("zoom_window", "Zoom").build(handle)?)
                    .separator()
                    .item(&MenuItemBuilder::with_id("always_on_top", "Keep on Top").build(handle)?)
                    .separator()
                    .item(
                        &MenuItemBuilder::with_id("close", "Close")
                            .accelerator("CmdOrCtrl+W")
                            .build(handle)?,
                    )
                    .build()?;

                // Database Menu
                let database_menu = SubmenuBuilder::new(handle, "Database")
                    .item(
                        &MenuItemBuilder::with_id("password_generator", "Password Generator")
                            .build(handle)?,
                    )
                    .item(
                        &MenuItemBuilder::with_id("create_entry", "Create Entry")
                            .accelerator("CmdOrCtrl+I")
                            .enabled(false)
                            .build(handle)?,
                    )
                    .separator()
                    .item(
                        &MenuItemBuilder::with_id("lock_database", "Lock Database")
                            .accelerator("CmdOrCtrl+L")
                            .enabled(false)
                            .build(handle)?,
                    )
                    .item(
                        &MenuItemBuilder::with_id("change_credentials", "Change Credentials")
                            .enabled(false)
                            .build(handle)?,
                    )
                    .item(
                        &MenuItemBuilder::with_id("database_setting", "Database Settings")
                            .enabled(false)
                            .build(handle)?,
                    )
                    .build()?;

                let menu = MenuBuilder::new(handle)
                    .items(&[
                        &app_menu,
                        &file_menu,
                        &edit_menu,
                        &database_menu,
                        &window_menu,
                    ])
                    .build()?;

                app.set_menu(menu)?;
            }

            app.on_menu_event(move |app_handle, event| {
                match event.id().as_ref() {
                    "open_vault" => {
                        // Open the Launcher window
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("open-file-picker", ());
                        } else {
                            let window = create_main_window(app_handle, "/?action=browse");
                            let _ = window.show();
                        }
                    }
                    "create_vault" => {
                        // Open the Launcher window
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.emit("create-new-vault", ());
                        } else {
                            let window = create_main_window(app_handle, "/?action=create");
                            let _ = window.show();
                        }
                    }
                    "open_launcher" => {
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let window = create_main_window(app_handle, "index.html");
                            let _ = window.show();
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
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let window = tauri::WebviewWindowBuilder::new(
                                app_handle,
                                "password-generator",
                                tauri::WebviewUrl::App("/?mode=generator".into()),
                            )
                            .title("Password Generator")
                            .inner_size(400.0, 500.0)
                            .resizable(false)
                            .hidden_title(true)
                            .title_bar_style(tauri::TitleBarStyle::Overlay)
                            .center()
                            .visible(false)
                            .background_color(get_background_color())
                            .disable_drag_drop_handler()
                            .build()
                            .unwrap();
                            let _ = window.show();
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
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let window = tauri::WebviewWindowBuilder::new(
                                app_handle,
                                "about",
                                tauri::WebviewUrl::App("/?mode=about".into()),
                            )
                            .title("About KeedaVault")
                            .inner_size(360.0, 480.0)
                            .resizable(false)
                            .hidden_title(true)
                            .title_bar_style(tauri::TitleBarStyle::Overlay)
                            .center()
                            .visible(false)
                            .background_color(get_background_color())
                            .disable_drag_drop_handler()
                            .build()
                            .unwrap();
                            let _ = window.show();
                        }
                    }
                    "settings" => {
                        // Open Settings window
                        if let Some(window) = app_handle.get_webview_window("settings") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let window = tauri::WebviewWindowBuilder::new(
                                app_handle,
                                "settings",
                                tauri::WebviewUrl::App("/?mode=settings".into()),
                            )
                            .title("Settings")
                            .inner_size(750.0, 600.0)
                            .resizable(false)
                            .hidden_title(true)
                            .title_bar_style(tauri::TitleBarStyle::Overlay)
                            .center()
                            .visible(false)
                            .background_color(get_background_color())
                            .disable_drag_drop_handler()
                            .build()
                            .unwrap();
                            let _ = window.show();
                        }
                    }
                    "center_window" => {
                        // Center all visible windows
                        for (_, window) in app_handle.webview_windows() {
                            let _ = window.center();
                        }
                    }
                    "zoom_window" => {
                        // Toggle maximize for all visible windows
                        for (_, window) in app_handle.webview_windows() {
                            let is_maximized = window.is_maximized().unwrap_or(false);
                            if is_maximized {
                                let _ = window.unmaximize();
                            } else {
                                let _ = window.maximize();
                            }
                        }
                    }
                    "always_on_top" => {
                        // Toggle always on top for all visible windows
                        for (_, window) in app_handle.webview_windows() {
                            let is_on_top = window.is_always_on_top().unwrap_or(false);
                            let _ = window.set_always_on_top(!is_on_top);
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::WindowEvent { label, event, .. } => {
                    if let tauri::WindowEvent::CloseRequested { api: _, .. } = event {
                        // Let all windows close normally (destroy)
                        // This allows the app to quit when all windows are closed
                        // or stay in dock if there are other windows still open
                    }
                }
                tauri::RunEvent::Reopen { .. } => {
                    // Priority order when clicking dock icon:
                    // 1. If any vault window is VISIBLE, show all vault windows on top of launcher
                    // 2. If no vault windows are visible (closed/hidden), show only launcher

                    let mut visible_vault_windows = Vec::new();

                    // Collect all VISIBLE vault windows
                    for (label, window) in app_handle.webview_windows() {
                        if label.starts_with("vault-") {
                            // Check if window is visible
                            if let Ok(is_visible) = window.is_visible() {
                                if is_visible {
                                    visible_vault_windows.push(window);
                                }
                            }
                        }
                    }

                    if !visible_vault_windows.is_empty() {
                        // Has visible vault windows - show them on top of launcher

                        // First, show launcher if it exists (it will be in background)
                        if let Some(launcher) = app_handle.get_webview_window("main") {
                            let _ = launcher.show();
                        }

                        // Then show and focus all vault windows (they will be on top)
                        for vault_window in visible_vault_windows {
                            let _ = vault_window.show();
                            let _ = vault_window.set_focus();
                        }
                    } else {
                        // No visible vault windows - show only launcher
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let window = create_main_window(app_handle, "index.html");
                            let _ = window.show();
                        }
                    }
                }
                _ => {}
            }
        });
}
