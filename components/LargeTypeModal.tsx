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

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-700">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center space-y-8">
                    {/* Large Password Display */}
                    <div className="text-center w-full">
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Password</div>
                        <div className="text-5xl font-mono font-bold break-all leading-tight tracking-wide bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-inner select-all cursor-text">
                            {renderColorfulText(text)}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center">
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">QR Code</div>
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
