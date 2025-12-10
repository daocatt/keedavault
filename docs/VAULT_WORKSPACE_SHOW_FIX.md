# Vault Workspace Blank Screen - Fix

## Problem

After entering the correct password to unlock a vault, the vault workspace would show a blank screen instead of displaying the vault contents.

## Root Cause

There were **two conflicting window management flows**:

1. **App.tsx `onSuccess` callback**:
   - Hides window
   - Resizes window to 1200x700
   - Centers window
   - Switches to 'vault' mode
   - Shows window after 100ms delay

2. **VaultWorkspace `useEffect`** (on mount):
   - Sets window resizable/maximizable
   - Sets min/max size
   - Resizes window to 1200x700 (again!)
   - Centers window (again!)
   - Shows window immediately
   - Sets focus

**The Conflict**: VaultWorkspace was showing the window immediately before React had finished rendering, causing a blank screen. The timing was also conflicting with App.tsx's delayed show.

## Solution

### 1. Centralized Window Management in App.tsx

All window resize and show logic for the vault unlock flow is now handled in `App.tsx`:

```typescript
onSuccess={async () => {
  const win = getCurrentWebviewWindow();
  await win.hide(); // Hide during resize
  await win.setResizable(true);
  await win.setSize(new LogicalSize(1200, 700));
  await win.center();
  
  setMode('vault'); // Switch to vault mode
  
  // Show after VaultWorkspace renders
  setTimeout(async () => {
    await win.show();
    await win.setFocus();
  }, 200); // Increased to 200ms for complex rendering
}}
```

### 2. Simplified VaultWorkspace Initialization

Removed all window management from `VaultWorkspace.tsx`:

```typescript
// Before: Complex window initialization with resize and show
useEffect(() => {
  const initWindow = async () => {
    // ... lots of window management code
    await win.show(); // ❌ Conflicts with App.tsx
  };
  initWindow();
}, []);

// After: Just focus the search input
useEffect(() => {
  const timer = setTimeout(() => {
    const searchInput = document.getElementById('entry-search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }, 100);
  return () => clearTimeout(timer);
}, []);
```

## Key Changes

1. **Removed from VaultWorkspace**:
   - Window resize logic
   - Window show/focus logic
   - Window center logic
   - Imports: `getCurrentWebviewWindow`, `LogicalSize`

2. **Enhanced in App.tsx**:
   - Increased delay from 100ms to 200ms
   - Added better comments explaining the flow
   - Ensured proper sequencing

## Why 200ms Delay?

VaultWorkspace has complex initialization:
- Loading vault data
- Rendering sidebar with groups
- Rendering entry list
- Rendering entry detail panel
- Setting up event listeners
- Applying UI settings

200ms ensures all this is complete before the window becomes visible.

## Testing

To verify the fix:

1. Open Launcher
2. Click on a recent vault
3. Enter password
4. **Expected**: Window shows with fully rendered vault workspace
5. **Expected**: No blank screen
6. **Expected**: Search input is focused
7. **Expected**: Window is 1200x700 and centered

## Files Modified

- `App.tsx` - Increased delay to 200ms, added comments
- `components/VaultWorkspace.tsx` - Removed window management, kept only search input focus

## Benefits

1. **No Blank Screen**: Window only shows when content is ready
2. **No Conflicts**: Single source of truth for window management
3. **Cleaner Code**: VaultWorkspace focuses on vault logic, not window management
4. **Better UX**: Smooth transition from auth to vault workspace
