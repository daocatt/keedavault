import React, { useState, useEffect } from 'react';
import { Settings, Shield, Globe, Terminal, Check, Moon, Sun, Monitor, ChevronRight, Clock, Lock, FileText as FileTextIcon, Hash, Eye, Fingerprint, Save, XCircle, Power, Info } from 'lucide-react';
import { getUISettings, saveUISettings, UISettings } from '../services/uiSettingsService';
import { Image } from '@tauri-apps/api/image';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

type Tab = 'general' | 'security' | 'browser' | 'ssh';

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string; icon?: React.ElementType }> = ({ checked, onChange, label, description, icon: Icon }) => (
    <div className="flex items-center justify-between py-3 group">
        <div className="flex items-start flex-1 pr-4">
            {Icon && <div className="mr-3 mt-0.5 text-gray-400 group-hover:text-indigo-500 transition-colors"><Icon size={18} strokeWidth={1.5} /></div>}
            <div>
                <label className="text-sm font-medium block" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
                {description && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>}
            </div>
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    </div>
);


interface SelectOption {
    label: string;
    value: string;
}

interface SelectProps {
    value: string;
    onChange: (val: string) => void;
    options: SelectOption[];
    label: string;
    icon?: React.ElementType;
}

const Select: React.FC<SelectProps> = ({ value, onChange, options, label, icon: Icon }) => (
    <div className="flex items-center justify-between py-3 group">
        <div className="flex items-center">
            {Icon && <div className="mr-3 text-gray-400 group-hover:text-indigo-500 transition-colors"><Icon size={18} strokeWidth={1.5} /></div>}
            <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
        </div>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="block w-40 pl-3 pr-8 py-1.5 text-sm rounded-md shadow-sm appearance-none cursor-pointer hover:bg-opacity-80 transition-colors"
                style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    </div>
);

const AVAILABLE_ICONS = [
    { id: 'default', label: 'Default', path: '/icons/icon-default.png' },
    // Add more icons here by placing them in public/icons/ and adding to this list
    { id: 'dark', label: 'Dark', path: '/icons/icon-dark.png' },
];

export const SettingsWindow: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [settings, setSettings] = useState<UISettings | null>(null);

    useEffect(() => {
        loadSettings();

        // Show window immediately after first paint
        requestAnimationFrame(async () => {
            try {
                const window = getCurrentWebviewWindow();
                await window.show();
                await window.setFocus();
            } catch (e) {
                console.error("Failed to show Settings window:", e);
            }
        });
    }, []);

    const loadSettings = async () => {
        const s = await getUISettings();
        setSettings(s);
    };

    const updateSetting = async (section: 'general' | 'security', key: string, value: string | number | boolean) => {
        if (!settings) return;

        const newSettings = {
            ...settings,
            [section]: {
                ...settings[section],
                [key]: value
            }
        };

        setSettings(newSettings);
        await saveUISettings(newSettings);
    };

    const changeAppIcon = async (iconId: string) => {
        const icon = AVAILABLE_ICONS.find(i => i.id === iconId);
        if (!icon) return;

        try {
            // Update setting first
            if (!settings) return;
            const newSettings: UISettings = {
                ...settings,
                general: {
                    recentFileCount: settings.general?.recentFileCount ?? 5,
                    markdownNotes: settings.general?.markdownNotes ?? false,
                    colorizedPassword: settings.general?.colorizedPassword ?? true,
                    colorizedEntryIcons: settings.general?.colorizedEntryIcons ?? true,
                    appearance: settings.general?.appearance ?? 'system',
                    appIcon: iconId
                }
            };
            setSettings(newSettings);
            await saveUISettings(newSettings);

            // Update window icon (titlebar only - dock icon requires app restart)
            try {
                const response = await fetch(icon.path);
                const blob = await response.blob();
                const buffer = await blob.arrayBuffer();
                const image = await Image.fromBytes(new Uint8Array(buffer));

                // Set icon for current window using Tauri v2 API
                const window = getCurrentWebviewWindow();
                await window.setIcon(image);

                console.log('Window icon updated successfully');
            } catch (iconError) {
                console.warn('Failed to update window icon (non-critical):', iconError);
                // Continue even if window icon update fails
            }

            // Show notification
            document.dispatchEvent(new CustomEvent('show-toast', {
                detail: {
                    id: crypto.randomUUID(),
                    type: 'success',
                    title: 'App Icon Changed',
                    description: 'Restart the app to see the new dock icon'
                }
            }));
        } catch (e) {
            console.error('Failed to change app icon:', e);
            document.dispatchEvent(new CustomEvent('show-toast', {
                detail: {
                    id: crypto.randomUUID(),
                    type: 'error',
                    title: 'Failed to Change Icon',
                    description: String(e)
                }
            }));
        }
    };

    if (!settings) return null;

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'browser', label: 'Browser', icon: Globe },
        { id: 'ssh', label: 'SSH Agent', icon: Terminal },
    ];

    return (
        <div className="h-screen flex flex-col select-none font-sans" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
            {/* Title Bar */}
            <div data-tauri-drag-region className="h-9 flex items-center justify-center border-b backdrop-blur-md flex-shrink-0 relative z-10 select-none" style={{ backgroundColor: 'var(--color-bg-sidebar)', borderColor: 'var(--color-border-light)', opacity: 0.95 }}>
                <div className="font-semibold text-xs flex items-center pointer-events-none" style={{ color: 'var(--color-text-primary)' }}>
                    Settings
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 border-r flex flex-col pt-6 px-3 space-y-1" style={{ backgroundColor: 'var(--color-bg-sidebar)', borderColor: 'var(--color-border-light)' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium text-left flex items-center space-x-3 transition-all duration-200 ${activeTab === tab.id ? 'text-indigo-600 shadow-sm ring-1 ring-black/5' : 'hover:text-gray-900'}`}
                            style={activeTab === tab.id ? { backgroundColor: 'var(--color-bg-primary)' } : { color: 'var(--color-text-secondary)' }}
                        >
                            <tab.icon size={18} strokeWidth={1.5} className={activeTab === tab.id ? 'text-indigo-600' : ''} style={activeTab !== tab.id ? { color: 'var(--color-text-tertiary)' } : {}} />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && <ChevronRight size={14} strokeWidth={1.5} className="ml-auto text-indigo-400" />}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                    <div className="max-w-2xl mx-auto p-8">
                        {activeTab === 'general' && settings.general && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: 'var(--color-text-secondary)' }}>Behavior</h3>
                                    <div className="rounded-xl border shadow-sm divide-y px-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                        <Select
                                            label="Recent Databases"
                                            icon={Clock}
                                            value={String(settings.general.recentFileCount)}
                                            onChange={(v) => updateSetting('general', 'recentFileCount', parseInt(v))}
                                            options={[1, 2, 3, 4, 5, 10].map(n => ({ label: `${n} files`, value: String(n) }))}
                                        />
                                        <Toggle
                                            label="Markdown Notes"
                                            icon={FileTextIcon}
                                            description="Render notes using Markdown syntax"
                                            checked={settings.general.markdownNotes}
                                            onChange={(v) => updateSetting('general', 'markdownNotes', v)}
                                        />
                                        <Toggle
                                            label="Colorize Passwords"
                                            icon={Hash}
                                            description="Highlight numbers and symbols in passwords"
                                            checked={settings.general.colorizedPassword}
                                            onChange={(v) => updateSetting('general', 'colorizedPassword', v)}
                                        />
                                        <Toggle
                                            label="Colorize Entry Icons"
                                            icon={Eye}
                                            description="Show entry icons in unique colors"
                                            checked={settings.general.colorizedEntryIcons}
                                            onChange={(v) => updateSetting('general', 'colorizedEntryIcons', v)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: 'var(--color-text-secondary)' }}>Appearance</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { id: 'light', label: 'Light', icon: Sun },
                                            { id: 'dark', label: 'Dark', icon: Moon },
                                            { id: 'system', label: 'System', icon: Monitor },
                                        ].map((theme) => (
                                            <button
                                                key={theme.id}
                                                onClick={() => updateSetting('general', 'appearance', theme.id)}
                                                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${settings.general!.appearance === theme.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'hover:bg-gray-50'}`}
                                                style={settings.general!.appearance !== theme.id ? { borderColor: 'var(--color-border-light)', color: 'var(--color-text-secondary)' } : {}}
                                            >
                                                <theme.icon size={24} strokeWidth={1.5} className="mb-3" />
                                                <span className="text-sm font-medium">{theme.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: 'var(--color-text-secondary)' }}>App Icon</h3>
                                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                                        {AVAILABLE_ICONS.map((icon) => (
                                            <button
                                                key={icon.id}
                                                onClick={() => changeAppIcon(icon.id)}
                                                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 ${settings.general?.appIcon === icon.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                                style={settings.general?.appIcon !== icon.id ? { borderColor: 'var(--color-border-light)', color: 'var(--color-text-secondary)' } : {}}
                                            >
                                                <img src={icon.path} alt={icon.label} className="w-16 h-16 mb-3 rounded-xl shadow-sm object-cover" />
                                                <span className="text-sm font-medium">{icon.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs mt-3 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                        <span className="inline-flex items-center">
                                            <Info size={12} className="mr-1" />
                                            Dock icon will update after restarting the app
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && settings.security && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: 'var(--color-text-secondary)' }}>Clipboard Security</h3>
                                    <div className="rounded-xl border shadow-sm divide-y px-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                        {/* Clipboard Clear Delay - Modern Time Tracker */}
                                        <div className="py-3">
                                            <div className="flex items-start flex-1 pr-4 mb-3">
                                                <div className="mr-3 mt-0.5 text-gray-400 group-hover:text-indigo-500 transition-colors">
                                                    <Clock size={18} strokeWidth={1.5} />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium block" style={{ color: 'var(--color-text-primary)' }}>Clear Clipboard After</label>
                                                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Automatically clear copied passwords</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2 ml-9">
                                                {[
                                                    { label: 'Never', value: 0, icon: '∞' },
                                                    { label: '10s', value: 10, icon: '10' },
                                                    { label: '30s', value: 30, icon: '30' },
                                                    { label: '1m', value: 60, icon: '60' },
                                                    { label: '2m', value: 120, icon: '120' },
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => updateSetting('security', 'clipboardClearDelay', option.value)}
                                                        className={`relative px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${settings.security?.clipboardClearDelay === option.value
                                                            ? 'bg-indigo-600 text-white shadow-md scale-105'
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                                            }`}
                                                        style={
                                                            settings.security?.clipboardClearDelay !== option.value
                                                                ? { backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }
                                                                : {}
                                                        }
                                                    >
                                                        <div className="text-base font-bold mb-0.5">{option.icon}</div>
                                                        <div className="text-[10px] opacity-90">{option.label}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <Toggle
                                            label="Clear on Lock"
                                            icon={Lock}
                                            description="Clear clipboard when the database is locked"
                                            checked={settings.security.clearClipboardOnLock}
                                            onChange={(v) => updateSetting('security', 'clearClipboardOnLock', v)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: 'var(--color-text-secondary)' }}>Auto-Lock</h3>
                                    <div className="rounded-xl border shadow-sm divide-y px-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                        <Select
                                            label="Lock on Inactivity"
                                            icon={Clock}
                                            value={String(settings.security.lockOnInactivity)}
                                            onChange={(v) => updateSetting('security', 'lockOnInactivity', parseInt(v))}
                                            options={[0, 60, 300, 600, 1800, 3600].map(n => ({ label: n === 0 ? 'Never' : `${n / 60} minutes`, value: String(n) }))}
                                        />
                                        <Select
                                            label="Lock in Background"
                                            icon={Eye}
                                            value={String(settings.security.lockOnBackgroundDelay)}
                                            onChange={(v) => updateSetting('security', 'lockOnBackgroundDelay', parseInt(v))}
                                            options={[0, 1, 10, 30, 60, 300].map(n => ({ label: n === 0 ? 'Never' : (n === 1 ? 'Immediately' : `${n} seconds`), value: String(n) }))}
                                        />
                                        <Toggle
                                            label="Lock on Window Close"
                                            icon={XCircle}
                                            checked={settings.security.lockOnWindowClose}
                                            onChange={(v) => updateSetting('security', 'lockOnWindowClose', v)}
                                        />
                                        <Toggle
                                            label="Lock on Database Switch"
                                            icon={Settings}
                                            checked={settings.security.lockOnSwitchDatabase}
                                            onChange={(v) => updateSetting('security', 'lockOnSwitchDatabase', v)}
                                        />
                                        <Toggle
                                            label="Lock on System Sleep"
                                            icon={Power}
                                            description="Lock when computer sleeps or screensaver starts"
                                            checked={settings.security.lockOnSystemSleep}
                                            onChange={(v) => updateSetting('security', 'lockOnSystemSleep', v)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 px-1" style={{ color: 'var(--color-text-secondary)' }}>Advanced</h3>
                                    <div className="rounded-xl border shadow-sm divide-y px-4" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                        <Toggle
                                            label="Quick Unlock (Touch ID)"
                                            icon={Fingerprint}
                                            description="Use Touch ID or Apple Watch to unlock"
                                            checked={settings.security.quickUnlockTouchId}
                                            onChange={(v) => updateSetting('security', 'quickUnlockTouchId', v)}
                                        />
                                        <div className="opacity-50 pointer-events-none">
                                            <Toggle
                                                label="Remember Key Files"
                                                icon={Save}
                                                description="Securely store key file locations (Disabled)"
                                                checked={false}
                                                onChange={() => { }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'browser' && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-300 py-12">
                                <div className="p-6 rounded-full" style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                                    <Globe size={64} strokeWidth={1.5} />
                                </div>
                                <div className="max-w-sm">
                                    <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Browser Integration</h4>
                                    <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                        Connect KeedaVault with Chrome, Safari, and Firefox to autofill passwords seamlessly.
                                    </p>
                                </div>
                                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm" style={{ backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                                    Coming Soon
                                </span>
                            </div>
                        )}

                        {activeTab === 'ssh' && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-300 py-12">
                                <div className="p-6 rounded-full" style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
                                    <Terminal size={64} strokeWidth={1.5} />
                                </div>
                                <div className="max-w-sm">
                                    <h4 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>SSH Agent</h4>
                                    <p className="leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                        Use KeedaVault as your system SSH agent to manage SSH keys securely.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2 px-5 py-2.5 rounded-xl border shadow-sm" style={{ color: '#d97706', backgroundColor: '#fef3c7', borderColor: '#fde68a' }}>
                                    <Shield size={18} strokeWidth={1.5} />
                                    <span className="font-medium">Feature disabled for now</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};
