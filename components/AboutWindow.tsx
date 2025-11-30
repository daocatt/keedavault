import React, { useEffect, useState } from 'react';
import { Github, Globe } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion, getName } from '@tauri-apps/api/app';
import logo from '../logo.svg';

export const AboutWindow: React.FC = () => {
    const [appVersion, setAppVersion] = useState('');
    const [appName, setAppName] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                const ver = await getVersion();
                const name = await getName();
                setAppVersion(ver);
                setAppName(name);
            } catch (e) {
                console.error('Failed to get app info', e);
                setAppVersion('1.0.0');
                setAppName('KeedaVault');
            }
        };
        init();


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
        <div className="h-screen w-screen flex flex-col items-center justify-center relative overflow-hidden select-none" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            {/* Draggable Region */}
            <div
                className="absolute inset-0 z-0"
                data-tauri-drag-region
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            />

            <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-6 text-center w-full max-w-xs">
                {/* App Icon */}
                <img src={logo} alt="App Logo" className="w-24 h-24 mb-5 drop-shadow-xl select-none pointer-events-none" />

                {/* App Name & Version */}
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{appName}</h2>
                <p className="text-sm font-medium mb-6" style={{ color: 'var(--color-text-secondary)' }}>Version {appVersion}</p>

                {/* Description */}
                <p className="text-xs mb-8 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    A modern, secure, and open-source password manager designed for simplicity and privacy.
                </p>

                {/* Links - Need no-drag to be clickable */}
                <div className="w-full space-y-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <a
                        href="https://github.com/daocatt/keedavault"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-2 px-4 text-xs font-medium border rounded-lg transition-colors group"
                        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                    >
                        <Github size={14} className="mr-2 group-hover:text-gray-900" style={{ color: 'var(--color-text-secondary)' }} />
                        GitHub Repository
                    </a>
                    <a
                        href="https://keedavault.zwq.me"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full py-2 px-4 text-xs font-medium border rounded-lg transition-colors group"
                        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                    >
                        <Globe size={14} className="mr-2 group-hover:text-blue-500" style={{ color: 'var(--color-text-secondary)' }} />
                        Release Note
                    </a>
                </div>

                {/* Footer / Credits */}
                <div className="mt-8 pt-6 border-t w-full" style={{ borderColor: 'var(--color-border-light)' }}>
                    <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Created By</p>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>AI & Daocatt</p>
                </div>
            </div>
        </div>
    );
};
