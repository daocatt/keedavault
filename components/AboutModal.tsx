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
                className="bg-white rounded-2xl w-80 overflow-hidden shadow-2xl border border-gray-200/50 transform transition-all animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Close Button */}
                <div className="absolute top-3 right-3 z-10">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex flex-col items-center pt-10 pb-8 px-6 text-center">
                    {/* App Icon */}
                    <img src={logo} alt="App Logo" className="w-24 h-24 mb-5 drop-shadow-xl" />

                    {/* App Name & Version */}
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{appName}</h2>
                    <p className="text-sm text-gray-500 font-medium mb-6">Version {appVersion}</p>

                    {/* Description */}
                    <p className="text-xs text-gray-500 mb-8 leading-relaxed">
                        A modern, secure, and open-source password manager designed for simplicity and privacy.
                    </p>

                    {/* Links */}
                    <div className="w-full space-y-3">
                        <a
                            href="https://github.com/daocatt/keedavault"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2 px-4 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
                        >
                            <Github size={14} className="mr-2 text-gray-500 group-hover:text-gray-900" />
                            GitHub Repository
                        </a>
                        <a
                            href="https://keedavault.zwq.me"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2 px-4 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors group"
                        >
                            <Globe size={14} className="mr-2 text-gray-500 group-hover:text-blue-500" />
                            Release Note
                        </a>
                    </div>

                    {/* Footer / Credits */}
                    <div className="mt-8 pt-6 border-t border-gray-100 w-full">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Created By</p>
                        <p className="text-xs text-gray-600 font-medium">AI & Daocatt</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
