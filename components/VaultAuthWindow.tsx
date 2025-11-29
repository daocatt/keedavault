import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { VaultAuthForm } from './VaultAuthForm';
import { VaultCreateForm } from './VaultCreateForm';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

interface VaultAuthWindowProps {
    mode: 'unlock' | 'create';
    path?: string;
    onSuccess: () => void;
}

export const VaultAuthWindow: React.FC<VaultAuthWindowProps> = ({ mode, path, onSuccess }) => {
    const { addVault, createVault } = useVault();

    // Ensure window is fixed size for auth and visible
    useEffect(() => {
        const win = getCurrentWebviewWindow();
        win.setResizable(false);
        win.center();
        win.show();
        win.setFocus();
        // Size is set by Launcher/Main, but we can enforce it here if needed
        // win.setSize(new PhysicalSize(500, 640));
    }, []);

    const handleUnlock = async (password: string) => {
        if (!path) return;
        try {
            await addVault(path, password);
            onSuccess();
        } catch (error) {
            console.error("Unlock failed", error);
            throw error;
        }
    };

    const handleCreate = async (name: string, password: string) => {
        try {
            await createVault(name, password);
            onSuccess();
        } catch (error) {
            console.error("Create failed", error);
            throw error;
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            {/* Drag Region */}
            <div
                className="h-8 w-full flex-shrink-0"
                data-tauri-drag-region
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            />

            <div className="flex-1 flex items-center justify-center p-4">
                {mode === 'create' ? (
                    <VaultCreateForm
                        onSuccess={onSuccess}
                    />
                ) : (
                    <VaultAuthForm
                        initialVaultInfo={path ? { path, filename: path.split(/[/\\]/).pop() || '', lastOpened: 0 } : undefined}
                        onSuccess={onSuccess}
                    />
                )}
            </div>
        </div>
    );
};
