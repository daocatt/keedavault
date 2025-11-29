import React, { useEffect } from 'react';
import { getUISettings } from '../services/uiSettingsService';
import { listen } from '@tauri-apps/api/event';

export const ThemeManager: React.FC = () => {
    useEffect(() => {
        const applyTheme = (appearance: 'light' | 'dark' | 'system') => {
            const root = document.documentElement;
            const isDark = appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        const loadSettings = async () => {
            const settings = await getUISettings();
            if (settings?.general?.appearance) {
                applyTheme(settings.general.appearance);
            }
        };

        loadSettings();

        // Listen for settings changes
        const unlisten = listen('settings-changed', (event: any) => {
            if (event.payload?.general?.appearance) {
                applyTheme(event.payload.general.appearance);
            }
        });

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = async (e: MediaQueryListEvent) => {
            const settings = await getUISettings();
            if (settings?.general?.appearance === 'system') {
                applyTheme('system');
            }
        };
        mediaQuery.addEventListener('change', handleSystemChange);

        return () => {
            unlisten.then(f => f());
            mediaQuery.removeEventListener('change', handleSystemChange);
        };
    }, []);

    return null;
};
