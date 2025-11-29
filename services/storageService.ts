import { settingsStore } from './settingsStore';

// Service for persisting vault information
export interface SavedVaultInfo {
    path?: string;
    filename: string;
    lastOpened: number;
    firstOpened?: number;
}

const STORAGE_KEY = 'keedavault_recent_vaults';

import { getUISettings } from './uiSettingsService';

export const saveRecentVault = async (vaultInfo: SavedVaultInfo) => {
    try {
        // Get raw list without sorting to avoid confusion during manipulation
        const stored = await settingsStore.get<SavedVaultInfo[]>(STORAGE_KEY) || [];

        // Find existing entry to preserve firstOpened
        const existingEntry = stored.find(v => v.path === vaultInfo.path && v.filename === vaultInfo.filename);
        const firstOpened = existingEntry?.firstOpened || existingEntry?.lastOpened || Date.now();

        // Remove if already exists
        const filtered = stored.filter(v => v.path !== vaultInfo.path || v.filename !== vaultInfo.filename);

        // Add to beginning with updated lastOpened and preserved firstOpened
        const newEntry: SavedVaultInfo = {
            ...vaultInfo,
            firstOpened: firstOpened
        };
        filtered.unshift(newEntry);

        // Get configured limit
        const settings = await getUISettings();
        const limit = settings.general?.recentFileCount || 5;

        // Keep only last N (based on recency of use, which is what unshift/slice does effectively for LRU)
        const toSave = filtered.slice(0, limit);
        await settingsStore.set(STORAGE_KEY, toSave);
    } catch (e) {
        console.error('Failed to save recent vault:', e);
    }
};

export const getRecentVaults = async (): Promise<SavedVaultInfo[]> => {
    try {
        console.log('getRecentVaults called');
        const stored = await settingsStore.get<SavedVaultInfo[]>(STORAGE_KEY);
        if (!stored) return [];

        // Sort by firstOpened ascending (oldest known first)
        // Fallback to lastOpened if firstOpened is missing
        return stored.sort((a, b) => {
            const firstA = a.firstOpened || a.lastOpened;
            const firstB = b.firstOpened || b.lastOpened;
            return firstA - firstB;
        });
    } catch (e) {
        console.error('Failed to load recent vaults:', e);
        return [];
    }
};

export const removeRecentVault = async (path?: string, filename?: string) => {
    try {
        const recent = await getRecentVaults();
        const filtered = recent.filter(v => v.path !== path || v.filename !== filename);
        await settingsStore.set(STORAGE_KEY, filtered);
    } catch (e) {
        console.error('Failed to remove recent vault:', e);
    }
};
