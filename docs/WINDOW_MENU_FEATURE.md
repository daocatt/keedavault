# Window Menu Enhancement - Recent Windows Feature

## Overview

Added a dynamic "Recent Windows" feature to the macOS Window menu, similar to native macOS apps. This allows users to see all open vault windows and quickly switch between them.

## Features Implemented

### 1. **Bring All to Front** Menu Item
- Standard macOS feature
- Brings all app windows to the front
- Located in Window menu

### 2. **Dynamic Vault Windows List**
- Shows all currently open vault windows in the Window menu
- Displays window titles (vault names)
- Click to focus and bring specific window to front
- Automatically updates when windows open/close

## Implementation Details

### Backend (Rust)

**File**: `src-tauri/src/main.rs`

1. **`update_window_menu()` command**:
   - Scans all open webview windows
   - Finds vault windows (labels starting with "vault-")
   - Rebuilds Window menu with current vault list
   - Adds menu items for each vault window

2. **`rebuild_menu_with_window_menu()` helper**:
   - Rebuilds entire menu bar with updated Window menu
   - Maintains all other menus (App, File, Edit, Database)

3. **Menu event handler**:
   - Handles "bring_all_to_front" action
   - Handles "focus_window_*" actions for individual vaults
   - Brings selected window to front, unminimizes if needed

### Frontend (TypeScript/React)

**File**: `services/windowMenuService.ts`
- Simple service to call `update_window_menu` command from frontend

**File**: `components/VaultWorkspace.tsx`
- Calls `updateWindowMenu()` when vault window opens
- Calls `updateWindowMenu()` when vault window closes
- Ensures menu stays in sync with open windows

## Menu Structure

```
Window
├── Minimize
├── Maximize
├── ───────────
├── Center Window
├── Zoom
├── ───────────
├── Keep on Top
├── ───────────
├── Bring All to Front
├── ───────────          (only shown if vault windows exist)
├── Vault Name 1         (dynamically added)
├── Vault Name 2         (dynamically added)
├── ...
├── ───────────
└── Close (⌘W)
```

## Usage

1. **View Open Vaults**: Click Window menu to see all open vault windows
2. **Switch to Vault**: Click on a vault name to bring that window to front
3. **Bring All to Front**: Click "Bring All to Front" to show all app windows

## Technical Notes

- Window menu updates automatically when vaults open/close
- Uses Tauri's menu API for dynamic menu updates
- Window labels are used as unique identifiers
- Menu items are prefixed with "focus_window_" for routing

## Future Enhancements

Possible improvements:
- Add keyboard shortcuts (⌘1, ⌘2, etc.) for first 9 windows
- Show window state indicators (minimized, focused)
- Group windows by type (vaults, settings, etc.)
- Add "Close All Windows" option
