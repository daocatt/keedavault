# Documentation Organization Plan

## 📚 Current Documentation Analysis

### ✅ Keep & Move to `/docs` (Active/Useful Documentation)

#### Touch ID Related (Keep the most comprehensive one)
- **TOUCHID_PATH_ENCODING_FIX.md** ✅ KEEP - Most recent and comprehensive fix
  - Explains the Base64 encoding solution
  - Includes testing steps and debugging info
  
- **TOUCHID_FIX_PROGRESS.md** ✅ KEEP - Progress report with current status
  - Documents the complete fix journey
  - Useful for understanding the implementation

#### Dock & Window Behavior (Keep the final version)
- **FINAL_DOCK_BEHAVIOR.md** ✅ KEEP - Final solution for dock behavior
  - Most up-to-date implementation
  
- **WINDOW_CLOSE_BEHAVIOR.md** ✅ KEEP - Window close behavior documentation
  - Important for understanding window lifecycle

#### Drag & Drop (Keep the most recent implementation)
- **IMPROVED_DRAG_PREVIEW.md** ✅ KEEP - Latest drag preview improvements
  - Most recent implementation
  
- **TAURI_DND_COMPATIBILITY_GUIDE.md** ✅ KEEP - Compatibility guide
  - Useful reference for Tauri DnD issues

#### Project Documentation
- **README.md** ✅ KEEP IN ROOT - Project readme
  - Should stay in root directory

### ⚠️ Archive (Outdated but might have historical value)

Move to `/docs/archive/`:

#### Touch ID (Outdated)
- TOUCHID_DEBUG_GUIDE.md - Superseded by TOUCHID_PATH_ENCODING_FIX.md
- TOUCHID_FIX.md - Old fix attempt
- TOUCHID_KEYRING_ISSUE.md - Documents the keyring issue (historical)
- TOUCHID_NATIVE_SOLUTION.md - Partial solution (historical)

#### Dock Behavior (Outdated)
- DOCK_BEHAVIOR_SOLUTION.md - Superseded by FINAL_DOCK_BEHAVIOR.md
- MACOS_DOCK_BEHAVIOR.md - Early documentation
- UPDATED_DOCK_BEHAVIOR.md - Intermediate version
- LAUNCHER_HIDE_FIX.md - Specific fix (historical)
- MANUAL_FIX_REOPEN.md - Manual fix (historical)
- FINAL_FIX_SECOND_CLICK.md - Specific fix (historical)
- FIX_SECOND_CLICK_DRAG.md - Specific fix (historical)

#### Drag & Drop (Outdated)
- DRAG_BEHAVIOR_FINAL_FIX.md - Superseded by IMPROVED_DRAG_PREVIEW.md
- DRAG_BEHAVIOR_FIXES.md - Early fixes
- DRAG_DROP_IMPLEMENTATION.md - Early implementation
- LONG_PRESS_DRAG.md - Specific feature (historical)
- PRAGMATIC_DND_INTEGRATION.md - Integration attempt (historical)
- TAURI_DND_学习总结.md - Learning notes (Chinese)
- TAURI_DND_速查卡.md - Quick reference (Chinese)
- TAURI_DND_ISSUE.md - Issue documentation (historical)

#### Other
- MENU_ITEMS_FIX.md - Specific fix (historical)
- SESSION_SUMMARY.md - Session notes (can be deleted)

### 🗑️ Delete (Redundant or No Longer Needed)

- SESSION_SUMMARY.md - Temporary session notes

## 📁 Proposed Structure

```
/
├── README.md (keep in root)
├── docs/
│   ├── touchid/
│   │   ├── TOUCHID_PATH_ENCODING_FIX.md
│   │   └── TOUCHID_FIX_PROGRESS.md
│   ├── window-behavior/
│   │   ├── FINAL_DOCK_BEHAVIOR.md
│   │   └── WINDOW_CLOSE_BEHAVIOR.md
│   ├── drag-drop/
│   │   ├── IMPROVED_DRAG_PREVIEW.md
│   │   └── TAURI_DND_COMPATIBILITY_GUIDE.md
│   └── archive/
│       ├── touchid/
│       ├── dock-behavior/
│       └── drag-drop/
```

## 🎯 Recommended Actions

1. **Keep 6 active docs** in organized folders
2. **Archive 20 outdated docs** for historical reference
3. **Delete 1 temporary doc** (SESSION_SUMMARY.md)
