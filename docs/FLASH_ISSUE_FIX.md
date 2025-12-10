# Flash Issue Fix - Window Theme Synchronization

## Problem Description

When opening recent databases or creating new vaults from the Launcher, users experienced a brief flash of the wrong background color:
- **In light mode**: Flash of black/dark background before showing light content
- **In dark mode**: Flash of white/light background before showing dark content

## Root Cause

The issue occurred due to a timing mismatch in the window showing sequence:

1. **Window Creation**: New windows were created with `visible: false` and a background color set by Rust's `get_background_color()` function
2. **Premature Show**: The `Launcher.tsx` component was calling `window.show()` after only 100ms, before React had fully rendered and applied the theme
3. **Theme Application**: The theme was being applied asynchronously by `ThemeManager`, which loads settings from the Tauri store
4. **Result**: Window became visible before the correct theme was applied, causing a flash

## Solution

### 1. Removed Premature Window Show in Launcher
**File**: `components/Launcher.tsx`

Removed the immediate `window.show()` call that happened 100ms after window creation. The window should only be shown after React has fully rendered and applied the theme.

```typescript
// Before:
setTimeout(async () => {
    await webview.show();
    await webview.setFocus();
}, 100);

// After:
// Don't show window here - let App.tsx show it after theme is applied
// This prevents flash of wrong background color
```

### 2. Optimized Window Show Delays in App.tsx
**File**: `App.tsx`

Adjusted the window show delays to be shorter for auth/create modes (30ms) since they have simpler rendering, while maintaining appropriate delays for other window types:

```typescript
// For auth/create, use minimal delay (30ms) since they're simple forms
// For launcher, use slightly longer (50ms) due to more complex rendering
// For others (Settings, About, etc.), use longer delay as safety net
const delay = (mode === 'auth' || mode === 'create') ? 30 : (mode === 'launcher' ? 50 : 100);
```

### 3. Removed Redundant Show Calls in VaultAuthWindow
**File**: `components/VaultAuthWindow.tsx`

Removed the redundant `win.show()` and `win.setFocus()` calls since `App.tsx` already handles showing the window after the theme is applied:

```typescript
// Before:
useEffect(() => {
    const win = getCurrentWebviewWindow();
    win.setResizable(false);
    win.center();
    win.show();
    win.setFocus();
}, []);

// After:
useEffect(() => {
    const win = getCurrentWebviewWindow();
    win.setResizable(false);
    win.center();
    // Don't show/focus here - App.tsx handles it after theme is applied
}, []);
```

### 4. Enhanced Synchronous Theme Application
**File**: `index.html`

Improved the synchronous theme application script to be more robust and aggressive in applying the theme before any rendering:

```javascript
// Enhanced to:
// 1. Apply theme to both documentElement and body
// 2. Store applied theme for debugging
// 3. More explicit classList operations
// 4. Better error handling
```

## How It Works Now

1. **Window Creation**: Window is created with `visible: false`
2. **React Render**: React renders the component tree
3. **Theme Application**: 
   - Synchronous script in `index.html` applies cached theme immediately
   - `ThemeManager` loads settings from Tauri store and updates if needed
4. **Window Show**: After a short delay (30-100ms depending on window type), `App.tsx` shows the window
5. **Result**: Window becomes visible only after the correct theme is applied, preventing flash

## Testing

To verify the fix:

1. **Light Mode Test**:
   - Set appearance to "Light" in Settings
   - Close all windows
   - Click "Open Recent" or "Create New Vault" from Launcher
   - Verify: No black flash before window appears

2. **Dark Mode Test**:
   - Set appearance to "Dark" in Settings
   - Close all windows
   - Click "Open Recent" or "Create New Vault" from Launcher
   - Verify: No white flash before window appears

3. **System Mode Test**:
   - Set appearance to "System" in Settings
   - Change system appearance between light and dark
   - Repeat tests above
   - Verify: No flash in either mode

## Additional Notes

- The fix maintains the existing window creation flow but ensures proper timing
- The 30ms delay for auth/create windows is minimal and imperceptible to users
- The synchronous theme script in `index.html` ensures the theme is applied before first paint
- The Rust `get_background_color()` function still provides a fallback, but it's now aligned with the theme cache
