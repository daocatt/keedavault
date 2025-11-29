import React, { useEffect, useState } from 'react';
import { X, Github, Globe } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion, getName } from '@tauri-apps/api/app';
import logo from '../logo.svg';
const appWindow = getCurrentWebviewWindow()

export const AboutModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
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

        const unlisten = appWindow.listen('show-about', () => {
            setIsOpen(true);
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    // Prevent keyboard shortcuts from affecting underlying components when modal is open
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Always stop propagation of these keys when modal is open
            // This prevents underlying components from handling them

            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.stopPropagation();
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation();
            }

            if (e.key === 'Enter') {
                e.stopPropagation();
            }

            if (e.key === 'Escape') {
                e.stopPropagation();
                setIsOpen(false);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <div
                className="rounded-xl w-80 overflow-hidden shadow-2xl border transform transition-all animate-in fade-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Close Button */}
                <div className="absolute top-3 right-3 z-10">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-full transition-colors"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--color-text-tertiary)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex flex-col items-center pt-10 pb-8 px-6 text-center">
                    {/* App Icon */}
                    <img src={logo} alt="App Logo" className="w-24 h-24 mb-5 drop-shadow-xl" />

                    {/* App Name & Version */}
                    <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{appName}</h2>
                    <p className="text-sm font-medium mb-6" style={{ color: 'var(--color-text-secondary)' }}>Version {appVersion}</p>

                    {/* Description */}
                    <p className="text-xs mb-8 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                        A modern, secure, and open-source password manager designed for simplicity and privacy.
                    </p>

                    {/* Links */}
                    <div className="w-full space-y-3">
                        <a
                            href="https://github.com/daocatt/keedavault"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2 px-4 text-xs font-medium border rounded-lg transition-colors group"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-light)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                        >
                            <Github size={14} className="mr-2 group-hover:text-gray-900" style={{ color: 'var(--color-text-secondary)' }} />
                            GitHub Repository
                        </a>
                        <a
                            href="https://keedavault.zwq.me"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2 px-4 text-xs font-medium border rounded-lg transition-colors group"
                            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-light)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
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
        </div>
    );
};
