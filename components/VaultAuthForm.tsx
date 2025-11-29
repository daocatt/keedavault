import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { Lock, Key, FileKey, AlertCircle, HardDrive, X, FolderOpen, PlusCircle } from 'lucide-react';
import { FileSystemFileHandle } from '../types';
import { SavedVaultInfo } from '../services/storageService';
import { fileSystem } from '../services/fileSystemAdapter';

interface VaultAuthFormProps {
    onSuccess?: () => void;
    className?: string;
    hideHeader?: boolean;
}

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export const VaultAuthForm: React.FC<VaultAuthFormProps & { initialVaultInfo?: SavedVaultInfo }> = ({ onSuccess, className = '', hideHeader = false, initialVaultInfo }) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
    const [path, setPath] = useState<string | null>(null);
    const [keyFile, setKeyFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const { addVault, isUnlocking, unlockError, clearError } = useVault();

    useEffect(() => {
        const win = getCurrentWebviewWindow();
        win.setTitle('KeedaVault - Vault Auth');
    }, []);

    useEffect(() => {
        if (initialVaultInfo?.path) {
            setPath(initialVaultInfo.path);
            // Don't create a dummy File object - we'll use the path directly
            clearError();
        }
    }, [initialVaultInfo?.path]);

    const resetForm = () => {
        setFile(null);
        setFileHandle(null);
        setPath(null);
        setKeyFile(null);
        setPassword('');
        clearError();
        setFormError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setFormError(null);

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



    return (
        <div className={`flex flex-col w-full max-w-sm mx-auto ${className}`} onContextMenu={(e) => e.preventDefault()}>
            {!hideHeader && (
                <div className="flex flex-col items-center mb-8 text-center">
                    {(file || path) ? (
                        <div>
                            <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-4 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white mx-auto">
                                <HardDrive size={32} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-xl font-semibold tracking-tight truncate max-w-[280px] mx-auto" style={{ color: 'var(--color-text-primary)' }}>
                                {file?.name || (path ? path.split(/[/\\]/).pop() : 'Database')}
                            </h2>
                            {path && (
                                <p className="text-[11px] font-medium mt-1 truncate max-w-[280px] px-4 mx-auto" style={{ color: 'var(--color-text-placeholder)' }}>
                                    {path}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-4 shadow-sm border mx-auto" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                                <Lock size={32} style={{ color: 'var(--color-text-placeholder)' }} strokeWidth={1.5} />
                            </div>
                            <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                                Welcome Back
                            </h2>
                            <p className="text-[13px] mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                Select a database to get started.
                            </p>
                        </div>
                    )}
                </div>
            )}



            {(unlockError || formError) && (
                <div className="mb-5 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm font-medium rounded-xl flex items-start border border-red-200 dark:border-red-800 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={18} className="mt-0.5 mr-2.5 flex-shrink-0 text-red-600 dark:text-red-400" />
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

                {!file && !path && (
                    <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Database File
                        </label>
                        <div
                            onClick={!initialVaultInfo ? handleFileBoxClick : undefined}
                            className="relative cursor-pointer group"
                        >
                            <div className="absolute left-4 top-3 group-hover:text-blue-500 transition-colors" style={{ color: 'var(--color-text-placeholder)' }}>
                                <FolderOpen size={16} />
                            </div>
                            <div className="w-full pl-11 pr-4 py-2.5 border rounded-xl text-sm hover:border-blue-400 hover:ring-4 hover:ring-blue-500/10 transition-all shadow-sm truncate"
                                style={{
                                    backgroundColor: 'var(--color-bg-primary)',
                                    borderColor: 'var(--color-border-medium)',
                                    color: 'var(--color-text-secondary)'
                                }}>
                                Click to open database...
                            </div>
                            <div className="absolute right-3 top-2.5 text-[10px] px-2 py-1 rounded-md border group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors"
                                style={{
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-secondary)',
                                    borderColor: 'var(--color-border-light)'
                                }}>
                                Browse
                            </div>
                        </div>
                    </div>
                )}

                {(file || fileHandle || path) && (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                                Master Password
                            </label>
                            <div className="relative">
                                <div className="absolute left-4 top-3" style={{ color: (unlockError || formError) ? '#ef4444' : 'var(--color-text-placeholder)' }}>
                                    <Key size={16} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (unlockError || formError) {
                                            clearError();
                                            setFormError(null);
                                        }
                                    }}
                                    className={`w-full pl-11 pr-4 py-2.5 border rounded-xl text-sm focus:ring-4 focus:outline-none transition-all shadow-sm ${(unlockError || formError)
                                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                        : "focus:border-blue-500 focus:ring-blue-500/10"
                                        }`}
                                    style={{
                                        backgroundColor: 'var(--color-bg-primary)',
                                        borderColor: (unlockError || formError) ? undefined : 'var(--color-border-medium)',
                                        color: 'var(--color-text-primary)'
                                    }}
                                    placeholder="Enter password..."
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Key File Input */}
                        <div className="pt-1">
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full z-10"
                                />
                                <div className={`flex items-center px-4 py-2.5 border rounded-xl text-sm transition-all ${keyFile
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                                    : 'hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                    style={!keyFile ? {
                                        backgroundColor: 'var(--color-bg-secondary)',
                                        borderColor: 'var(--color-border-medium)',
                                        color: 'var(--color-text-secondary)'
                                    } : {}}
                                >
                                    <FileKey size={16} className={`mr-3 ${keyFile ? 'text-blue-500' : ''}`} style={!keyFile ? { color: 'var(--color-text-placeholder)' } : {}} />
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
                                        <PlusCircle size={14} className="group-hover:text-gray-600" style={{ color: 'var(--color-text-placeholder)' }} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isUnlocking || (!file && !fileHandle && !path)}
                        className={`w-full py-3 text-[13px] font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center
                        ${isUnlocking
                                ? 'cursor-wait'
                                : 'hover:bg-[#0062cc] active:scale-[0.98] shadow-blue-500/20 disabled:shadow-none disabled:cursor-not-allowed'
                            }`}
                        style={{
                            backgroundColor: (isUnlocking || (!file && !fileHandle && !path)) ? 'var(--color-bg-active)' : 'var(--color-accent)',
                            color: (isUnlocking || (!file && !fileHandle && !path)) ? 'var(--color-text-placeholder)' : '#ffffff'
                        }}
                    >
                        {isUnlocking && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                        {isUnlocking ? 'Decrypting...' : 'Unlock Vault'}
                    </button>
                </div>
            </form>
        </div>
    );
};
