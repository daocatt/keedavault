import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { Lock, Key, FileKey, AlertCircle, HardDrive, X, FolderOpen, PlusCircle, Fingerprint } from 'lucide-react';
import { FileSystemFileHandle } from '../types';
import { SavedVaultInfo } from '../services/storageService';
import { fileSystem } from '../services/fileSystemAdapter';
import { biometricService } from '../services/biometricService';
import { getUISettings } from '../services/uiSettingsService';

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
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [hasSavedPassword, setHasSavedPassword] = useState(false);
    const [touchIdEnabled, setTouchIdEnabled] = useState(false);

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

    // Check biometric availability and settings
    useEffect(() => {
        const checkBiometric = async () => {
            console.log('=== Touch ID Debug Start ===');
            console.log('Touch ID Debug - Path value:', path);
            console.log('Touch ID Debug - Path type:', typeof path);
            console.log('Touch ID Debug - Path is null?', path === null);
            console.log('Touch ID Debug - Path is undefined?', path === undefined);
            console.log('Touch ID Debug - Path is empty string?', path === '');

            const available = await biometricService.isAvailable();
            setBiometricAvailable(available);
            console.log('Touch ID Debug - Available:', available);

            const settings = await getUISettings();
            const enabled = settings.security?.quickUnlockTouchId ?? false;
            setTouchIdEnabled(enabled);
            console.log('Touch ID Debug - Enabled in settings:', enabled);
            console.log('Touch ID Debug - Settings object:', settings.security);

            let hasSaved = false;
            if (path && available) {
                console.log('Touch ID Debug - Checking for saved password...');
                console.log('Touch ID Debug - Calling hasStoredPassword with path:', path);
                hasSaved = await biometricService.hasStoredPassword(path);
                setHasSavedPassword(hasSaved);
                console.log('Touch ID Debug - Has saved password for', path, ':', hasSaved);
            } else {
                console.log('Touch ID Debug - Skipping password check.');
                console.log('Touch ID Debug - Reason: path =', path, ', available =', available);
                setHasSavedPassword(false);
            }

            const willShow = available && enabled && hasSaved && !!path;
            console.log('Touch ID Debug - Button will show:', willShow);
            console.log('Touch ID Debug - Conditions:', {
                available,
                enabled,
                hasSavedPassword: hasSaved,
                hasPath: !!path,
                pathValue: path
            });
            console.log('=== Touch ID Debug End ===');
        };
        checkBiometric();
    }, [path]);

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

            // Save password for Touch ID if enabled
            console.log('=== Touch ID Password Save Debug ===');
            console.log('touchIdEnabled:', touchIdEnabled);
            console.log('biometricAvailable:', biometricAvailable);
            console.log('path:', path);
            console.log('password length:', password?.length);

            if (touchIdEnabled && biometricAvailable && path && password) {
                try {
                    console.log('🔐 Saving password to Keychain for path:', path);
                    await biometricService.storePassword(path, password);
                    console.log('✅ Password saved successfully!');
                } catch (err) {
                    console.error('❌ Failed to save password for Touch ID:', err);
                }
            } else {
                console.log('⏭️ Skipping password save. Conditions not met.');
            }
            console.log('=== Touch ID Password Save Debug End ===');

            resetForm();
            onSuccess?.();
        } catch (err) {
            // Error is handled in the VaultContext
        }
    };

    const handleTouchIdUnlock = async () => {
        if (!path) {
            console.error('Touch ID: No path available');
            return;
        }

        console.log('Touch ID: Starting authentication for', path);

        try {
            console.log('Touch ID: Requesting biometric authentication...');
            const authenticated = await biometricService.authenticate('Unlock ' + (file?.name || 'database'));
            console.log('Touch ID: Authentication result:', authenticated);

            if (!authenticated) {
                setFormError('Touch ID authentication failed');
                console.error('Touch ID: Authentication failed or cancelled');
                return;
            }

            console.log('Touch ID: Retrieving saved password...');
            const savedPassword = await biometricService.getPassword(path);
            console.log('Touch ID: Password retrieved:', !!savedPassword);

            if (!savedPassword) {
                setFormError('No saved password found. Please unlock with password first.');
                console.error('Touch ID: No saved password in Keychain');
                return;
            }

            console.log('Touch ID: Unlocking vault with saved password...');
            await addVault(path, savedPassword, keyFile || undefined);
            resetForm();
            onSuccess?.();
            console.log('Touch ID: Unlock successful!');
        } catch (err) {
            console.error('Touch ID: Error during unlock:', err);
            setFormError('Touch ID unlock failed: ' + String(err));
        }
    };

    const handleFileBoxClick = async () => {
        console.log('VaultAuthForm: handleFileBoxClick');
        try {
            const handle = await fileSystem.openFile();
            console.log('VaultAuthForm: openFile result:', handle);
            if (!handle) return;

            if (handle.path) {
                console.log('VaultAuthForm: Setting path from handle:', handle.path);
                setPath(handle.path);
                setFile(new File([], handle.name));
                setFileHandle(null);
            } else if (handle.webHandle) {
                console.log('VaultAuthForm: Setting webHandle (no path)');
                const file = await handle.webHandle.getFile();
                setFile(file);
                setFileHandle(handle.webHandle as any);
                setPath(null);
            }
            clearError();
        } catch (err) {
            console.error('File open failed:', err);
            console.log('VaultAuthForm: Falling back to file input');
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
                <div
                    className="mb-5 p-3 text-sm font-medium rounded-xl flex items-start border shadow-sm animate-in fade-in slide-in-from-top-2"
                    style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        borderColor: '#fecaca'
                    }}
                >
                    <AlertCircle size={18} className="mt-0.5 mr-2.5 flex-shrink-0" style={{ color: '#dc2626' }} />
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

                <div className="pt-4 space-y-2">
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

                    {/* Touch ID Button */}
                    {(() => {
                        const shouldShow = !!(biometricAvailable && touchIdEnabled && hasSavedPassword && path);
                        console.log('🔍 [RENDER] Touch ID Button Check:', {
                            biometricAvailable,
                            touchIdEnabled,
                            hasSavedPassword,
                            path: path ? `"${path}"` : null,
                            shouldShow
                        });
                        return shouldShow;
                    })() && (
                            <button
                                type="button"
                                onClick={handleTouchIdUnlock}
                                disabled={isUnlocking}
                                className="w-full py-3 text-[13px] font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center border-2 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    borderColor: 'var(--color-border-medium)',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)'
                                }}
                            >
                                <Fingerprint size={16} className="mr-2" />
                                Unlock with Touch ID
                            </button>
                        )}
                </div>
            </form>
        </div>
    );
};
