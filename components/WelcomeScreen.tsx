import React from 'react';
import { VaultAuthForm } from './VaultAuthForm';
import appIcon from '../app-icon.png';

export const WelcomeScreen: React.FC = () => {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 flex-col items-center justify-center relative" onContextMenu={(e) => e.preventDefault()}>
            <div className="flex flex-col items-center justify-center w-full max-w-md p-6 z-10">
                <div className="mb-6 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10 p-3">
                        <img src={appIcon} alt="KeedaVault Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">KeedaVault</h1>
                    <p className="text-sm text-gray-500 mt-1 text-center">Secure, local, and private password manager.</p>
                </div>

                <div className="w-full bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                    <VaultAuthForm hideHeader={true} />
                </div>
            </div>

            <div className="absolute bottom-4 text-center text-[10px] text-gray-400">
                <p>KeedaVault v0.1.0</p>
            </div>
        </div>
    );
};
