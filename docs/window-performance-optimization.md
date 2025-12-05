# Window Opening Performance Optimization

## Issues Identified

1. **Flash on Window Open**: Main window was set to `visible: true` in Rust, causing it to appear before React could apply the theme
2. **Slow Window Opening**: 
   - Double `requestAnimationFrame` (~32ms delay)
   - Timeout fallbacks (150-200ms) running for all windows
   - Conflicting show logic between components and App.tsx

## Optimizations Applied

### 1. Main Window Flash Fix
**File**: `src-tauri/src/main.rs`
- Changed main window from `visible(true)` to `visible(false)`
- Window now starts hidden and React shows it after theme is applied
- Background color is still set dynamically to match system theme

### 2. Faster Window Showing
**Files**: `App.tsx`, `SettingsWindow.tsx`, `AboutWindow.tsx`, `GeneratorWindow.tsx`

**Before**:
- Double RAF: `requestAnimationFrame(() => requestAnimationFrame(...))`
- Delay: ~32ms minimum
- Plus timeout fallback: 150-200ms

**After**:
- Single RAF: `requestAnimationFrame(async () => ...)`
- Delay: ~16ms (one frame)
- No conflicting timeout for self-showing windows

### 3. Removed Redundant Logic
**File**: `App.tsx`
- Removed timeout fallback for windows that handle their own showing (Settings, About, Generator)
- Kept minimal 50ms timeout only for launcher (initial window)
- Reduced from 200ms to 50ms for launcher

## Performance Improvements

| Window Type | Before | After | Improvement |
|-------------|--------|-------|-------------|
| Launcher | 200ms | 50ms | **75% faster** |
| Settings | 150ms (timeout) + 32ms (RAF) | 16ms (RAF only) | **91% faster** |
| About | 150ms (timeout) + 32ms (RAF) | 16ms (RAF only) | **91% faster** |
| Generator | 150ms (timeout) + 32ms (RAF) | 16ms (RAF only) | **91% faster** |

## Technical Details

### requestAnimationFrame (RAF)
- Executes callback before next repaint
- Typically ~16ms (60 FPS) or ~8ms (120 FPS)
- Ensures DOM is ready before showing window

### Why Single RAF is Better
- **Double RAF**: Waits for 2 frames to ensure content is painted
  - Frame 1: React renders
  - Frame 2: Browser paints
  - Frame 3: Show window
- **Single RAF**: Shows window as soon as React renders
  - Frame 1: React renders
  - Frame 2: Browser paints + Show window
  - Works because `index.html` applies theme synchronously

### Theme Application Flow
1. **Rust**: Window created with dynamic background color
2. **HTML**: Inline script applies theme class synchronously
3. **React**: ThemeManager loads and applies full theme
4. **Show**: Window becomes visible (no flash!)

## Testing Checklist

- [ ] Launcher window opens without flash (light mode)
- [ ] Launcher window opens without flash (dark mode)
- [ ] Settings window opens quickly
- [ ] About window opens quickly
- [ ] Password Generator opens quickly
- [ ] No white/black flash when switching themes
- [ ] All windows appear centered and focused

## Notes

- The 50ms delay for launcher is conservative and could potentially be reduced further
- Single RAF is safe because theme is applied synchronously in `index.html`
- Background color in Rust prevents any flash during window creation
