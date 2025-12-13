# Auto-Lock Features Implementation

## Overview

KeedaVault now supports comprehensive auto-lock functionality to enhance security. The vault will automatically lock based on various conditions configured in the Security settings.

## Implemented Features

### ✅ 1. Lock on Window Close
**Status**: Already working  
**Description**: Locks the vault when the main window is closed.  
**Implementation**: Handled by Tauri window close event.

### ✅ 2. Lock on Inactivity
**Status**: Now implemented  
**Description**: Automatically locks the vault after a period of user inactivity.  
**Settings**: Configurable from "Never" to 60 minutes (1 hour)  
**How it works**:
- Monitors mouse movements, keyboard input, scrolling, and touch events
- Resets the timer on any user activity
- Checks every second if the inactivity timeout has been reached
- Locks the vault when the timeout is exceeded

### ✅ 3. Lock in Background
**Status**: Now implemented  
**Description**: Locks the vault when the application goes to the background (window loses focus or is minimized).  
**Settings**: Configurable from "Never" to 5 minutes, with "Immediately" option  
**How it works**:
- Listens for window blur events (when app loses focus)
- If set to "Immediately" (1 second), locks right away
- Otherwise, starts a countdown timer
- Cancels the timer if the window regains focus before timeout
- Locks the vault if it remains in background for the configured duration

### ✅ 4. Lock on Database Switch
**Status**: Now implemented  
**Description**: Locks the current vault when switching to a different vault.  
**Settings**: Toggle on/off  
**How it works**:
- Intercepts vault switching operations
- Checks the security setting
- Locks the current vault before activating the new one

### ⚠️ 5. Lock on System Sleep
**Status**: Partially implemented (requires Tauri backend support)  
**Description**: Locks the vault when the computer goes to sleep or the screensaver starts.  
**Settings**: Toggle on/off  
**How it works**:
- Frontend listens for `system-sleep` and `screensaver-start` events
- **TODO**: Backend needs to emit these events using macOS system APIs

## Architecture

### Service Layer
**File**: `services/autoLockService.ts`

Provides centralized auto-lock management:
- `initializeAutoLock(lockCallback)` - Sets up all monitoring based on settings
- `cleanup()` - Removes all listeners and timers
- `resetInactivityTimer()` - Resets the inactivity countdown
- `handleDatabaseSwitch(lockCallback)` - Handles vault switching logic

### Integration Points

#### VaultWorkspace Component
- Initializes auto-lock when vault is unlocked
- Cleans up when vault is locked or component unmounts
- Passes the `lockVault` callback to the service

#### VaultContext
- Wraps `setActiveVault` to handle lock-on-database-switch
- Provides the `lockVault` function used by all lock mechanisms

## Configuration

All settings are stored in `UISettings.security`:

```typescript
security: {
    lockOnInactivity: number;        // seconds, 0 = disabled
    lockOnBackgroundDelay: number;   // seconds, 0 = disabled
    lockOnWindowClose: boolean;      // true/false
    lockOnSwitchDatabase: boolean;   // true/false
    lockOnSystemSleep: boolean;      // true/false
}
```

## Testing

### Test Lock on Inactivity
1. Open Settings → Security
2. Set "Lock on Inactivity" to 1 minute
3. Don't interact with the app for 1 minute
4. **Expected**: Vault locks automatically

### Test Lock in Background
1. Open Settings → Security
2. Set "Lock in Background" to "Immediately"
3. Switch to another application (Cmd+Tab)
4. **Expected**: Vault locks immediately

### Test Lock on Database Switch
1. Open Settings → Security
2. Enable "Lock on Database Switch"
3. Open two vaults
4. Switch between them using the Window menu
5. **Expected**: Current vault locks before switching

### Test Lock on System Sleep
1. Open Settings → Security
2. Enable "Lock on System Sleep"
3. Put your Mac to sleep (Cmd+Option+Power)
4. Wake it up
5. **Expected**: Vault should be locked (requires backend implementation)

## TODO: Backend Implementation for System Sleep

To complete the "Lock on System Sleep" feature, the Tauri backend needs to:

1. **Listen for macOS system events**:
   - Use `NSWorkspace` notifications for sleep/wake
   - Use `DistributedNotificationCenter` for screensaver events

2. **Emit events to frontend**:
   ```rust
   // When system goes to sleep
   app.emit_all("system-sleep", {}).unwrap();
   
   // When screensaver starts
   app.emit_all("screensaver-start", {}).unwrap();
   ```

3. **Implementation location**: `src-tauri/src/main.rs` or a dedicated module

### Example Rust Code (macOS)

```rust
use cocoa::appkit::NSWorkspace;
use cocoa::foundation::NSNotificationCenter;

// In your Tauri setup
let app_handle = app.handle();
std::thread::spawn(move || {
    unsafe {
        let workspace = NSWorkspace::sharedWorkspace(nil);
        let notification_center = workspace.notificationCenter();
        
        // Listen for sleep notification
        notification_center.addObserverForName_object_queue_usingBlock(
            NSWorkspaceWillSleepNotification,
            nil,
            nil,
            |_notification| {
                app_handle.emit_all("system-sleep", {}).unwrap();
            }
        );
        
        // Listen for screensaver
        let dist_center = NSDistributedNotificationCenter::defaultCenter(nil);
        dist_center.addObserverForName_object_queue_usingBlock(
            "com.apple.screensaver.didstart",
            nil,
            nil,
            |_notification| {
                app_handle.emit_all("screensaver-start", {}).unwrap();
            }
        );
    }
});
```

## Security Considerations

1. **Activity Detection**: Only monitors user input events, not background processes
2. **Timer Precision**: Checks every second for inactivity (not real-time)
3. **Background Detection**: Uses window focus events (reliable on macOS)
4. **Cleanup**: All timers and listeners are properly cleaned up to prevent memory leaks

## User Experience

- All lock events are logged to console for debugging
- Lock operations are instant and don't require user confirmation
- Settings changes take effect immediately (no restart required)
- Multiple lock conditions can be active simultaneously
- The most restrictive condition will trigger first

## Troubleshooting

### Inactivity lock not working
- Check console for "Auto-lock: Inactivity monitoring started" message
- Verify the setting is not set to "Never" (0)
- Ensure you're not moving the mouse or typing

### Background lock not working
- Check console for "Auto-lock: Window went to background" message
- Verify the setting is not set to "Never" (0)
- Try minimizing the window or switching apps

### Database switch lock not working
- Check console for "Auto-lock: Database switch detected" message
- Verify the setting is enabled
- Ensure you have multiple vaults open

## Files Modified

1. `services/autoLockService.ts` - New service for auto-lock logic
2. `components/VaultWorkspace.tsx` - Integration and initialization
3. `context/VaultContext.tsx` - Lock-on-switch wrapper
4. `services/uiSettingsService.ts` - Settings definitions (already existed)
5. `components/SettingsWindow.tsx` - UI controls (already existed)

## Version

- **Implemented**: December 2025
- **Version**: 0.2.2+
- **Platform**: macOS (with partial support for other platforms)
