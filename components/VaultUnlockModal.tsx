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

    // Prevent keyboard shortcuts from affecting underlying components when modal is open
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Always stop propagation of these keys when modal is open
            // This prevents underlying components from handling them
            // But we don't preventDefault, so form fields still work normally

            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.stopPropagation();
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation();
            }

            if (e.key === 'Enter') {
                e.stopPropagation();
            }
        };

        // Use capture phase to intercept events before they reach the document listener
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }} onContextMenu={(e) => e.preventDefault()}>
            {/* Draggable Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-12 z-30" data-tauri-drag-region style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
            <div className="w-full h-full flex flex-col relative z-20">
                {/* Centered Title */}
                <div className="flex items-center justify-center pt-16 pb-8">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Unlock Vault</h1>
                </div>

                {/* Form Content */}
                <div className="flex items-start justify-center flex-1 pb-16">
                    <div className="w-full max-w-md px-4">
                        {/* Database Info - Inline */}
                        {initialVaultInfo && (
                            <div className="mb-6 flex items-center gap-3 px-3 py-2">
                                <div className="w-10 h-10 rounded-lg backdrop-blur-sm flex items-center justify-center flex-shrink-0 border" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                    <HardDrive size={20} className="text-blue-500" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{initialVaultInfo.filename}</span>
                                    {initialVaultInfo.path && (
                                        <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{initialVaultInfo.path}</span>
                                    )}
                                </div>
                            </div>
                        )}

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