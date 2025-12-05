---
description: Keep app running when all windows are closed
---

# Keep App Open When All Windows Are Closed

This workflow explains how the app is configured to stay running even when all windows are closed (macOS behavior).

## Implementation

The app has been configured to behave like a typical macOS application:

1. **Window Close Behavior**: When you close a window (Cmd+W or clicking the red close button), the window is hidden instead of being destroyed.

2. **App Stays Running**: The app continues to run in the dock even when all windows are closed.

3. **Reopen Windows**: Click the app icon in the dock to show the main window again.

## Technical Details

The implementation is in `src-tauri/src/main.rs`:

### Window Close Event Handler
```rust
tauri::RunEvent::WindowEvent { label, event, .. } => {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        #[cfg(target_os = "macos")]
        {
            if let Some(window) = app_handle.get_webview_window(&label) {
                let _ = window.hide();
                api.prevent_close();
            }
        }
    }
}
```

This intercepts window close requests and:
- Hides the window instead of closing it
- Prevents the default close behavior
- Only applies on macOS (using `#[cfg(target_os = "macos")]`)

### Reopen Event Handler
```rust
tauri::RunEvent::Reopen { .. } => {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let window = create_main_window(app_handle, "index.html");
        let _ = window.show();
    }
}
```

This handles clicking the dock icon:
- Shows the main window if it exists
- Creates a new main window if it doesn't exist
- Brings the window to focus

## Testing

To test this behavior:

1. Run the app: `npm run tauri dev`
2. Close all windows (Cmd+W or click the red close button)
3. Notice the app is still running in the dock
4. Click the app icon in the dock
5. The main window should reappear

## Quitting the App

To actually quit the app:
- Use Cmd+Q
- Right-click the dock icon and select "Quit"
- Use the "Quit" menu item from the app menu
