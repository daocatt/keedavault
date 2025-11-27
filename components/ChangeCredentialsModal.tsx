import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Key, FileKey, RefreshCw, Check } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import * as kdbxweb from 'kdbxweb';
import { useToast } from './ui/Toaster';

interface ChangeCredentialsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangeCredentialsModal: React.FC<ChangeCredentialsModalProps> = ({ isOpen, onClose }) => {
    const { activeVaultId, vaults, changeCredentials } = useVault();
    const { addToast } = useToast();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Key File State
    const [keyFileAction, setKeyFileAction] = useState<'keep' | 'remove' | 'change'>('remove');
    const [keyFile, setKeyFile] = useState<File | Uint8Array | null>(null);
    const [keyFileName, setKeyFileName] = useState<string>('');

    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const activeVault = vaults.find(v => v.id === activeVaultId);

    useEffect(() => {
        if (isOpen && activeVault) {
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setKeyFile(null);
            setKeyFileName('');
            setError(null);

            // Debug logging for credentials
            try {
                const hasPass = activeVault.password;
                const passLen = hasPass ? hasPass.getText().length : 0;
                console.log('ChangeCredentialsModal: Credentials Check', {
                    hasPasswordObject: !!hasPass,
                    passwordLength: passLen,
                    isProtectedValue: hasPass instanceof kdbxweb.ProtectedValue
                });
            } catch (e) {
                console.error('Error checking credentials:', e);
            }

            // Initialize key file action based on current vault state
            if (activeVault.hasKeyFile) {
                setKeyFileAction('keep');
            } else {
                setKeyFileAction('remove'); // Effectively 'none'
            }
        }
    }, [isOpen, activeVault]);

    if (!isOpen || !activeVault) return null;

    const handleSelectKeyFile = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Key Files',
                    extensions: ['key', 'xml', 'keyx']
                }]
            });

            if (selected && typeof selected === 'string') {
                const data = await readFile(selected);
                setKeyFile(data);
                setKeyFileName(selected.split(/[/\\]/).pop() || 'keyfile');
                setKeyFileAction('change');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateKeyFile = async () => {
        try {
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0') +
                now.getHours().toString().padStart(2, '0') +
                now.getMinutes().toString().padStart(2, '0');

            const safeDbName = activeVault.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const defaultName = `keedavault-key-${timestamp}-${safeDbName}.keyx`;

            const savePath = await save({
                filters: [{
                    name: 'Key File',
                    extensions: ['keyx', 'key']
                }],
                defaultPath: defaultName
            });

            if (savePath) {
                // Generate 32 bytes of random data for the key file
                const keyData = new Uint8Array(32);
                window.crypto.getRandomValues(keyData);

                // Calculate SHA-256 hash for integrity check (first 4 bytes)
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyData);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.slice(0, 4).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');

                // Format key data: 8 groups of 4 bytes (8 hex chars), split into 2 lines
                const hexParts: string[] = [];
                for (let i = 0; i < 32; i += 4) {
                    const part = Array.from(keyData.slice(i, i + 4))
                        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
                        .join('');
                    hexParts.push(part);
                }
                const line1 = hexParts.slice(0, 4).join(' ');
                const line2 = hexParts.slice(4, 8).join(' ');

                // Match KeePass XML format Version 2.0
                const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<KeyFile>
    <Meta>
        <Version>2.0</Version>
    </Meta>
    <Key>
        <Data Hash="${hashHex}">
            ${line1}
            ${line2}
        </Data>
    </Key>
</KeyFile>
`;

                const encoder = new TextEncoder();
                const fileData = encoder.encode(xmlContent);

                await writeFile(savePath, fileData);
                setKeyFile(fileData);
                setKeyFileName(savePath.split(/[/\\]/).pop() || 'new-keyfile');
                setKeyFileAction('change');
                addToast({ title: "Key file created", type: "success" });
            }
        } catch (e) {
            console.error(e);
            addToast({ title: "Failed to create key file", type: "error" });
        }
    };

    const handleClearKeyFile = () => {
        setKeyFile(null);
        setKeyFileName('');
        setKeyFileAction('remove');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation: New password match
        if (newPassword && newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        // Validation: Must provide current password (if one exists)
        const hasCurrentPassword = activeVault.password && activeVault.password.getText().length > 0;
        if (hasCurrentPassword && !oldPassword) {
            setError("Current password is required");
            return;
        }

        setIsLoading(true);
        try {
            // If new password is empty, pass null to indicate "keep current"
            // We do NOT use oldPassword as the new password value to avoid accidental lockouts from typos
            const passwordToUse = newPassword || null;

            await changeCredentials(activeVault.id, oldPassword, passwordToUse, keyFileAction, keyFile || undefined);
            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to change credentials");
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-800">Change Credentials</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                            <div className="flex-shrink-0 mt-0.5 mr-2">
                                <X size={16} />
                            </div>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Database Name */}
                    <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-100">
                        <label className="block text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                            Database
                        </label>
                        <div className="text-sm font-medium text-gray-800 truncate">
                            {activeVault.name}
                        </div>
                    </div>

                    {/* Old Password */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">
                            Current Password
                        </label>
                        {activeVault.password && activeVault.password.getText().length > 0 ? (
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key size={16} className="text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                    placeholder="Enter current password"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Key size={16} className="text-gray-300" />
                                    </div>
                                    <input
                                        type="password"
                                        disabled
                                        value=""
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-200 bg-gray-50 text-gray-400 rounded-lg cursor-not-allowed text-sm"
                                        placeholder="No current password"
                                    />
                                </div>
                                <div className="flex items-start p-2 bg-amber-50 border border-amber-100 rounded-md text-xs text-amber-700">
                                    <div className="flex-shrink-0 mt-0.5 mr-2 text-amber-500">
                                        <Key size={14} />
                                    </div>
                                    <span>
                                        This database is currently not protected by a password. It is highly recommended to set a password now.
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 my-4"></div>

                    {/* New Password */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">
                                New Password <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="Leave blank to keep current password"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-700">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                                placeholder="Confirm new password"
                            />
                        </div>
                    </div>

                    {/* Key File Section */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Key File (Optional)
                        </label>

                        {keyFileAction === 'keep' ? (
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className="p-1.5 bg-blue-100 rounded-md text-blue-600">
                                        <FileKey size={18} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-gray-800 truncate">
                                            Current Key File
                                        </span>
                                        <span className="text-xs text-blue-600">
                                            Will be preserved
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button
                                        type="button"
                                        onClick={() => setKeyFileAction('remove')}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        title="Remove Key File"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : keyFileAction === 'change' ? (
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center space-x-3 overflow-hidden">
                                    <div className="p-1.5 bg-green-100 rounded-md text-green-600">
                                        <FileKey size={18} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 truncate" title={keyFileName}>
                                        {keyFileName}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClearKeyFile}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                    title="Remove Key File"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleSelectKeyFile}
                                    className="flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                                >
                                    <FileKey size={16} className="mr-2 text-gray-500" />
                                    Select File
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateKeyFile}
                                    className="flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                                >
                                    <RefreshCw size={16} className="mr-2 text-gray-500" />
                                    Create New
                                </button>
                            </div>
                        )}
                        <p className="text-xs text-gray-500">
                            You can add a key file for extra security. If selected, you will need both the password and this file to unlock the database.
                            <a
                                href="https://keepass.info/help/base/keys.html#keyfiles"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 ml-1 hover:underline"
                            >
                                Learn more
                            </a>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <RefreshCw size={16} className="animate-spin mr-2" />
                            ) : (
                                <Save size={16} className="mr-2" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
