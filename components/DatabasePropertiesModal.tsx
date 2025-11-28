import React, { useState, useEffect } from 'react';
import { X, Database, Folder, File, Calendar, HardDrive, Shield, Globe, Key, Lock, Save, RefreshCw } from 'lucide-react';
import { Vault } from '../types';
import { format } from 'date-fns';
import { useVault } from '../context/VaultContext';
import * as kdbxweb from 'kdbxweb';

interface DatabasePropertiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    vault: Vault;
    stats: { totalFolders: number; totalEntries: number };
    onChangeCredentials?: () => void;
}

type Tab = 'general' | 'security' | 'browser';

export const DatabasePropertiesModal: React.FC<DatabasePropertiesModalProps> = ({ isOpen, onClose, vault, stats, onChangeCredentials }) => {
    const { saveVault, refreshVault } = useVault();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [dbName, setDbName] = useState('');
    const [dbDesc, setDbDesc] = useState('');
    const [dbUser, setDbUser] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && vault) {
            setDbName(vault.db.meta.name || vault.name || '');
            setDbDesc(vault.db.meta.description || '');
            setDbUser(vault.db.meta.defaultUserName || '');
            setActiveTab('general');
        }
    }, [isOpen, vault]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update DB Meta
            vault.db.meta.name = dbName;
            vault.db.meta.description = dbDesc;
            vault.db.meta.defaultUserName = dbUser;

            // Update Vault object name if it changed
            if (dbName && dbName !== vault.name) {
                vault.name = dbName;
            }

            // Mark as modified
            vault.db.meta.nameChanged = new Date();
            vault.db.meta.descriptionChanged = new Date();
            vault.db.meta.defaultUserNameChanged = new Date();

            await saveVault(vault.id);
            refreshVault(vault.id);
            onClose();
        } catch (e) {
            console.error("Failed to save database properties", e);
        } finally {
            setIsSaving(false);
        }
    };

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Database size={20} className="mr-2 text-indigo-600" />
                        Database Settings
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                    <button
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('security')}
                    >
                        Security
                    </button>
                    <button
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'browser' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('browser')}
                    >
                        Browser Integration
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Metadata Section */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                                        <input
                                            type="text"
                                            value={dbName}
                                            onChange={(e) => setDbName(e.target.value)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                            placeholder="My Database"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Username</label>
                                        <input
                                            type="text"
                                            value={dbUser}
                                            onChange={(e) => setDbUser(e.target.value)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                            placeholder="jdoe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={dbDesc}
                                        onChange={(e) => setDbDesc(e.target.value)}
                                        rows={4}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm resize-none"
                                        placeholder="Database description..."
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Database Metadata</h4>
                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 flex items-center"><HardDrive size={14} className="mr-2" /> File Path</span>
                                        <div className="flex items-center">
                                            <span className="font-mono text-gray-700 truncate max-w-[200px]" title={vault.path}>{vault.path || 'In-memory'}</span>
                                            {vault.path && (
                                                <button onClick={handleRevealInFinder} className="ml-2 text-indigo-600 hover:text-indigo-800">
                                                    <Folder size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 flex items-center"><Calendar size={14} className="mr-2" /> Created</span>
                                        <span className="font-mono text-gray-700">
                                            {vault.db.getDefaultGroup()?.times?.creationTime ? format(vault.db.getDefaultGroup()!.times.creationTime as Date, 'PP pp') : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 flex items-center"><Folder size={14} className="mr-2" /> Groups</span>
                                        <span className="font-mono text-gray-700">{stats.totalFolders}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 flex items-center"><File size={14} className="mr-2" /> Entries</span>
                                        <span className="font-mono text-gray-700">{stats.totalEntries}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                                            <Key size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-semibold text-gray-900">Database Credentials</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Change the master password or key file used to unlock this database.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onChangeCredentials}
                                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                    >
                                        Change Credentials
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                                <div className="flex items-start space-x-4">
                                    <div className="p-3 bg-green-50 rounded-lg text-green-600">
                                        <Lock size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-base font-semibold text-gray-900">Encryption Settings</h4>
                                        <p className="text-sm text-gray-500 mt-1 mb-4">
                                            Information about the encryption standards used by this database.
                                        </p>

                                        <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Database Format</span>
                                                    <span className="font-medium text-gray-900">KDBX 4.0</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Encryption Algorithm</span>
                                                    <span className="font-medium text-gray-900">AES-256 (ChaCha20)</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Key Derivation</span>
                                                    <span className="font-medium text-gray-900">Argon2d</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block mb-1">Compression</span>
                                                    <span className="font-medium text-gray-900">GZip</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 italic">
                                            Encryption settings are currently read-only.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'browser' && (
                        <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                            <div className="p-4 bg-gray-100 rounded-full text-gray-400">
                                <Globe size={48} />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900">Browser Integration</h4>
                                <p className="text-gray-500 mt-1">Connect KeedaVault with your favorite browser.</p>
                            </div>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium uppercase tracking-wide">
                                Coming Soon
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <RefreshCw size={16} className="animate-spin mr-2" />
                        ) : (
                            <Save size={16} className="mr-2" />
                        )}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
