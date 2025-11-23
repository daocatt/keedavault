import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onContextMenu={(e) => e.preventDefault()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
                <div className="h-12 bg-gray-50/80 backdrop-blur-sm flex items-center px-4 border-b border-gray-200/50 justify-between flex-shrink-0">
                    <div className="flex items-center">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 mr-2" />
                        <span className="font-semibold text-sm text-gray-700 tracking-tight">Unlock Vault</span>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto">
                    <VaultAuthForm
                        initialVaultInfo={initialVaultInfo}
                        onSuccess={() => setIsOpen(false)}
                    />
                </div>
            </div>
        </div>
    );
};