import React from 'react';
import { X, Database, Folder, File, Calendar, HardDrive } from 'lucide-react';
import { Vault } from '../types';
import { format } from 'date-fns';

interface DatabasePropertiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    vault: Vault;
    stats: { totalFolders: number; totalEntries: number };
}

export const DatabasePropertiesModal: React.FC<DatabasePropertiesModalProps> = ({ isOpen, onClose, vault, stats }) => {
    if (!isOpen) return null;

    const handleRevealInFinder = async () => {
        if (vault.path) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('reveal_in_finder', { path: vault.path });
            } catch (e) {
                console.error("Failed to open path", e);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                        <Database size={16} className="mr-2 text-indigo-600" />
                        Database Properties
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Info */}
                    <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <Database size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 truncate">{vault.name}</h2>
                            <p className="text-xs text-gray-500 font-mono truncate mt-1" title={vault.path}>{vault.path || 'In-memory / Unknown path'}</p>
                            {vault.path && (
                                <button
                                    onClick={handleRevealInFinder}
                                    className="text-[10px] text-indigo-600 hover:underline mt-1 flex items-center cursor-pointer"
                                >
                                    <Folder size={10} className="mr-1" />
                                    Reveal in Finder
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1 flex items-center">
                                <Folder size={12} className="mr-1.5" /> Groups
                            </div>
                            <div className="text-xl font-bold text-gray-900">{stats.totalFolders}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 mb-1 flex items-center">
                                <File size={12} className="mr-1.5" /> Entries
                            </div>
                            <div className="text-xl font-bold text-gray-900">{stats.totalEntries}</div>
                        </div>
                    </div>

                    {/* Details List */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-500 flex items-center"><Calendar size={14} className="mr-2" /> Created</span>
                            <span className="font-mono text-gray-700">
                                {vault.db.getDefaultGroup()?.times?.creationTime ? format(vault.db.getDefaultGroup()!.times.creationTime as Date, 'PP pp') : 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-500 flex items-center"><HardDrive size={14} className="mr-2" /> Format</span>
                            <span className="font-mono text-gray-700">KDBX 4.x</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
