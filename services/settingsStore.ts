import { Store } from '@tauri-apps/plugin-store';

const store = await Store.load('settings.json');

export const settingsStore = {
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const val = await store.get<T>(key);
            return val ?? null;
        } catch (e) {
            console.error(`Failed to get key ${key} from store:`, e);
            return null;
        }
    },
    set: async (key: string, value: any): Promise<void> => {
        try {
            await store.set(key, value);
            await store.save();
        } catch (e) {
            console.error(`Failed to set key ${key} in store:`, e);
        }
    },
    remove: async (key: string): Promise<void> => {
        try {
            await store.delete(key);
            await store.save();
        } catch (e) {
            console.error(`Failed to remove key ${key} from store:`, e);
        }
    }
};
