// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{CustomMenuItem, Menu, MenuItem, Submenu, Manager};
use chrono::Utc;

fn main() {
  // App Menu (macOS only)
  let app_menu = Submenu::new("KeedaVault", Menu::new()
    .add_item(CustomMenuItem::new("about", "About"))
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Services)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Hide)
    .add_native_item(MenuItem::HideOthers)
    .add_native_item(MenuItem::ShowAll)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Quit));

  // File Menu
  let open_vault = CustomMenuItem::new("open_vault".to_string(), "Open Vault...").accelerator("CmdOrCtrl+O");
  let create_vault = CustomMenuItem::new("create_vault".to_string(), "Create Vault...").accelerator("CmdOrCtrl+N");
  let close = CustomMenuItem::new("close".to_string(), "Close Window").accelerator("CmdOrCtrl+W");

  let file_menu = Submenu::new("File", Menu::new()
    .add_item(open_vault)
    .add_item(create_vault)
    .add_native_item(MenuItem::Separator)
    .add_item(close));

  // Edit Menu
  let edit_menu = Submenu::new("Edit", Menu::new()
    .add_native_item(MenuItem::Undo)
    .add_native_item(MenuItem::Redo)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Cut)
    .add_native_item(MenuItem::Copy)
    .add_native_item(MenuItem::Paste)
    .add_native_item(MenuItem::SelectAll));

  // Window Menu
  let window_menu = Submenu::new("Window", Menu::new()
    .add_native_item(MenuItem::Minimize)
    .add_native_item(MenuItem::Zoom));

  // Build the menu
  let menu = Menu::new()
    .add_submenu(app_menu)
    .add_submenu(file_menu)
    .add_submenu(edit_menu)
    .add_submenu(window_menu);

  tauri::Builder::default()
    .menu(menu)
    .on_menu_event(|event| {
      match event.menu_item_id() {
        "about" => {
            // Emit event to front-end to show About modal
            event.window().emit("show-about", ()).unwrap();
        }
        "open_vault" => {
          // Open a new launcher window centered
          let _window = tauri::WindowBuilder::new(
            &event.window().app_handle(),
            format!("launcher-{}", Utc::now().timestamp_millis()),
            tauri::WindowUrl::App("/".into())
          )
          .title("KeedaVault")
          .inner_size(900.0, 700.0)
          .center()
          .build();
        }
        "create_vault" => {
          // Open a new launcher window in create mode centered
          let _window = tauri::WindowBuilder::new(
            &event.window().app_handle(),
            format!("launcher-create-{}", Utc::now().timestamp_millis()),
            tauri::WindowUrl::App("/?mode=vault&action=create".into())
          )
          .title("Create Vault - KeedaVault")
          .inner_size(900.0, 700.0)
          .center()
          .build();
        }
        "close" => {
          event.window().close().unwrap();
        }
        _ => {}
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
