import { invoke } from '@tauri-apps/api/core';

/**
 * Updates the Window menu to show all currently open vault windows
 */
export async function updateWindowMenu(): Promise<void> {
    try {
        await invoke('update_window_menu');
    } catch (error) {
        console.error('Failed to update window menu:', error);
    }
}
