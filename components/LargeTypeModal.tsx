import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface LargeTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    text: string;
    title: string;
}

export const LargeTypeModal: React.FC<LargeTypeModalProps> = ({ isOpen, onClose, text, title }) => {
    if (!isOpen) return null;

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

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="rounded-xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <div className="px-6 py-4 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-gray-200/20">
                        <X size={24} style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center space-y-8">
                    {/* Large Password Display */}
                    <div className="text-center w-full">
                        <div className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-tertiary)' }}>Password</div>
                        <div className="text-5xl font-mono font-bold break-all leading-tight tracking-wide p-6 rounded-xl border shadow-inner select-all cursor-text" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-medium)' }}>
                            {renderColorfulText(text)}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-tertiary)' }}>QR Code</div>
                        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                            <QRCodeSVG value={text} size={200} />
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
