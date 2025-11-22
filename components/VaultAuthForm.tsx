import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { Upload, Lock, Key, FileKey, AlertCircle, PlusCircle, HardDrive, X, Clock } from 'lucide-react';
import { FileSystemFileHandle } from '../types';
import { getRecentVaults, SavedVaultInfo } from '../services/storageService';
import { fileSystem, FileHandle } from '../services/fileSystemAdapter';

interface VaultAuthFormProps {
    onSuccess?: () => void;
    className?: string;
    hideHeader?: boolean;
    initialMode?: 'open' | 'create';
    allowModeSwitch?: boolean; // New prop to control mode switching
}

export const VaultAuthForm: React.FC<VaultAuthFormProps & { initialVaultInfo?: SavedVaultInfo }> = ({ onSuccess, className = '', hideHeader = false, initialVaultInfo, initialMode = 'open', allowModeSwitch = true }) => {
    // existing state declarations ...
    // after existing useState declarations, add:
    useEffect(() => {
        if (initialVaultInfo?.path) {
            setPath(initialVaultInfo.path);
            // Create a dummy file for display purposes so the UI shows the filename
            setFile(new File([], initialVaultInfo.filename));
            setFileHandle(null);
            clearError();
        }
    }, [initialVaultInfo]);
    // rest of component unchanged

    const [mode, setMode] = useState<'open' | 'create'>(initialMode);
    const [recentVaults, setRecentVaults] = useState<SavedVaultInfo[]>([]);

    // Open State
    const [file, setFile] = useState<File | null>(null);
    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
    const [path, setPath] = useState<string | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Create State
    const [newName, setNewName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const { addVault, createVault, isUnlocking, unlockError, clearError } = useVault();

    // Sync mode with initialMode prop
    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

    // Load recent vaults on mount
    useEffect(() => {
        setRecentVaults(getRecentVaults());
    }, []);

    const resetForm = () => {
        setFile(null);
        setFileHandle(null);
        setPath(null);
        setKeyFile(null);
        setPassword('');
        setNewName('');
        setConfirmPassword('');
        clearError();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const switchMode = (newMode: 'open' | 'create') => {
        // If initialMode was forced (e.g. in a specific window), maybe we shouldn't allow switching?
        // For now, let's allow it unless we want to strictly enforce the window purpose.
        // But the user request implies "Create Window" vs "Open Window". 
        // Let's keep it flexible but default to the prop.
        setMode(newMode);
        clearError();
        setKeyFile(null);
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'open') {
            if ((!file && !fileHandle && !path)) return;
            try {
                await addVault(path || fileHandle || file!, password, keyFile || undefined);
                resetForm();
                onSuccess?.();
            } catch (err) {
                // Error handled in context
            }
        } else {
            // Create
            if (password !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }
            try {
                await createVault(newName, password, keyFile || undefined);
                resetForm();
                onSuccess?.();
            } catch (err) {
                // Error handled in context
            }
        }
    };

    const handleFileBoxClick = async () => {
        try {
            const handle = await fileSystem.openFile();
            if (!handle) return; // User cancelled

            if (handle.path) {
                // Tauri environment
                setPath(handle.path);
                setFile(new File([], handle.name)); // Fake file for display
                setFileHandle(null);
            } else if (handle.webHandle) {
                // Browser environment
                const file = await handle.webHandle.getFile();
                setFile(file);
                setFileHandle(handle.webHandle as any);
                setPath(null);
            }
            clearError();
        } catch (err) {
            console.error('File open failed:', err);
            // Fallback to input element
            fileInputRef.current?.click();
        }
    };

    const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setFileHandle(null);
            setPath(null);
            clearError();
        }
    };

    const handleQuickOpen = async (vaultInfo: SavedVaultInfo) => {
        try {
            if (vaultInfo.path) {
                // Tauri path
                setPath(vaultInfo.path);
                // Create a dummy file for display purposes so the UI shows the filename
                setFile(new File([], vaultInfo.filename));
                setFileHandle(null);
                setMode('open');
                clearError();
                // We don't need to dispatch an event here because we are already in the form
                // The state update above will trigger the UI to show the password input
            }
        } catch (err) {
            console.error('Failed to quick open:', err);
        }
    };

    return (
        <div className={`flex flex-col ${className}`}>
            {allowModeSwitch && (
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-4">
                    <button
                        onClick={() => switchMode('open')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'open' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Open Database
                    </button>
                    <button
                        onClick={() => switchMode('create')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'create' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Create New
                    </button>
                </div>
            )}

            {!hideHeader && (
                <div className="flex flex-col items-center mb-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                        {mode === 'open' ? <Lock size={24} /> : <PlusCircle size={24} />}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{mode === 'open' ? 'Unlock Vault' : 'New Database'}</h2>
                    <p className="text-sm text-gray-500 text-center mt-1 px-4">
                        {mode === 'open'
                            ? 'Select a local .kdbx file to access your passwords.'
                            : 'Create a secure database and save it to your device or cloud folder.'}
                    </p>
                </div>
            )}

            {/* Recent Vaults */}
            {mode === 'open' && recentVaults.length > 0 && !file && !path && !initialVaultInfo && (
                <div className="mb-4">
                    <div className="flex items-center text-xs font-semibold text-gray-500 uppercase mb-2">
                        <Clock size={12} className="mr-1" />
                        Recent Databases
                    </div>
                    <div className="space-y-2">
                        {recentVaults.map((vault, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleQuickOpen(vault)}
                                className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center justify-between group"
                            >
                                <div className="flex items-center min-w-0">
                                    <HardDrive size={16} className="mr-2 text-gray-400 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-900 truncate">{vault.filename}</div>
                                        {vault.path && (
                                            <div className="text-xs text-gray-500 truncate">{vault.path}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                    {new Date(vault.lastOpened).toLocaleDateString()}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200"></div>
                </div>
            )}

            {unlockError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start">
                    <AlertCircle size={16} className="mt-0.5 mr-2 flex-shrink-0" />
                    <span>{unlockError}</span>
                </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">

                <input
                    type="file"
                    accept=".kdbx,.kdb"
                    ref={fileInputRef}
                    onChange={handleFallbackFileChange}
                    className="hidden"
                />

                {mode === 'open' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Database File</label>
                        <div
                            onClick={handleFileBoxClick}
                            className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${file ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                        >
                            {file ? (
                                <>
                                    <HardDrive size={20} className="text-indigo-600 mb-1" />
                                    <span className="text-sm font-medium text-indigo-900 truncate max-w-[200px]">{file.name}</span>
                                    {path ? (
                                        <span className="text-xs text-green-600 mt-1 flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Native File System</span>
                                    ) : fileHandle ? (
                                        <span className="text-xs text-green-600 mt-1 flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Native Sync Ready</span>
                                    ) : (
                                        <span className="text-xs text-amber-600 mt-1 flex items-center"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1"></span>Read Only / Manual Save</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Upload size={20} className="text-gray-400 mb-1" />
                                    <span className="text-sm text-gray-500">Click to browse files</span>
                                    <span className="text-xs text-gray-400 mt-1 text-center">Supports iCloud Drive, Dropbox, Local</span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {mode === 'create' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Database Name</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="New Vault"
                        />
                    </div>
                )}

                {(mode === 'create' || (mode === 'open' && (file || fileHandle || path))) && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                            {mode === 'create' ? 'Master Password' : 'Master Password'}
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder={mode === 'open' ? "Enter password to unlock" : "Create master password"}
                            />
                        </div>
                    </div>
                )}

                {mode === 'create' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Confirm Password</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                placeholder="Confirm master password"
                            />
                        </div>
                    </div>
                )}

                {/* Key File Input - Shared for both modes */}
                {(mode === 'create' || (mode === 'open' && (file || fileHandle || path))) && (
                    <div className="pt-2">
                        <label className="flex items-center text-xs font-semibold text-gray-500 uppercase mb-1 cursor-pointer">
                            <span className="flex-1">Key File (Optional)</span>
                        </label>
                        <div className="relative flex items-center">
                            <FileKey className="absolute left-3 h-4 w-4 text-gray-400" />
                            <input
                                type="file"
                                onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                            />
                            <div className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 bg-gray-50 truncate">
                                {keyFile ? keyFile.name : 'No key file selected'}
                            </div>
                            {keyFile && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setKeyFile(null);
                                    }}
                                    className="absolute right-3 z-20 text-gray-400 hover:text-gray-600 p-1"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={
                        (mode === 'open' && (!file && !fileHandle && !path)) ||
                        (mode === 'create' && (!newName || !password)) ||
                        isUnlocking
                    }
                    className={`w-full py-2.5 rounded-lg text-white font-medium shadow-lg shadow-indigo-500/20 mt-4 transition-all
                    ${isUnlocking ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'}`}
                >
                    {isUnlocking
                        ? (mode === 'create' ? 'Creating...' : 'Decrypting...')
                        : (mode === 'create' ? 'Create Database' : 'Unlock Vault')
                    }
                </button>
            </form>
        </div>
    );
};
