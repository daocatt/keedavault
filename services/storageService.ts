import { settingsStore } from './settingsStore';

// Service for persisting vault information
export interface SavedVaultInfo {
    path?: string;
    filename: string;
    lastOpened: number;
}

const STORAGE_KEY = 'keedavault_recent_vaults';

export const saveRecentVault = async (vaultInfo: SavedVaultInfo) => {
    try {
        const recent = await getRecentVaults();
        // Remove if already exists
        const filtered = recent.filter(v => v.path !== vaultInfo.path || v.filename !== vaultInfo.filename);
        // Add to beginning
        filtered.unshift(vaultInfo);
        // Keep only last 5
        const toSave = filtered.slice(0, 5);
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
        return stored;
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
