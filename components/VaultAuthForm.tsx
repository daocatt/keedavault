import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { Upload, Lock, Key, FileKey, AlertCircle, PlusCircle, HardDrive, X, Clock, ChevronRight, FolderOpen } from 'lucide-react';
import { FileSystemFileHandle } from '../types';
import { getRecentVaults, SavedVaultInfo } from '../services/storageService';
import { fileSystem } from '../services/fileSystemAdapter';

interface VaultAuthFormProps {
    onSuccess?: () => void;
    className?: string;
    hideHeader?: boolean;
    initialMode?: 'open' | 'create';
    allowModeSwitch?: boolean;
}

export const VaultAuthForm: React.FC<VaultAuthFormProps & { initialVaultInfo?: SavedVaultInfo }> = ({ onSuccess, className = '', hideHeader = false, initialVaultInfo, initialMode = 'open', allowModeSwitch = true }) => {
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

    useEffect(() => {
        if (initialVaultInfo?.path) {
            setPath(initialVaultInfo.path);
            setFile(new File([], initialVaultInfo.filename));
            setFileHandle(null);
            clearError();
        }
    }, [initialVaultInfo]);

    useEffect(() => {
        setMode(initialMode);
    }, [initialMode]);

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
                // Error is handled in the VaultContext
            }
        } else {
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
            if (!handle) return;

            if (handle.path) {
                setPath(handle.path);
                setFile(new File([], handle.name));
                setFileHandle(null);
            } else if (handle.webHandle) {
                const file = await handle.webHandle.getFile();
                setFile(file);
                setFileHandle(handle.webHandle as any);
                setPath(null);
            }
            clearError();
        } catch (err) {
            console.error('File open failed:', err);
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
                setPath(vaultInfo.path);
                setFile(new File([], vaultInfo.filename));
                setFileHandle(null);
                setMode('open');
                clearError();
            }
        } catch (err) {
            console.error('Failed to quick open:', err);
        }
    };

    return (
        <div className={`flex flex-col w-full max-w-sm mx-auto ${className}`} onContextMenu={(e) => e.preventDefault()}>
            {!hideHeader && (
                <div className="flex flex-col items-center mb-8 text-center">
                    {(file || path) ? (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-4 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white mx-auto">
                                <HardDrive size={32} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 tracking-tight truncate max-w-[280px] mx-auto">
                                {file?.name || 'Database'}
                            </h2>
                            {path && (
                                <p className="text-[11px] font-medium text-gray-400 mt-1 truncate max-w-[280px] px-4 mx-auto">
                                    {path}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-4 shadow-sm bg-white border border-gray-100 mx-auto">
                                {mode === 'open' ?
                                    <Lock size={32} className="text-gray-400" strokeWidth={1.5} /> :
                                    <PlusCircle size={32} className="text-blue-500" strokeWidth={1.5} />
                                }
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                                {mode === 'open' ? 'Welcome Back' : 'New Database'}
                            </h2>
                            {mode === 'open' && (
                                <p className="text-[13px] text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                                    Select an existing database or create a new one to get started.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Recent Vaults List */}
            {mode === 'open' && recentVaults.length > 0 && !file && !path && !initialVaultInfo && (
                <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
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

            {(unlockError || formError) && (
                <div className="mb-5 p-3 bg-red-50 text-red-600 text-[13px] font-medium rounded-xl flex items-start border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} className="mt-0.5 mr-2.5 flex-shrink-0" />
                    <span>{unlockError || formError}</span>
                </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <input
                    type="file"
                    accept=".kdbx,.kdb"
                    ref={fileInputRef}
                    onChange={handleFallbackFileChange}
                    className="hidden"
                />

                {mode === 'open' && !file && !path && (
                    <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">
                            Database File
                        </label>
                        <div
                            onClick={!initialVaultInfo ? handleFileBoxClick : undefined}
                            className="relative cursor-pointer group"
                        >
                            <div className="absolute left-4 top-3 text-gray-400 group-hover:text-blue-500 transition-colors">
                                <FolderOpen size={16} />
                            </div>
                            <div className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:ring-4 hover:ring-blue-500/10 transition-all shadow-sm truncate">
                                Click to open database...
                            </div>
                            <div className="absolute right-3 top-2.5 bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded-md border border-gray-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                                Browse
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'create' && (
                    <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Database Name</label>
                        <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                            placeholder="My Passwords"
                        />
                    </div>
                )}

                {(mode === 'create' || (mode === 'open' && (file || fileHandle || path))) && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">
                                Master Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-3 text-gray-400">
                                    <Key size={16} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                                    placeholder={mode === 'open' ? "Enter password..." : "Create strong password"}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {mode === 'create' && (
                            <div className="space-y-1">
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider ml-1">Confirm Password</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-3 text-gray-400">
                                        <Key size={16} />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                                        placeholder="Repeat password"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Key File Input */}
                        <div className="pt-1">
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                                />
                                <div className={`flex items-center px-4 py-2.5 border rounded-xl text-sm transition-all ${keyFile
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-white hover:border-gray-300'
                                    }`}>
                                    <FileKey size={16} className={`mr-3 ${keyFile ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <span className="flex-1 truncate font-medium">
                                        {keyFile ? keyFile.name : 'Use Key File (Optional)'}
                                    </span>
                                    {keyFile ? (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setKeyFile(null);
                                            }}
                                            className="z-20 p-1 hover:bg-blue-100 rounded-full text-blue-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    ) : (
                                        <PlusCircle size={14} className="text-gray-400 group-hover:text-gray-600" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={
                            isUnlocking ||
                            (mode === 'open' && (!file && !fileHandle && !path)) ||
                            (mode === 'create' && (!newName || !password || password !== confirmPassword))
                        }
                        className={`w-full py-3 text-[13px] font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center
                        ${isUnlocking
                                ? 'bg-gray-100 text-gray-400 cursor-wait'
                                : 'bg-[#007AFF] text-white hover:bg-[#0062cc] active:scale-[0.98] shadow-blue-500/20 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed'
                            }`}
                    >
                        {isUnlocking && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                        {isUnlocking
                            ? (mode === 'create' ? 'Creating Database...' : 'Decrypting...')
                            : (mode === 'create' ? 'Create Database' : 'Unlock Vault')
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};
