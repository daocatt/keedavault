import React, { useEffect } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { PasswordGenerator } from './PasswordGenerator';

export const GeneratorWindow: React.FC = () => {
    useEffect(() => {
        // Show window after content is ready - use RAF for optimal timing
        const showWindow = () => {
            requestAnimationFrame(() => {
                requestAnimationFrame(async () => {
                    const window = getCurrentWebviewWindow();
                    await window.show();
                    await window.setFocus();
                });
            });
        };
        showWindow();
    }, []);

    return (
        <div className="h-screen w-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            <div className="h-8 backdrop-blur-sm border-b flex items-center justify-center drag-region select-none"
                data-tauri-drag-region
                style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border-light)',
                    opacity: 0.95
                }}
            >
                <span className="text-xs font-medium pointer-events-none" style={{ color: 'var(--color-text-secondary)' }}>Password Generator</span>
            </div>
            <div className="p-4">
                <PasswordGenerator
                    isOpen={true}
                    onClose={() => getCurrentWebviewWindow().close()}
                    onGenerate={() => { }}
                    showCopyButton={true}
                    className="shadow-none border-0 p-0"
                    closeOnOutsideClick={false}
                    showUseButton={false}
                />
            </div>
        </div>
    );
};
