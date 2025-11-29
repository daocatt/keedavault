import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { Key, FileKey, AlertCircle, PlusCircle, X } from 'lucide-react';

interface VaultCreateFormProps {
    onSuccess?: () => void;
    className?: string;
    hideHeader?: boolean;
}

import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export const VaultCreateForm: React.FC<VaultCreateFormProps> = ({ onSuccess, className = '', hideHeader = false }) => {
    const [newName, setNewName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [keyFile, setKeyFile] = useState<File | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const { createVault, isUnlocking, unlockError, clearError } = useVault();

    useEffect(() => {
        const win = getCurrentWebviewWindow();
        const title = newName ? `${newName} - Create Vault` : 'KeedaVault - Create Vault';
        win.setTitle(title);
    }, [newName]);

    const resetForm = () => {
        setNewName('');
        setPassword('');
        setConfirmPassword('');
        setKeyFile(null);
        clearError();
        setFormError(null);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setFormError(null);

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
    };

    return (
        <div className={`flex flex-col w-full max-w-sm mx-auto ${className}`} onContextMenu={(e) => e.preventDefault()}>
            {!hideHeader && (
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-4 shadow-sm border mx-auto" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                            <PlusCircle size={32} className="text-blue-500" strokeWidth={1.5} />
                        </div>
                        <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                            New Database
                        </h2>
                        <p className="text-[13px] mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                            Create a new secure database to store your passwords.
                        </p>
                    </div>
                </div>
            )}

            {(unlockError || formError) && (
                <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[13px] font-medium rounded-xl flex items-start border border-red-100 dark:border-red-800 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={16} className="mt-0.5 mr-2.5 flex-shrink-0" />
                    <span>{unlockError || formError}</span>
                </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <div className="space-y-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-secondary)' }}>Database Name</label>
                    <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-4 py-2.5 border rounded-xl text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                        style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            borderColor: 'var(--color-border-medium)',
                            color: 'var(--color-text-primary)'
                        }}
                        placeholder="Database Name"
                        autoFocus
                    />
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                            Master Password
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-3" style={{ color: 'var(--color-text-placeholder)' }}>
                                <Key size={16} />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 border rounded-xl text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                                style={{
                                    backgroundColor: 'var(--color-bg-primary)',
                                    borderColor: 'var(--color-border-medium)',
                                    color: 'var(--color-text-primary)'
                                }}
                                placeholder="Create strong password"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[11px] font-semibold uppercase tracking-wider ml-1" style={{ color: 'var(--color-text-secondary)' }}>Confirm Password</label>
                        <div className="relative">
                            <div className="absolute left-4 top-3" style={{ color: 'var(--color-text-placeholder)' }}>
                                <Key size={16} />
                            </div>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 border rounded-xl text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none transition-all shadow-sm"
                                style={{
                                    backgroundColor: 'var(--color-bg-primary)',
                                    borderColor: 'var(--color-border-medium)',
                                    color: 'var(--color-text-primary)'
                                }}
                                placeholder="Repeat password"
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

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isUnlocking || !newName || !password || password !== confirmPassword}
                        className={`w-full py-3 text-[13px] font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center
                        ${isUnlocking
                                ? 'cursor-wait'
                                : 'hover:bg-[#0062cc] active:scale-[0.98] shadow-blue-500/20 disabled:shadow-none disabled:cursor-not-allowed'
                            }`}
                        style={{
                            backgroundColor: (isUnlocking || !newName || !password || password !== confirmPassword) ? 'var(--color-bg-active)' : 'var(--color-accent)',
                            color: (isUnlocking || !newName || !password || password !== confirmPassword) ? 'var(--color-text-placeholder)' : '#ffffff'
                        }}
                    >
                        {isUnlocking && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                        {isUnlocking ? 'Creating Database...' : 'Create Database'}
                    </button>
                </div>
            </form>
        </div>
    );
};
