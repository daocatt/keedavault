import React, { useState, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/window';
import { open, message } from '@tauri-apps/api/dialog';
import { exists } from '@tauri-apps/api/fs';
import { getRecentVaults, saveRecentVault, SavedVaultInfo, removeRecentVault } from '../services/storageService';
import { HardDrive, Plus, FolderOpen, Clock, ShieldCheck, X } from 'lucide-react';
import appIcon from '../app-icon.png';

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
                center: true,
                resizable: true,
            });

            webview.once('tauri://created', function () {
                // webview window successfully created
                console.log("Window created successfully");
            });

            webview.once('tauri://error', function (e: any) {
                // an error happened creating the webview window
                console.error("Window creation error:", e);
            });
        } catch (e) {
            console.error("Failed to open window", e);
        }
    };

    const handleOpenRecent = async (vault: SavedVaultInfo) => {
        try {
            // Validate that path exists
            if (!vault.path) {
                await message(
                    `Invalid vault path. The entry may be corrupted.`,
                    { title: 'Invalid Vault', type: 'error' }
                );
                removeRecentVault(vault.path || '', vault.filename);
                setRecentVaults(getRecentVaults());
                return;
            }

            // Check if the file exists
            const fileExists = await exists(vault.path);
            if (!fileExists) {
                await message(
                    `The file "${vault.path}" no longer exists.\nIt may have been moved or deleted.`,
                    { title: 'File Not Found', type: 'error' }
                );
                // Remove from recent list since the file doesn't exist
                removeRecentVault(vault.path, vault.filename);
                setRecentVaults(getRecentVaults());
                return;
            }

            // Update timestamp
            saveRecentVault({ ...vault, lastOpened: Date.now() });
            setRecentVaults(getRecentVaults()); // Refresh list
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

    const removeRecent = (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        // We need a service method to remove, but for now we can just filter and save back
        // Assuming storageService exposes a way or we just overwrite. 
        // Since getRecentVaults returns a copy, we can modify and save? 
        // Actually storageService doesn't have a 'remove' yet. 
        // We will implement a simple remove locally for now or add it to service later.
        // For now, let's just ignore the remove requirement or implement it if needed.
        // The user didn't explicitly ask for "remove from recent" in this prompt, 
        // but "Manage" implies it. Let's skip for this exact step to keep it simple.
    };

    const handleRemoveRecent = (e: React.MouseEvent, vault: SavedVaultInfo) => {
        e.stopPropagation();
        removeRecentVault(vault.path, vault.filename);
        setRecentVaults(getRecentVaults());
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 flex-col relative" onContextMenu={(e) => e.preventDefault()}>
            {/* macOS Title Bar with drag region */}
            <div
                className="h-12 bg-gray-50/80 backdrop-blur-sm flex items-center px-4 flex-shrink-0"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                data-tauri-drag-region
            >
                <div className="flex-1 flex items-center justify-center pointer-events-none">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" />
                    <span className="font-semibold text-sm text-gray-700 tracking-tight">KeedaVault</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-auto">
                <div className="w-full max-w-2xl p-8 flex flex-col items-center">

                    {/* Header */}
                    <div className="mb-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/10 p-4">
                            <img src={appIcon} alt="KeedaVault Logo" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-gray-500 text-center max-w-md">
                            Secure, local, and private password manager.
                            <br />Open a database to get started.
                        </p>
                    </div>

                    {/* Actions Card - Vertical Layout */}
                    <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">

                        {/* Recent Files Section */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                                <Clock size={12} className="mr-1.5" />
                                Recent Databases
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {recentVaults.length === 0 ? (
                                    <div className="text-sm text-gray-400 italic py-4 text-center">
                                        No recent files found.
                                    </div>
                                ) : (
                                    recentVaults.map((vault, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleOpenRecent(vault)}
                                            className="w-full text-left px-3 py-3 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl transition-all flex items-center group relative"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center mr-3 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                <HardDrive size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold text-gray-900 truncate">{vault.filename}</div>
                                                <div className="text-xs text-gray-400 truncate">{vault.path}</div>
                                            </div>
                                            <button
                                                onClick={(e) => handleRemoveRecent(e, vault)}
                                                className="ml-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove from recent"
                                            >
                                                <X size={14} />
                                            </button>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Action Buttons Section */}
                        <div className="w-full p-6 flex flex-col space-y-3 bg-white">
                            <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                Quick Actions
                            </div>

                            <button
                                onClick={handleCreateNew}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md shadow-indigo-500/20 flex items-center justify-center transition-all active:scale-95"
                            >
                                <Plus size={16} className="mr-2" />
                                <span className="font-medium text-sm">Create New Vault</span>
                            </button>

                            <button
                                onClick={handleBrowse}
                                className="w-full py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg flex items-center justify-center transition-all active:scale-95"
                            >
                                <FolderOpen size={16} className="mr-2 text-gray-500" />
                                <span className="font-medium text-sm">Open File...</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-[10px] text-gray-300">
                        <p>KeedaVault v0.1.0 • Local Storage Only</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
