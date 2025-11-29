import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';

export const LargeTypeWindow: React.FC = () => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get('text') || '';
    const title = params.get('title') || '';
    const username = params.get('username') || 'Password';

    useEffect(() => {
        const win = getCurrentWebviewWindow();
        win.setTitle(title);
        window.scrollTo(0, 0);

        const unlisten = listen('vault-locked', () => {
            win.close();
        });

        return () => {
            unlisten.then(f => f());
        };
    }, [title]);

    // Helper to colorize text
    // Helper to colorize text
    const renderColorfulText = (str: string) => {
        return str.split('').map((char, index) => {
            let color = 'text-gray-800 dark:text-gray-200';
            if (/[0-9]/.test(char)) color = 'text-blue-600 dark:text-blue-400';
            else if (/[A-Z]/.test(char)) color = 'text-orange-600 dark:text-orange-400';
            else if (/[^a-zA-Z0-9]/.test(char)) color = 'text-purple-600 dark:text-purple-400';

            return (
                <span key={index} className={color}>
                    {char}
                </span>
            );
        });
    };

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            {/* Draggable Header Area */}
            <div className="h-12 w-full flex-shrink-0" data-tauri-drag-region style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}></div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 pb-16 overflow-y-auto">
                <div className="flex flex-col items-center space-y-8 w-full max-w-4xl">
                    {/* Large Password Display */}
                    <div className="text-center w-full">
                        <div className="text-sm font-bold uppercase tracking-wider mb-2 break-all whitespace-normal px-4" style={{ color: 'var(--color-text-tertiary)' }}>{username}</div>
                        <div className="text-6xl font-mono font-bold break-all leading-tight tracking-wide p-8 rounded-2xl border shadow-inner select-all cursor-text" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-medium)' }}>
                            {renderColorfulText(text)}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-tertiary)' }}>QR Code</div>
                        <div className="p-4 border rounded-xl shadow-sm" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-medium)' }}>
                            <QRCodeSVG value={text} size={160} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
