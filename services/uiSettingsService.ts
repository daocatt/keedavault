// UI Settings Storage Service
const UI_SETTINGS_KEY = 'keedavault_ui_settings';

export interface UISettings {
    toolbarStyle: 'icon' | 'text' | 'both';
    leftSidebarVisible: boolean;
    rightSidebarVisible: boolean;
    entryColumns?: {
        name: boolean;
        username: boolean;
        email: boolean;
        password: boolean;
        url: boolean;
        created: boolean;
        modified: boolean;
    };
    entrySort?: {
        field: 'name' | 'username' | 'created' | 'modified';
        asc: boolean;
    };
}

const defaultSettings: UISettings = {
    toolbarStyle: 'icon',
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    entryColumns: {
        name: true,
        username: true,
        email: true,
        password: true,
        url: true,
        created: true,
        modified: true,
    },
    entrySort: {
        field: 'name',
        asc: true,
    },
};

export const getUISettings = (): UISettings => {
    try {
        const stored = localStorage.getItem(UI_SETTINGS_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load UI settings:', e);
    }
    return defaultSettings;
};

export const saveUISettings = (settings: Partial<UISettings>): void => {
    try {
        const current = getUISettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save UI settings:', e);
    }
};

export const updateUISettings = (key: keyof UISettings, value: any): void => {
    saveUISettings({ [key]: value });
};
