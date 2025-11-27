import { Store } from '@tauri-apps/plugin-store';

let store: Store | null = null;
let loadPromise: Promise<Store> | null = null;

const getStore = async (): Promise<Store> => {
    if (store) return store;

    if (!loadPromise) {
        loadPromise = Store.load('settings.json');
    }

    store = await loadPromise;
    return store;
};

export const settingsStore = {
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const s = await getStore();
            const val = await s.get<T>(key);
            return val ?? null;
        } catch (e) {
            console.error(`Failed to get key ${key} from store:`, e);
            return null;
        }
    },
    set: async (key: string, value: any): Promise<void> => {
        try {
            const s = await getStore();
            await s.set(key, value);
            await s.save();
        } catch (e) {
            console.error(`Failed to set key ${key} in store:`, e);
        }
    },
    remove: async (key: string): Promise<void> => {
        try {
            const s = await getStore();
            await s.delete(key);
            await s.save();
        } catch (e) {
            console.error(`Failed to remove key ${key} from store:`, e);
        }
    }
};
