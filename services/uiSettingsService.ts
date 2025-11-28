// UI Settings Storage Service
const UI_SETTINGS_KEY = 'keedavault_ui_settings';

export interface UISettings {
    toolbarStyle: 'icon' | 'text' | 'both';
    leftSidebarVisible: boolean;
    rightSidebarVisible: boolean;
    rightSidebarWidth?: number;
    entryListWidth?: number;
    entryColumns?: {
        title: boolean;
        username: boolean;
        email: boolean;
        password: boolean;
        url: boolean;
        created: boolean;
        modified: boolean;
    };
    entryColumnWidths?: {
        title: number;
        username: number;
        email: number;
        password: number;
        url: number;
        created: number;
        modified: number;
    };
    entrySort?: {
        field: 'title' | 'username' | 'created' | 'modified';
        asc: boolean;
    };
    passwordGenerator?: {
        specialChars: string;
    };
}

const defaultSettings: UISettings = {
    toolbarStyle: 'icon',
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    rightSidebarWidth: 350,
    entryListWidth: 600,
    entryColumns: {
        title: true,
        username: true,
        email: true,
        password: true,
        url: true,
        created: true,
        modified: true,
    },
    entryColumnWidths: {
        title: 250,
        username: 150,
        email: 180,
        password: 120,
        url: 180,
        created: 140,
        modified: 140,
    },
    entrySort: {
        field: 'modified',
        asc: false,
    },
    passwordGenerator: {
        specialChars: '^!#&@$%*+-_()<>',
    },
};

import { settingsStore } from './settingsStore';

// ... (imports and interface definitions remain same)

export const getUISettings = async (): Promise<UISettings> => {
    try {
        const stored = await settingsStore.get<UISettings>(UI_SETTINGS_KEY);
        if (stored) {
            const settings = { ...defaultSettings, ...stored };

            // Migration: name -> title in entryColumns
            if (settings.entryColumns && 'name' in (settings.entryColumns as any)) {
                settings.entryColumns.title = (settings.entryColumns as any).name;
                delete (settings.entryColumns as any).name;
            }

            // Migration: name -> title in entrySort
            if (settings.entrySort && settings.entrySort.field === 'name' as any) {
                settings.entrySort.field = 'title';
            }

            return settings;
        }
    } catch (e) {
        console.error('Failed to load UI settings:', e);
    }
    return defaultSettings;
};

export const saveUISettings = async (settings: Partial<UISettings>): Promise<void> => {
    try {
        const current = await getUISettings();
        const updated = { ...current, ...settings };
        await settingsStore.set(UI_SETTINGS_KEY, updated);
    } catch (e) {
        console.error('Failed to save UI settings:', e);
    }
};

export const updateUISettings = async (key: keyof UISettings, value: any): Promise<void> => {
    await saveUISettings({ [key]: value });
};
