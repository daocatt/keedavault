# Manual Fix Required

Due to file editing conflicts, please manually apply the following changes to `src-tauri/src/main.rs`:

## Change 1: Update Reopen Event Handler (lines 465-505)

Replace the entire `tauri::RunEvent::Reopen` block with:

```rust
                tauri::RunEvent::Reopen { .. } => {
                    // Priority order when clicking dock icon:
                    // 1. If vault windows exist, show them on top of launcher
                    // 2. If no vault windows exist, show only launcher
                    //
                    // Note: Vault windows are destroyed when closed (not just hidden),
                    // so existence = user has vault open
                    
                    let mut vault_windows = Vec::new();
                    
                    // Collect all vault windows (they exist only if user has vault open)
                    for (label, window) in app_handle.webview_windows() {
                        if label.starts_with("vault-") {
                            vault_windows.push(window);
                        }
                    }
                    
                    if !vault_windows.is_empty() {
                        // Has vault windows - show them on top of launcher
                        
                        // First, show launcher if it exists (it will be in background)
                        if let Some(launcher) = app_handle.get_webview_window("main") {
                            let _ = launcher.show();
                        }
                        
                        // Then show and focus all vault windows (they will be on top)
                        for vault_window in vault_windows {
                            let _ = vault_window.show();
                            let _ = vault_window.set_focus();
                        }
                    } else {
                        // No vault windows - show only launcher
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            let window = create_main_window(app_handle, "index.html");
                            let _ = window.show();
                        }
                    }
                }
```

## Summary of Changes

1. Changed `visible_vault_windows` to `vault_windows`
2. Removed `is_visible()` check
3. Updated comments to reflect new logic
4. Simplified logic: window existence = vault is open

## Why This Works

- Vault windows are now destroyed when closed (see CloseRequested handler)
- Launcher windows are hidden when closed
- So checking window existence is sufficient to know if vault is open
