import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, HardDrive } from 'lucide-react';
import { VaultAuthForm } from './VaultAuthForm';
import { SavedVaultInfo } from '../services/storageService';

export const VaultUnlockModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [initialVaultInfo, setInitialVaultInfo] = useState<SavedVaultInfo | undefined>(undefined);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as SavedVaultInfo | undefined;
            setInitialVaultInfo(detail);
            setIsOpen(true);
        };
        document.addEventListener('open-unlock-modal', handler);
        return () => document.removeEventListener('open-unlock-modal', handler);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50" onContextMenu={(e) => e.preventDefault()}>
            <div className="w-full h-full flex flex-col">
                {/* Centered Title */}
                <div className="flex items-center justify-center pt-16 pb-8">
                    <h1 className="text-2xl font-semibold text-gray-800">Unlock Vault</h1>
                </div>

                {/* Database Info - Inline */}
                {initialVaultInfo && (
                    <div className="flex items-center justify-center mb-8">
                        <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                                <HardDrive size={20} style={{ color: 'var(--color-accent)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-800">{initialVaultInfo.filename}</span>
                                {initialVaultInfo.path && (
                                    <span className="text-xs text-gray-500">{initialVaultInfo.path}</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Content */}
                <div className="flex items-start justify-center flex-1 pb-16">
                    <div className="w-full max-w-md px-4">
                        <VaultAuthForm
                            initialVaultInfo={initialVaultInfo}
                            onSuccess={() => setIsOpen(false)}
                            hideHeader={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};