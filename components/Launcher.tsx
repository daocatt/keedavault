import React, { useState, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { open, message } from '@tauri-apps/plugin-dialog';
import { exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { formatDistanceToNow } from 'date-fns';
import { getRecentVaults, saveRecentVault, SavedVaultInfo, removeRecentVault } from '../services/storageService';
import { HardDrive, Plus, FolderOpen, Clock, ShieldCheck, X } from 'lucide-react';
import appIcon from '../app-icon.png';
import { FlowBackground } from './FlowBackground';

import { settingsStore } from '../services/settingsStore';
import { getUISettings } from '../services/uiSettingsService';
import { listen } from '@tauri-apps/api/event';

export const Launcher: React.FC = () => {
    const [recentVaults, setRecentVaults] = useState<SavedVaultInfo[]>([]);
    const [recentCount, setRecentCount] = useState(5);
    const [isOpening, setIsOpening] = useState(false);

    useEffect(() => {
        const fetchAndSetVaults = async () => {
            const vaults = await getRecentVaults();
            setRecentVaults(vaults);

            const settings = await getUISettings();
            if (settings?.general?.recentFileCount) {
                setRecentCount(settings.general.recentFileCount);
            }
        };
        fetchAndSetVaults();

        const unlisten = listen('settings-changed', (event: any) => {
            if (event.payload?.general?.recentFileCount) {
                setRecentCount(event.payload.general.recentFileCount);
            }
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);



    useEffect(() => {
        const win = getCurrentWebviewWindow();
        win.setTitle('KeedaVault - Home');

        // Ensure window is visible (important when showing from hidden state)
        setTimeout(async () => {
            const isVisible = await win.isVisible();
            if (!isVisible) {
                await win.show();
                await win.setFocus();
            }
        }, 50);
    }, []);

    const openVaultWindow = async (path?: string, action: 'unlock' | 'create' = 'unlock'): Promise<boolean> => {

        // Check if we're running in Tauri
        // @ts-ignore
        if (typeof window.__TAURI__ === 'undefined') {
            console.error('❌ Not running in Tauri environment - cannot create windows');
            alert('This feature requires running the app with "npm run tauri dev"');
            return false;
        }

        let label: string;

        if (path) {
            // Simple hash for deterministic label
            let hash = 0;
            for (let i = 0; i < path.length; i++) {
                const char = path.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            label = `vault-${Math.abs(hash)}`;
        } else {
            label = `vault-${Date.now()}`;
        }



        // Try to get and close any existing window with this label
        try {
            const existingWindow = await WebviewWindow.getByLabel(label);
            if (existingWindow) {
                await existingWindow.close();
                // Wait for window to be destroyed
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (e) {
            // Window doesn't exist, which is fine
        }

        const mode = action === 'create' ? 'create' : 'auth';
        const url = `/?mode=${mode}&action=${action}${path ? `&path=${encodeURIComponent(path)}` : ''}`

        let initialTitle = 'KeedaVault';
        if (action === 'create') {
            initialTitle = 'KeedaVault - New Vault';
        } else if (action === 'unlock') {
            if (path) {
                const filename = path.split(/[/\\]/).pop() || 'Database';
                initialTitle = `${filename} - Unlock`;
            } else {
                initialTitle = 'KeedaVault - Unlock';
            }
        }

        try {
            const webview = new WebviewWindow(label, {
                url,
                title: initialTitle,
                width: 500,
                height: 640,
                minWidth: 500,
                minHeight: 600,
                center: true,
                resizable: false,
                hiddenTitle: true,
                titleBarStyle: 'overlay',
                visible: false, // Start hidden to prevent flash
            });

            // Don't show window here - let App.tsx show it after theme is applied
            // This prevents flash of wrong background color

            // Set a timeout in case the created event doesn't fire
            const createdTimeout = setTimeout(() => {
                console.warn('⚠️ Window creation timeout - hiding launcher');
                getCurrentWebviewWindow().hide().catch(e => console.error('Failed to hide launcher:', e));
            }, 2000);

            webview.once('tauri://created', async function () {
                clearTimeout(createdTimeout);


                // Hide the launcher window instead of closing it
                // This keeps the app running if the vault window is closed
                setTimeout(() => {
                    getCurrentWebviewWindow().hide();
                }, 100);
            });

            webview.once('tauri://error', function (e: any) {
                clearTimeout(createdTimeout);
            });

            return true;
        } catch (e) {
            console.error("❌ Failed to open window:", e);
            return false;
        }
    };

    const handleOpenRecent = async (vault: SavedVaultInfo) => {
        if (isOpening) {
            console.log('⏸️ Already opening a vault, ignoring click');
            return;
        }

        try {
            setIsOpening(true);

            if (!vault.path) {
                console.error('❌ No path in vault info');
                await message(
                    `Invalid vault path. The entry may be corrupted.`,
                    { title: 'Invalid Vault', kind: 'error' }
                );
                await removeRecentVault(vault.path || '', vault.filename);
                setRecentVaults(await getRecentVaults());
                setIsOpening(false);
                return;
            }

            const fileExists = await exists(vault.path);

            if (!fileExists) {
                console.error('❌ File not found:', vault.path);
                await message(
                    `The file "${vault.path}" no longer exists.\nIt may have been moved or deleted.`,
                    { title: 'File Not Found', kind: 'error' }
                );
                setIsOpening(false);
                // removeRecentVault(vault.path, vault.filename);
                // setRecentVaults(getRecentVaults());
                return;
            }

            await saveRecentVault({ ...vault, lastOpened: Date.now() });
            // Don't update the list here - it will update when the launcher reopens
            const success = await openVaultWindow(vault.path, 'unlock');

            if (!success) {
                setIsOpening(false);
                await message('Failed to open vault window', { title: 'Error', kind: 'error' });
            } else {
                // Reset opening state after a brief delay in case window doesn't close
                // This prevents the UI from staying stuck if the launcher window somehow stays open
                setTimeout(() => {
                    setIsOpening(false);
                }, 2000);
            }
        } catch (e) {
            console.error("❌ Error in handleOpenRecent:", e);
            setIsOpening(false);
            await message(
                `Error accessing file: ${e}`,
                { title: 'Error', kind: 'error' }
            );
        }
    };

    const handleCreateNew = () => {
        openVaultWindow(undefined, 'create');
    };

    useEffect(() => {
        // Listen for open-file-picker event from menu
        const unlistenOpen = getCurrentWebviewWindow().listen('open-file-picker', () => {
            handleBrowse();
        });

        // Listen for create-new-vault event from menu
        const unlistenCreate = getCurrentWebviewWindow().listen('create-new-vault', () => {
            handleCreateNew();
        });

        // Check URL params for auto-browse action
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');

        if (action === 'browse') {
            // Auto-trigger file browse after a short delay
            setTimeout(() => handleBrowse(), 300);
        }

        return () => {
            unlistenOpen.then(f => f());
            unlistenCreate.then(f => f());
        };
    }, []);

    const handleBrowse = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'KDBX Database',
                    extensions: ['kdbx', 'kdb']
                }]
            });

            if (selected && typeof selected === 'string') {
                const filename = selected.split(/[/\\]/).pop() || selected;
                const vaultInfo = {
                    path: selected,
                    filename: filename,
                    lastOpened: Date.now()
                };
                await saveRecentVault(vaultInfo);
                setRecentVaults(await getRecentVaults());
                openVaultWindow(selected, 'unlock');
            }
        } catch (e) {
            console.error("Failed to browse", e);
        }
    };

    const handleRemoveRecent = async (e: React.MouseEvent, vault: SavedVaultInfo) => {
        e.stopPropagation();
        await removeRecentVault(vault.path, vault.filename);
        setRecentVaults(await getRecentVaults());
    };

    const handleReveal = async (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        try {
            await invoke('reveal_in_finder', { path });
        } catch (error) {
            console.error('Failed to reveal in finder:', error);
        }
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden flex-col relative" style={{ backgroundColor: 'var(--color-bg-secondary)' }} onContextMenu={(e) => e.preventDefault()}>
            <FlowBackground />

            {/* Draggable Top Region - Increased height for better UX */}
            <div
                className="absolute top-0 left-0 w-full h-20 z-50"
                style={{ userSelect: 'none' }}
                onMouseDown={(e) => {
                    if (e.button === 0) { // Only left click
                        e.preventDefault(); // Prevent text selection
                        getCurrentWebviewWindow().startDragging();
                    }
                }}
            />

            {/* Main Content - Left-Right Layout */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-8 relative z-10" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <div className="w-full max-w-5xl flex items-center gap-12">

                    {/* Left Side - Logo and Subtitle */}
                    <div className="flex-shrink-0 flex flex-col items-start max-w-xs">
                        <div className="w-16 h-16 flex items-center justify-center mb-4 bg-transparent">
                            <img src={appIcon} alt="KeedaVault Logo" className="w-full h-full object-contain" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)' }}>KeedaVault</h1>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            Secure, local, and private password manager.
                            <br />Open a database to get started.
                        </p>
                    </div>

                    {/* Right Side - Recent Databases and Actions */}
                    <div className="flex-1 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border-light)' }}>

                        {/* Recent Files Section */}
                        <div className="p-5" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                                <div className="flex items-center">
                                    <Clock size={12} className="mr-1.5" />
                                    Recent Databases
                                </div>

                            </div>

                            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                {recentVaults.length === 0 ? (
                                    <div className="text-sm italic py-6 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                                        No recent files found.
                                    </div>
                                ) : (
                                    recentVaults.slice(0, recentCount).map((vault, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                handleOpenRecent(vault);
                                            }}
                                            disabled={isOpening}
                                            className="w-full text-left px-3 py-2 rounded-lg transition-all flex items-center group relative"
                                            style={{
                                                backgroundColor: 'var(--color-bg-primary)',
                                                border: '1px solid var(--color-border-light)',
                                                opacity: isOpening ? 0.5 : 1,
                                                cursor: isOpening ? 'wait' : 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                                                e.currentTarget.style.borderColor = 'var(--color-accent)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
                                                e.currentTarget.style.borderColor = 'var(--color-border-light)';
                                            }}
                                            title={`${vault.filename}\n${vault.path}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-colors flex-shrink-0" style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', pointerEvents: 'none' }}>
                                                <HardDrive size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0" style={{ pointerEvents: 'none' }}>
                                                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{vault.filename}</div>
                                                <div className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                                                    Opened {formatDistanceToNow(vault.lastOpened, { addSuffix: true })}
                                                </div>
                                            </div>

                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div
                                                    role="button"
                                                    onClick={(e) => handleReveal(e, vault.path || '')}
                                                    className="p-1.5 rounded-md mr-1"
                                                    style={{ color: 'var(--color-text-tertiary)' }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                                        e.currentTarget.style.color = 'var(--color-text-primary)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                                    }}
                                                    title="Reveal in Finder"
                                                >
                                                    <FolderOpen size={14} />
                                                </div>
                                                <div
                                                    role="button"
                                                    onClick={(e) => handleRemoveRecent(e, vault)}
                                                    className="p-1.5 rounded-md"
                                                    style={{ color: 'var(--color-text-tertiary)' }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = '#fee2e2';
                                                        e.currentTarget.style.color = '#dc2626';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                                    }}
                                                    title="Remove from recent"
                                                >
                                                    <X size={14} />
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Action Buttons Section */}
                        <div className="p-5 flex flex-col gap-2" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                            <div className="flex items-center text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                Quick Actions
                            </div>

                            <button
                                onClick={handleCreateNew}
                                className="w-full py-2 px-3 rounded-lg flex items-center justify-center transition-all text-sm font-medium"
                                style={{
                                    backgroundColor: 'var(--color-accent)',
                                    color: 'white',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                            >
                                <Plus size={16} className="mr-2" />
                                Create New Vault
                            </button>

                            <button
                                onClick={handleBrowse}
                                className="w-full py-2 px-3 rounded-lg flex items-center justify-center transition-all text-sm font-medium"
                                style={{
                                    backgroundColor: 'var(--color-bg-primary)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border-medium)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'}
                            >
                                <FolderOpen size={16} className="mr-2" style={{ color: 'var(--color-text-secondary)' }} />
                                Open File...
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px]" style={{ color: 'var(--color-text-placeholder)' }}>
                <p>KeedaVault v0.1.0 • Local Storage Only</p>
            </div>
        </div>
    );
};
