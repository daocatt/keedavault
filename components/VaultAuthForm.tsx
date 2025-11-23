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
    const [formError, setFormError] = useState<string | null>(null);


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
        setFormError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const switchMode = (newMode: 'open' | 'create') => {
        setMode(newMode);
        clearError();
        setFormError(null);
        setKeyFile(null);
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setFormError(null);

        if (mode === 'open') {
            if (!file && !fileHandle && !path) {
                setFormError("Please select a database file.");
                return;
            }
            try {
                await addVault(path || fileHandle || file!, password, keyFile || undefined);
                resetForm();
                onSuccess?.();
            } catch (err) {
                // Error is handled in the VaultContext and displayed via `unlockError`
            }
        } else { // Create mode
            if (password !== confirmPassword) {
                setFormError("Passwords do not match.");
                return;
            }
            if (!newName.trim()) {
                setFormError("Please enter a database name.");
                return;
            }
            if (!password) {
                setFormError("Password is required.");
                return;
            }
            try {
                await createVault(newName, password, keyFile || undefined);
                resetForm();
                onSuccess?.();
            } catch (err) {
                // Error is handled in the VaultContext
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
        <div className={`flex flex-col ${className}`} onContextMenu={(e) => e.preventDefault()}>
            {!hideHeader && (
                <div className="flex flex-col items-center mb-6 text-center">
                    {/* Show simplified header when a file is selected */}
                    {(file || path) ? (
                        <>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                                <HardDrive size={24} style={{ color: 'var(--color-accent)' }} />
                            </div>
                            <h2 className="text-lg font-semibold truncate max-w-xs" style={{ color: 'var(--color-text-primary)' }} title={file?.name || 'Database'}>
                                {file?.name || 'Database'}
                            </h2>
                            {path && (
                                <p className="text-xs mt-1 truncate max-w-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                                    {path}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-bg-hover)' }}>
                                {mode === 'open' ? <Lock size={28} style={{ color: 'var(--color-text-secondary)' }} /> : <PlusCircle size={28} style={{ color: 'var(--color-text-secondary)' }} />}
                            </div>
                            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{mode === 'open' ? 'Unlock Vault' : 'New Database'}</h2>
                            {mode === 'open' && (
                                <p className="text-sm mt-1.5 max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                    Select a local .kdbx file to access your passwords.
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Recent Vaults */}
            {mode === 'open' && recentVaults.length > 0 && !file && !path && !initialVaultInfo && (
                <div className="mb-6">
                    <div className="flex items-center text-xs font-semibold text-neutral-500 uppercase mb-2 tracking-wider">
                        <Clock size={12} className="mr-2" />
                        Recent Databases
                    </div>
                    <div className="space-y-1.5">
                        {recentVaults.map((vault, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleQuickOpen(vault)}
                                className="w-full text-left px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200/60 border border-transparent hover:border-neutral-300/50 rounded-lg transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center min-w-0">
                                    <HardDrive size={18} className="mr-3 text-neutral-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-neutral-800 truncate">{vault.filename}</div>
                                        {vault.path && (
                                            <div className="text-xs text-neutral-500 truncate">{vault.path}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-neutral-400 ml-2 flex-shrink-0">
                                    {new Date(vault.lastOpened).toLocaleDateString()}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="mt-5 pt-5 border-t border-neutral-200/75"></div>
                </div>
            )}

            {(unlockError || formError) && (
                <div className="mb-4 p-3 bg-red-100/50 text-red-800 text-sm rounded-lg flex items-start border border-red-200/50">
                    <AlertCircle size={16} className="mt-0.5 mr-2.5 flex-shrink-0" />
                    <span>{unlockError || formError}</span>
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

                {mode === 'open' && !file && !path && (
                    <div>
                        <label className="block text-xs font-semibold uppercase mb-1.5 tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Database File</label>
                        <div
                            onClick={!initialVaultInfo ? handleFileBoxClick : undefined}
                            className={`rounded-lg p-4 flex flex-col items-center justify-center transition-all ${!initialVaultInfo ? 'cursor-pointer' : 'cursor-default'}`}
                            style={{
                                backgroundColor: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border-light)'
                            }}
                            onMouseEnter={(e) => {
                                if (!initialVaultInfo) {
                                    e.currentTarget.style.borderColor = 'var(--color-border-medium)';
                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!initialVaultInfo) {
                                    e.currentTarget.style.borderColor = 'var(--color-border-light)';
                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                                }
                            }}
                        >
                            <Upload size={24} className="mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
                            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Click to browse files</span>
                            <span className="text-xs mt-1.5 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Supports iCloud, Dropbox, or local files</span>
                        </div>
                    </div>
                )}

                {mode === 'create' && (
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1.5 tracking-wider">Database Name</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-3 py-2.5 bg-neutral-100/80 border border-neutral-200/75 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none"
                            placeholder="New Vault"
                        />
                    </div>
                )}

                {(mode === 'create' || (mode === 'open' && (file || fileHandle || path))) && (
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1.5 tracking-wider">
                            Master Password
                        </label>
                        <div className="relative">
                            <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 bg-neutral-100/80 border border-neutral-200/75 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none"
                                placeholder={mode === 'open' ? "Enter password to unlock" : "Create master password"}
                            />
                        </div>
                    </div>
                )}

                {mode === 'create' && (
                    <div>
                        <label className="block text-xs font-semibold text-neutral-600 uppercase mb-1.5 tracking-wider">Confirm Password</label>
                        <div className="relative">
                            <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 bg-neutral-100/80 border border-neutral-200/75 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:outline-none"
                                placeholder="Confirm master password"
                            />
                        </div>
                    </div>
                )}

                {/* Key File Input - Shared for both modes */}
                {(mode === 'create' || (mode === 'open' && (file || fileHandle || path))) && (
                    <div className="pt-2">
                        <label className="flex items-center text-xs font-semibold text-neutral-500 uppercase mb-1.5 tracking-wider cursor-pointer">
                            <span className="flex-1">Key File (Optional)</span>
                        </label>
                        <div className="relative flex items-center">
                            <FileKey className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" />
                            <input
                                type="file"
                                onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                            />
                            <div className="w-full pl-10 pr-3 py-2.5 border border-neutral-200/75 rounded-lg text-sm text-neutral-600 bg-neutral-100/80 truncate">
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
                                    className="absolute right-2 z-20 text-neutral-400 hover:text-neutral-600 p-1 rounded-full"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={
                            isUnlocking ||
                            (mode === 'open' && (!file && !fileHandle && !path)) ||
                            (mode === 'create' && (!newName || !password || password !== confirmPassword))
                        }
                        className={`w-full py-3 text-sm font-semibold rounded-lg transition-all
                        ${isUnlocking
                                ? 'bg-neutral-200 text-neutral-500 cursor-wait'
                                : 'bg-blue-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.05)] hover:bg-blue-600 active:scale-[0.98] active:bg-blue-700 disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed'
                            }`}
                    >
                        {isUnlocking
                            ? (mode === 'create' ? 'Creating...' : 'Decrypting...')
                            : (mode === 'create' ? 'Create Database' : 'Unlock Vault')
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};
