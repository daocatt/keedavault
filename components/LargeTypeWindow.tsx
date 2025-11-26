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
    const renderColorfulText = (str: string) => {
        return str.split('').map((char, index) => {
            let color = 'text-gray-800';
            if (/[0-9]/.test(char)) color = 'text-blue-600';
            else if (/[A-Z]/.test(char)) color = 'text-orange-600';
            else if (/[^a-zA-Z0-9]/.test(char)) color = 'text-purple-600';

            return (
                <span key={index} className={color}>
                    {char}
                </span>
            );
        });
    };

    return (
        <div className="h-screen w-screen bg-white flex flex-col overflow-hidden">
            {/* Draggable Header Area */}
            <div className="h-12 w-full flex-shrink-0" data-tauri-drag-region style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}></div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 pb-16 overflow-y-auto">
                <div className="flex flex-col items-center space-y-8 w-full max-w-4xl">
                    {/* Large Password Display */}
                    <div className="text-center w-full">
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 break-all whitespace-normal px-4">{username}</div>
                        <div className="text-6xl font-mono font-bold break-all leading-tight tracking-wide bg-gray-50 p-8 rounded-2xl border border-gray-100 shadow-inner select-all cursor-text">
                            {renderColorfulText(text)}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">QR Code</div>
                        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                            <QRCodeSVG value={text} size={160} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
