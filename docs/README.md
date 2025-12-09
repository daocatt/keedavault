# Documentation

This directory contains all project documentation organized by topic.

## � Daily Logs

Daily work logs documenting progress, fixes, and decisions:
- **[2025-12-10](daily/2025-12-10.md)** - Touch ID path encoding fix & documentation organization

## �📚 Active Documentation

### Touch ID
- **[TOUCHID_PATH_ENCODING_FIX.md](touchid/TOUCHID_PATH_ENCODING_FIX.md)** - Complete guide to the Touch ID path encoding fix
  - Explains Base64 encoding solution
  - Testing steps and debugging information
  - Fixes the issue where Touch ID couldn't find saved passwords on second launch

- **[TOUCHID_FIX_PROGRESS.md](touchid/TOUCHID_FIX_PROGRESS.md)** - Progress report documenting the Touch ID implementation
  - Complete fix journey from problem to solution
  - Current implementation status
  - Testing checklist

### Window & Dock Behavior
- **[FINAL_DOCK_BEHAVIOR.md](window-behavior/FINAL_DOCK_BEHAVIOR.md)** - Final solution for macOS dock behavior
  - How the app behaves when clicking dock icon
  - Window management strategy
  
- **[WINDOW_CLOSE_BEHAVIOR.md](window-behavior/WINDOW_CLOSE_BEHAVIOR.md)** - Window lifecycle documentation
  - Window close behavior
  - Memory management

### Drag & Drop
- **[IMPROVED_DRAG_PREVIEW.md](drag-drop/IMPROVED_DRAG_PREVIEW.md)** - Latest drag preview implementation
  - Custom drag preview rendering
  - Performance optimizations
  
- **[TAURI_DND_COMPATIBILITY_GUIDE.md](drag-drop/TAURI_DND_COMPATIBILITY_GUIDE.md)** - Tauri DnD compatibility guide
  - Known issues with Tauri's drag & drop
  - Workarounds and solutions

### Other Topics
- **[FILE_SYSTEM_ADAPTER.md](FILE_SYSTEM_ADAPTER.md)** - File system abstraction layer
- **[IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md)** - Summary of all improvements
- **[theme-flash-fix.md](theme-flash-fix.md)** - Theme flash prevention
- **[window-opening-improvements.md](window-opening-improvements.md)** - Window opening optimizations
- **[window-performance-optimization.md](window-performance-optimization.md)** - Performance tips

## 📦 Archived Documentation

Historical documentation is kept in the `archive/` directory for reference:
- `archive/touchid/` - 4 outdated Touch ID documents
- `archive/dock-behavior/` - 8 outdated dock/window behavior documents  
- `archive/drag-drop/` - 8 outdated drag & drop documents

**Total archived:** 20 documents

These documents are kept for historical reference but have been superseded by newer implementations.

## 🗂️ Document Organization

Documents are organized by topic:
```
docs/
├── daily/               # Daily work logs
├── touchid/             # Touch ID authentication
├── window-behavior/     # Window & dock behavior
├── drag-drop/          # Drag & drop functionality
└── archive/            # Historical documents
    ├── touchid/
    ├── dock-behavior/
    └── drag-drop/
```

## 📝 Contributing

When adding new documentation:
1. Place it in the appropriate topic folder
2. Use descriptive filenames (e.g., `FEATURE_NAME_FIX.md`)
3. Include a summary at the top
4. Move outdated docs to `archive/` instead of deleting them
