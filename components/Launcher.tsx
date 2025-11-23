import React, { useState, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/window';
import { open, message } from '@tauri-apps/api/dialog';
import { exists } from '@tauri-apps/api/fs';
import { getRecentVaults, saveRecentVault, SavedVaultInfo, removeRecentVault } from '../services/storageService';
import { HardDrive, Plus, FolderOpen, Clock, ShieldCheck, X } from 'lucide-react';
import appIcon from '../app-icon.png';
import { FlowBackground } from './FlowBackground';

export const Launcher: React.FC = () => {
    const [recentVaults, setRecentVaults] = useState<SavedVaultInfo[]>([]);

    useEffect(() => {
        setRecentVaults(getRecentVaults());
    }, []);

    const openVaultWindow = async (path?: string, action: 'unlock' | 'create' = 'unlock') => {
        const label = `vault-${Date.now()}`;
        const url = `index.html?mode=vault&action=${action}${path ? `&path=${encodeURIComponent(path)}` : ''}`;

        try {
            const webview = new WebviewWindow(label, {
                url,
                title: 'KeedaVault',
                width: 960,
                height: 640,
                minWidth: 800,
                minHeight: 600,
                center: true,
                resizable: true,
                hiddenTitle: true,
                titleBarStyle: 'overlay',
            });

            webview.once('tauri://created', function () {
                console.log("Window created successfully");
            });

            webview.once('tauri://error', function (e: any) {
                console.error("Window creation error:", e);
            });
        } catch (e) {
            console.error("Failed to open window", e);
        }
    };

    const handleOpenRecent = async (vault: SavedVaultInfo) => {
        try {
            if (!vault.path) {
                await message(
                    `Invalid vault path. The entry may be corrupted.`,
                    { title: 'Invalid Vault', type: 'error' }
                );
                removeRecentVault(vault.path || '', vault.filename);
                setRecentVaults(getRecentVaults());
                return;
            }

            const fileExists = await exists(vault.path);
            if (!fileExists) {
                await message(
                    `The file "${vault.path}" no longer exists.\nIt may have been moved or deleted.`,
                    { title: 'File Not Found', type: 'error' }
                );
                removeRecentVault(vault.path, vault.filename);
                setRecentVaults(getRecentVaults());
                return;
            }

            saveRecentVault({ ...vault, lastOpened: Date.now() });
            setRecentVaults(getRecentVaults());
            openVaultWindow(vault.path, 'unlock');
        } catch (e) {
            console.error("Error checking file or opening vault", e);
            await message(
                `Error accessing file: ${e}`,
                { title: 'Error', type: 'error' }
            );
        }
    };

    const handleCreateNew = () => {
        openVaultWindow(undefined, 'create');
    };

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
                saveRecentVault(vaultInfo);
                setRecentVaults(getRecentVaults());
                openVaultWindow(selected, 'unlock');
            }
        } catch (e) {
            console.error("Failed to browse", e);
        }
    };

    const handleRemoveRecent = (e: React.MouseEvent, vault: SavedVaultInfo) => {
        e.stopPropagation();
        removeRecentVault(vault.path, vault.filename);
        setRecentVaults(getRecentVaults());
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden flex-col relative" style={{ backgroundColor: 'var(--color-bg-secondary)' }} onContextMenu={(e) => e.preventDefault()}>
            <FlowBackground />

            {/* macOS Unified Toolbar - Fusion Style with Extended Drag Region */}
            {/* Draggable Top Region */}
            <div
                className="absolute top-0 left-0 w-full h-12 z-50"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                data-tauri-drag-region
            />

            {/* Main Content - Left-Right Layout */}
            <div className="flex-1 flex items-center justify-center overflow-hidden p-8 relative z-10">
                <div className="w-full max-w-5xl flex items-center gap-12">

                    {/* Left Side - Logo and Subtitle */}
                    <div className="flex-shrink-0 flex flex-col items-start max-w-xs">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 p-3" style={{ backgroundColor: 'var(--color-bg-primary)', boxShadow: 'var(--shadow-lg)' }}>
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
                            <div className="flex items-center text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                                <Clock size={12} className="mr-1.5" />
                                Recent Databases
                            </div>

                            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                                {recentVaults.length === 0 ? (
                                    <div className="text-sm italic py-6 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                                        No recent files found.
                                    </div>
                                ) : (
                                    recentVaults.map((vault, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleOpenRecent(vault)}
                                            className="w-full text-left px-3 py-2 rounded-lg transition-all flex items-center group relative"
                                            style={{
                                                backgroundColor: 'var(--color-bg-primary)',
                                                border: '1px solid var(--color-border-light)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--color-accent-light)';
                                                e.currentTarget.style.borderColor = 'var(--color-accent)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)';
                                                e.currentTarget.style.borderColor = 'var(--color-border-light)';
                                            }}
                                        >
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2.5 transition-colors" style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
                                                <HardDrive size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{vault.filename}</div>
                                                <div className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>{vault.path}</div>
                                            </div>
                                            <button
                                                onClick={(e) => handleRemoveRecent(e, vault)}
                                                className="ml-2 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100"
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
                                                <X size={12} />
                                            </button>
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
