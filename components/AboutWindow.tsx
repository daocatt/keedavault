import React, { useEffect, useState } from 'react';
import { Github, Globe } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion, getName } from '@tauri-apps/api/app';
import appIcon from '../app-icon.png';

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
    }, []);

    return (
        <div className="h-screen w-screen bg-white flex flex-col items-center justify-center relative overflow-hidden select-none">
            {/* Draggable Region */}
            <div
                className="absolute inset-0 z-0"
                data-tauri-drag-region
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            />

            <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-6 text-center w-full max-w-xs">
                {/* App Icon */}
                <img src={appIcon} alt="App Logo" className="w-24 h-24 mb-5 drop-shadow-xl select-none pointer-events-none" />

                {/* App Name & Version */}
                <h2 className="text-xl font-bold text-gray-900 mb-1">{appName}</h2>
                <p className="text-sm text-gray-500 font-medium mb-6">Version {appVersion}</p>

                {/* Description */}
                <p className="text-xs text-gray-500 mb-8 leading-relaxed">
                    A modern, secure, and open-source password manager designed for simplicity and privacy.
                </p>

                {/* Links - Need no-drag to be clickable */}
                <div className="w-full space-y-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
    );
};
