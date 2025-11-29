import React, { useState, useEffect } from 'react';
import { getRecentVaults, SavedVaultInfo } from '../services/storageService';
import { HardDrive, Plus, FolderOpen, ChevronRight } from 'lucide-react';
import { fileSystem } from '../services/fileSystemAdapter';

interface VaultBoxProps {
    onOpenVault: (vaultInfo: SavedVaultInfo) => void;
    onCreateNew: () => void;
    onBrowseFile: () => void;
}

export const VaultBox: React.FC<VaultBoxProps> = ({ onOpenVault, onCreateNew, onBrowseFile }) => {
    const [recentVaults, setRecentVaults] = useState<SavedVaultInfo[]>([]);

    useEffect(() => {
        const load = async () => {
            setRecentVaults(await getRecentVaults());
        };
        load();
    }, []);

    const handleQuickOpen = (vault: SavedVaultInfo) => {
        onOpenVault(vault);
    };

    return (
        <div className="w-full space-y-6">
            {/* Recent Vaults List */}
            {recentVaults.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                    <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Recent</span>
                    </div>
                    <div className="space-y-0.5">
                        {recentVaults.map((vault, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleQuickOpen(vault)}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center min-w-0">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 border shadow-sm group-hover:border-blue-200 group-hover:shadow-blue-100 transition-all"
                                        style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                        <HardDrive size={14} className="group-hover:text-blue-500 transition-colors" style={{ color: 'var(--color-text-tertiary)' }} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-medium group-hover:text-gray-900 dark:group-hover:text-white truncate transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                                            {vault.filename}
                                        </div>
                                        {vault.path && (
                                            <div className="text-[10px] truncate max-w-[180px]" style={{ color: 'var(--color-text-secondary)' }}>{vault.path}</div>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={14} className="group-hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100" style={{ color: 'var(--color-text-tertiary)' }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Quick Actions</span>
                </div>

                <button
                    onClick={onBrowseFile}
                    className="w-full group relative overflow-hidden rounded-xl border p-4 hover:border-blue-400 hover:ring-4 hover:ring-blue-50 dark:hover:ring-blue-900/20 transition-all duration-200 text-left"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
                >
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 text-blue-500 group-hover:scale-110 transition-transform duration-200"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                            <FolderOpen size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Open Database</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Browse local files...</div>
                        </div>
                        <div className="ml-auto">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all"
                                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                </button>

                <button
                    onClick={onCreateNew}
                    className="w-full group relative overflow-hidden rounded-xl border p-4 hover:border-green-400 hover:ring-4 hover:ring-green-50 dark:hover:ring-green-900/20 transition-all duration-200 text-left"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
                >
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 text-green-600 group-hover:scale-110 transition-transform duration-200"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                            <Plus size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create New Vault</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Start fresh with a new database</div>
                        </div>
                        <div className="ml-auto">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all"
                                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};
