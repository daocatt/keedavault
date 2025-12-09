# Tauri Drag-and-Drop Solution

## Problem
HTML5 Drag and Drop API (and libraries built on top of it like Pragmatic DnD) don't work reliably in Tauri's WebView on macOS because:
1. Tauri intercepts drag events for file drop handling
2. Even with `disable_drag_drop_handler()`, the WebView doesn't properly propagate `dragenter`, `dragover`, `dragleave`, `drop` events
3. The `accept_first_mouse(true)` setting helps with window focus but doesn't fix the DnD event propagation

## Evidence
- GitHub Issue: https://github.com/tauri-apps/tauri/issues/11605
- We see `dragstart` and `dragend` events firing
- We see Pragmatic DnD's `MONITOR: Drag started` and `MONITOR: Drop`
- We DON'T see drop target events (`canDrop`, `onDragEnter`, `onDragOver`)
- Drop targets are properly registered (we see setup logs)

## Solution
Use mouse events (`onMouseDown`, `onMouseMove`, `onMouseUp`) to simulate drag-and-drop. This approach:
- ✅ Works reliably in Tauri
- ✅ Doesn't depend on HTML5 DnD API
- ✅ Provides full control over drag behavior
- ✅ Can still show custom drag previews
- ✅ Works across all platforms

## Implementation
See the mouse-based drag implementation that was working earlier in the conversation.
