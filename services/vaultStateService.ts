import { settingsStore } from './settingsStore';

const VAULT_STATE_KEY = 'keedavault_vault_state';

export interface VaultState {
    lastGroupId?: string;
    lastSelectedEntryIds?: string[];
}

export type VaultStateMap = Record<string, VaultState>; // Keyed by vault path

export const getVaultState = async (path: string): Promise<VaultState | undefined> => {
    try {
        const allStates = await settingsStore.get<VaultStateMap>(VAULT_STATE_KEY);
        return allStates ? allStates[path] : undefined;
    } catch (e) {
        console.error('Failed to get vault state:', e);
        return undefined;
    }
};

export const saveVaultState = async (path: string, state: Partial<VaultState>) => {
    try {
        const allStates = await settingsStore.get<VaultStateMap>(VAULT_STATE_KEY) || {};
        const currentState = allStates[path] || {};

        // Merge new state with existing
        const newState = { ...currentState, ...state };

        // Only save if changed (shallow comparison for optimization could be done here but maybe overkill)
        allStates[path] = newState;

        await settingsStore.set(VAULT_STATE_KEY, allStates);
    } catch (e) {
        console.error('Failed to save vault state:', e);
    }
};
