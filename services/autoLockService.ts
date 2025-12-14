import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getUISettings } from './uiSettingsService';
import { listen } from '@tauri-apps/api/event';

/**
 * Auto-Lock Service
 * Handles automatic locking of vaults based on various security settings:
 * - Lock on inactivity (idle timer)
 * - Lock in background (window blur/minimize)
 * - Lock on system sleep/screensaver
 */

let inactivityTimer: number | null = null;
let backgroundTimer: number | null = null;
let lastActivityTime: number = Date.now();
let isInBackground: boolean = false;
let currentLockCallback: (() => void) | null = null;

// Unlisten functions for event listeners
let unlistenSettings: (() => void) | null = null;
let unlistenBlur: (() => void) | null = null;
let unlistenFocus: (() => void) | null = null;
let unlistenSleep: (() => void) | null = null;
let unlistenScreensaver: (() => void) | null = null;

/**
 * Reset the inactivity timer
 */
export const resetInactivityTimer = () => {
    lastActivityTime = Date.now();
};

/**
 * Initialize auto-lock listeners
 * Call this when a vault is unlocked
 */
export const initializeAutoLock = async (lockCallback: () => void) => {
    currentLockCallback = lockCallback;
    const settings = await getUISettings();

    // Clear any existing timers and listeners
    // We pass true to ensure we start fresh, including settings listener
    cleanup(true);

    // Start listeners
    await setupListeners(settings);

    // Listen for settings changes to update monitoring in real-time
    if (!unlistenSettings) {
        unlistenSettings = await listen('settings-changed', async () => {
            console.log('Auto-lock: Settings changed, reloading configuration');
            // Cleanup current monitors but keep the settings listener active
            cleanup(false);
            const newSettings = await getUISettings();
            setupListeners(newSettings);
        });
    }
};

/**
 * Setup specific monitoring based on settings
 */
const setupListeners = async (settings: any) => {
    if (!currentLockCallback) return;

    // 1. Lock on Inactivity
    if (settings.security?.lockOnInactivity && settings.security.lockOnInactivity > 0) {
        startInactivityMonitoring(settings.security.lockOnInactivity, currentLockCallback);
    }

    // 2. Lock in Background
    if (settings.security?.lockOnBackgroundDelay && settings.security.lockOnBackgroundDelay > 0) {
        await startBackgroundMonitoring(settings.security.lockOnBackgroundDelay, currentLockCallback);
    }

    // 3. Lock on System Sleep (macOS)
    if (settings.security?.lockOnSystemSleep) {
        await startSystemSleepMonitoring(currentLockCallback);
    }
};

/**
 * Start monitoring user activity for inactivity timeout
 */
const startInactivityMonitoring = (timeoutSeconds: number, lockCallback: () => void) => {
    // Reset activity time
    lastActivityTime = Date.now();

    // Add activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Check inactivity every second
    inactivityTimer = window.setInterval(() => {
        const idleTime = (Date.now() - lastActivityTime) / 1000;

        if (idleTime >= timeoutSeconds) {
            console.log(`Auto-lock: Inactivity timeout (${timeoutSeconds}s) reached`);
            lockCallback();
            cleanup(true);
        }
    }, 1000);

    console.log(`Auto-lock: Inactivity monitoring started (${timeoutSeconds}s)`);
};

/**
 * Start monitoring window focus for background timeout
 */
const startBackgroundMonitoring = async (delaySeconds: number, lockCallback: () => void) => {
    const tauriWindow = getCurrentWebviewWindow();

    // Listen for window blur (goes to background)
    const handleBlur = async () => {
        isInBackground = true;
        console.log('Auto-lock: Window went to background');

        // If delay is 1 second (Immediately option), lock right away
        if (delaySeconds === 1) {
            console.log('Auto-lock: Locking immediately on background');
            lockCallback();
            return;
        }

        // Otherwise, start a timer
        backgroundTimer = window.setTimeout(() => {
            if (isInBackground) {
                console.log(`Auto-lock: Background timeout (${delaySeconds}s) reached`);
                lockCallback();
            }
        }, delaySeconds * 1000);
    };

    // Listen for window focus (comes back to foreground)
    const handleFocus = () => {
        isInBackground = false;
        console.log('Auto-lock: Window came to foreground');

        // Cancel background timer if it exists
        if (backgroundTimer !== null) {
            window.clearTimeout(backgroundTimer);
            backgroundTimer = null;
            console.log('Auto-lock: Background timer cancelled');
        }
    };

    unlistenBlur = await tauriWindow.listen('tauri://blur', handleBlur);
    unlistenFocus = await tauriWindow.listen('tauri://focus', handleFocus);

    console.log(`Auto-lock: Background monitoring started (${delaySeconds}s)`);
};

/**
 * Start monitoring for system sleep/screensaver (macOS only)
 */
const startSystemSleepMonitoring = async (lockCallback: () => void) => {
    const window = getCurrentWebviewWindow();

    // Listen for system sleep event from Tauri backend
    unlistenSleep = await window.listen('system-sleep', () => {
        console.log('Auto-lock: System sleep detected');
        lockCallback();
    });

    // Listen for screensaver start event from Tauri backend
    unlistenScreensaver = await window.listen('screensaver-start', () => {
        console.log('Auto-lock: Screensaver detected');
        lockCallback();
    });

    console.log('Auto-lock: System sleep monitoring started');
};

/**
 * Cleanup all auto-lock timers and listeners
 * Call this when a vault is locked or closed
 * @param removeSettingsListener whether to remove the settings change listener (default: true)
 */
export const cleanup = (removeSettingsListener = true) => {
    // Clear inactivity timer
    if (inactivityTimer !== null) {
        window.clearInterval(inactivityTimer);
        inactivityTimer = null;
    }

    // Clear background timer
    if (backgroundTimer !== null) {
        window.clearTimeout(backgroundTimer);
        backgroundTimer = null;
    }

    // Remove activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
    });

    // Unlisten Tauri events
    if (unlistenBlur) {
        unlistenBlur();
        unlistenBlur = null;
    }
    if (unlistenFocus) {
        unlistenFocus();
        unlistenFocus = null;
    }
    if (unlistenSleep) {
        unlistenSleep();
        unlistenSleep = null;
    }
    if (unlistenScreensaver) {
        unlistenScreensaver();
        unlistenScreensaver = null;
    }

    if (removeSettingsListener && unlistenSettings) {
        unlistenSettings();
        unlistenSettings = null;
    }

    console.log('Auto-lock: Cleanup complete');
};

/**
 * DEPRECATED: Database switch handling is no longer supported
 */
export const handleDatabaseSwitch = async (lockCallback: () => void) => {
    // No-op
};
