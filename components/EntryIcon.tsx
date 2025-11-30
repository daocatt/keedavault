import React, { useState, useEffect } from 'react';
import { VaultEntry, VaultGroup } from '../types';
import { ICONS_MAP } from '../constants';
import { Folder } from 'lucide-react';
import { getEntryIconColor, getNeutralIconColor } from '../utils/iconColor';
import { getUISettings } from '../services/uiSettingsService';

interface EntryIconProps {
    entry: VaultEntry;
    group?: VaultGroup;
    className?: string;
    size?: number;
}

export const EntryIcon: React.FC<EntryIconProps> = ({ entry, group, className, size = 16 }) => {
    const [imageError, setImageError] = useState(false);
    const [colorizeIcons, setColorizeIcons] = useState(true);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await getUISettings();
            setColorizeIcons(settings.general?.colorizedEntryIcons ?? true);
        };
        loadSettings();

        // Listen for settings changes
        const handleSettingsChange = (event: CustomEvent) => {
            if (event.detail?.general?.colorizedEntryIcons !== undefined) {
                setColorizeIcons(event.detail.general.colorizedEntryIcons);
            }
        };
        document.addEventListener('settings-changed', handleSettingsChange as EventListener);

        // Detect dark mode
        const checkDarkMode = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => {
            document.removeEventListener('settings-changed', handleSettingsChange as EventListener);
            observer.disconnect();
        };
    }, []);

    // Determine icon color
    const iconColor = colorizeIcons
        ? getEntryIconColor(entry.uuid, entry.title)
        : getNeutralIconColor(isDark);

    // 1. Priority: Explicitly set non-default icon
    // We treat '0' (Key) as the default/placeholder. If the user selects anything else, show it.
    if (entry.icon !== undefined && entry.icon !== 0) {
        const Icon = ICONS_MAP[entry.icon] || Folder;
        return <Icon size={size} strokeWidth={2} className={className} style={{ color: iconColor }} fill="currentColor" fillOpacity={0.2} />;
    }

    // 2. Try Favicon if URL exists
    if (entry.url && !imageError) {
        try {
            // Simple check to ensure it looks like a URL
            if (entry.url.includes('.') && !entry.url.startsWith('cmd://')) {
                // Handle URLs that might not have http/https prefix
                let urlStr = entry.url;
                if (!urlStr.match(/^https?:\/\//)) {
                    urlStr = 'https://' + urlStr;
                }

                const url = new URL(urlStr);
                const domain = url.hostname;
                const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

                return (
                    <img
                        src={faviconUrl}
                        alt=""
                        className={`${className} rounded-sm object-contain`}
                        style={{ width: size, height: size }}
                        onError={() => setImageError(true)}
                    />
                );
            }
        } catch (e) {
            // Invalid URL, fall through
        }
    }

    // 3. Fallback to Entry Icon, then Group Icon, then Default
    // Use entry.icon if available (0 is valid), otherwise fallback to group icon or Folder
    const iconId = entry.icon !== undefined ? entry.icon : group?.icon;
    const Icon = (iconId !== undefined && ICONS_MAP[iconId]) ? ICONS_MAP[iconId] : Folder;

    return <Icon size={size} strokeWidth={2} className={className} style={{ color: iconColor }} fill="currentColor" fillOpacity={0.2} />;
};
