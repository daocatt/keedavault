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
        field: 'title',
        asc: true,
    },
};

export const getUISettings = (): UISettings => {
    try {
        const stored = localStorage.getItem(UI_SETTINGS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            const settings = { ...defaultSettings, ...parsed };

            // Migration: name -> title in entryColumns
            if (settings.entryColumns && 'name' in settings.entryColumns) {
                settings.entryColumns.title = settings.entryColumns.name;
                delete settings.entryColumns.name;
            }

            // Migration: name -> title in entrySort
            if (settings.entrySort && settings.entrySort.field === 'name') {
                settings.entrySort.field = 'title';
            }

            return settings;
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
