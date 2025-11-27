import React, { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, X } from 'lucide-react';

interface PasswordGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (password: string) => void;
    showCopyButton?: boolean;
    className?: string;
}

const WORD_LIST = [
    'apple', 'banana', 'cherry', 'dragon', 'elephant', 'falcon', 'giraffe', 'hammer',
    'island', 'jungle', 'kitten', 'lemon', 'mountain', 'notebook', 'ocean', 'penguin',
    'quantum', 'rainbow', 'sunset', 'thunder', 'umbrella', 'volcano', 'whisper', 'xylophone',
    'yellow', 'zebra', 'anchor', 'bridge', 'castle', 'diamond', 'emerald', 'forest',
    'galaxy', 'horizon', 'iceberg', 'jasmine', 'knight', 'lantern', 'meadow', 'nebula',
    'orchid', 'palace', 'quartz', 'river', 'sapphire', 'temple', 'universe', 'valley',
    'waterfall', 'crystal', 'phoenix', 'shadow', 'thunder', 'wisdom', 'zenith', 'aurora'
];

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ isOpen, onClose, onGenerate, showCopyButton = true, className }) => {
    const [mode, setMode] = useState<'password' | 'passphrase'>('password');
    const [length, setLength] = useState(20);
    const [wordCount, setWordCount] = useState(4);
    const [separator, setSeparator] = useState('-');
    const [useUppercase, setUseUppercase] = useState(true);
    const [useLowercase, setUseLowercase] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            generatePassword();
        }
    }, [isOpen, mode, length, wordCount, separator, useUppercase, useLowercase, useNumbers, useSymbols]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const generatePassword = () => {
        if (mode === 'passphrase') {
            const words: string[] = [];
            for (let i = 0; i < wordCount; i++) {
                const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
                words.push(word.charAt(0).toUpperCase() + word.slice(1));
            }
            setGeneratedPassword(words.join(separator));
        } else {
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

            let chars = '';
            if (useUppercase) chars += uppercase;
            if (useLowercase) chars += lowercase;
            if (useNumbers) chars += numbers;
            if (useSymbols) chars += symbols;

            if (chars === '') {
                setGeneratedPassword('');
                return;
            }

            let password = '';
            for (let i = 0; i < length; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            setGeneratedPassword(password);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleUse = () => {
        navigator.clipboard.writeText(generatedPassword);
        onGenerate(generatedPassword);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={className || "absolute top-12 left-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-3"} ref={modalRef}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password Generator</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 mb-2">
                <button
                    type="button"
                    onClick={() => setMode('password')}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors ${mode === 'password'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Password
                </button>
                <button
                    type="button"
                    onClick={() => setMode('passphrase')}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors ${mode === 'passphrase'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Passphrase
                </button>
            </div>

            {/* Generated Password Display */}
            <div className="bg-gray-100 p-2 rounded-lg mb-2 min-h-[40px] flex items-center justify-between group relative">
                <span className="font-mono text-sm text-gray-800 break-all mr-2 flex-1 leading-tight">{generatedPassword}</span>
                <div className="flex space-x-0.5">
                    <button
                        type="button"
                        onClick={generatePassword}
                        className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white rounded shadow-sm transition-all"
                        title="Regenerate"
                    >
                        <RefreshCw size={14} />
                    </button>
                    {showCopyButton && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white rounded shadow-sm transition-all"
                            title="Copy"
                        >
                            {copied ? <span className="text-[10px] font-bold text-green-600">✓</span> : <Copy size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-3">
                {mode === 'password' ? (
                    <>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                <span>Length</span>
                                <span>{length}</span>
                            </div>
                            <input
                                type="range"
                                min="8"
                                max="64"
                                value={length}
                                onChange={(e) => setLength(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 block"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useUppercase}
                                    onChange={(e) => setUseUppercase(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs text-gray-600">A-Z</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useLowercase}
                                    onChange={(e) => setUseLowercase(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs text-gray-600">a-z</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useNumbers}
                                    onChange={(e) => setUseNumbers(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs text-gray-600">0-9</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useSymbols}
                                    onChange={(e) => setUseSymbols(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs text-gray-600">!@#</span>
                            </label>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                <span>Word Count</span>
                                <span>{wordCount}</span>
                            </div>
                            <input
                                type="range"
                                min="3"
                                max="8"
                                value={wordCount}
                                onChange={(e) => setWordCount(parseInt(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 block"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Separator</label>
                            <div className="flex gap-1">
                                {['-', '_', '.', ' '].map(sep => (
                                    <button
                                        key={sep}
                                        type="button"
                                        onClick={() => setSeparator(sep)}
                                        className={`flex-1 py-1 px-1 rounded text-xs font-mono ${separator === sep
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {sep === ' ' ? 'spc' : sep}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Use Button */}
            <button
                type="button"
                onClick={handleUse}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
                Use Password
            </button>
        </div>
    );
};
