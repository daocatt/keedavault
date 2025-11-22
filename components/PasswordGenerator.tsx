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
        <div className={className || "absolute top-12 left-0 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-5"} ref={modalRef}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Password Generator</h3>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setMode('password')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${mode === 'password'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Password
                </button>
                <button
                    type="button"
                    onClick={() => setMode('passphrase')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${mode === 'passphrase'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Passphrase
                </button>
            </div>

            {/* Generated Password Display */}
            <div className="bg-gray-100 p-3 rounded-lg mb-4 min-h-[60px] flex items-center justify-between group relative">
                <span className="font-mono text-base text-gray-800 break-all mr-2 flex-1">{generatedPassword}</span>
                <div className="flex space-x-1">
                    <button
                        type="button"
                        onClick={generatePassword}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded shadow-sm transition-all"
                        title="Regenerate"
                    >
                        <RefreshCw size={16} />
                    </button>
                    {showCopyButton && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded shadow-sm transition-all"
                            title="Copy"
                        >
                            {copied ? <span className="text-xs font-bold text-green-600">✓</span> : <Copy size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-4">
                {mode === 'password' ? (
                    <>
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Length</span>
                                <span>{length}</span>
                            </div>
                            <input
                                type="range"
                                min="8"
                                max="64"
                                value={length}
                                onChange={(e) => setLength(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useUppercase}
                                    onChange={(e) => setUseUppercase(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-600">A-Z</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useLowercase}
                                    onChange={(e) => setUseLowercase(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-600">a-z</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useNumbers}
                                    onChange={(e) => setUseNumbers(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-600">0-9</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useSymbols}
                                    onChange={(e) => setUseSymbols(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-600">!@#</span>
                            </label>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Word Count</span>
                                <span>{wordCount}</span>
                            </div>
                            <input
                                type="range"
                                min="3"
                                max="8"
                                value={wordCount}
                                onChange={(e) => setWordCount(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Separator</label>
                            <div className="flex gap-2">
                                {['-', '_', '.', ' '].map(sep => (
                                    <button
                                        key={sep}
                                        type="button"
                                        onClick={() => setSeparator(sep)}
                                        className={`flex-1 py-1.5 px-2 rounded text-sm font-mono ${separator === sep
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {sep === ' ' ? 'space' : sep}
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
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
                Use Password
            </button>
        </div>
    );
};
