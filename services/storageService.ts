// Service for persisting vault information
export interface SavedVaultInfo {
    path?: string;
    filename: string;
    lastOpened: number;
}

const STORAGE_KEY = 'keedavault_recent_vaults';

export const saveRecentVault = (vaultInfo: SavedVaultInfo) => {
    try {
        const recent = getRecentVaults();
        // Remove if already exists
        const filtered = recent.filter(v => v.path !== vaultInfo.path || v.filename !== vaultInfo.filename);
        // Add to beginning
        filtered.unshift(vaultInfo);
        // Keep only last 5
        const toSave = filtered.slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.error('Failed to save recent vault:', e);
    }
};

export const getRecentVaults = (): SavedVaultInfo[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const vaults: SavedVaultInfo[] = JSON.parse(stored);
        return vaults.sort((a, b) => b.lastOpened - a.lastOpened);
    } catch (e) {
        console.error('Failed to load recent vaults:', e);
        return [];
    }
};

export const removeRecentVault = (path?: string, filename?: string) => {
    try {
        const recent = getRecentVaults();
        const filtered = recent.filter(v => v.path !== path || v.filename !== filename);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Failed to remove recent vault:', e);
    }
};
