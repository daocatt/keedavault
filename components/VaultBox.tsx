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
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Recent</span>
                    </div>
                    <div className="space-y-0.5">
                        {recentVaults.map((vault, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleQuickOpen(vault)}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200/50 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center mr-3 border border-gray-200 shadow-sm group-hover:border-blue-200 group-hover:shadow-blue-100 transition-all">
                                        <HardDrive size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900 truncate transition-colors">
                                            {vault.filename}
                                        </div>
                                        {vault.path && (
                                            <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{vault.path}</div>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</span>
                </div>

                <button
                    onClick={onBrowseFile}
                    className="w-full group relative overflow-hidden rounded-xl bg-white border border-gray-200 p-4 hover:border-blue-400 hover:ring-4 hover:ring-blue-50 transition-all duration-200 text-left"
                >
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3 text-blue-500 group-hover:scale-110 transition-transform duration-200">
                            <FolderOpen size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Open Database</div>
                            <div className="text-xs text-gray-500 mt-0.5">Browse local files...</div>
                        </div>
                        <div className="ml-auto">
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                </button>

                <button
                    onClick={onCreateNew}
                    className="w-full group relative overflow-hidden rounded-xl bg-white border border-gray-200 p-4 hover:border-green-400 hover:ring-4 hover:ring-green-50 transition-all duration-200 text-left"
                >
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mr-3 text-green-600 group-hover:scale-110 transition-transform duration-200">
                            <Plus size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-900">Create New Vault</div>
                            <div className="text-xs text-gray-500 mt-0.5">Start fresh with a new database</div>
                        </div>
                        <div className="ml-auto">
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};
