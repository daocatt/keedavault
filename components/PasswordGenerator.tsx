import React, { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, X } from 'lucide-react';
import { EFF_LARGE_WORDLIST } from '../services/effLargeWordlist';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';

interface PasswordGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (password: string) => void;
    showCopyButton?: boolean;
    className?: string;
    closeOnOutsideClick?: boolean;
    showUseButton?: boolean;
}



const AVAILABLE_SPECIAL_CHARS = '!@#$%^&*()-_=+[]{};:,.<>?';

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ isOpen, onClose, onGenerate, showCopyButton = true, className, closeOnOutsideClick = true, showUseButton = true }) => {
    const [mode, setMode] = useState<'password' | 'passphrase'>('password');
    const [length, setLength] = useState(20);
    const [wordCount, setWordCount] = useState(4);
    const [separator, setSeparator] = useState('-');
    const [useUppercase, setUseUppercase] = useState(true);
    const [useLowercase, setUseLowercase] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [specialChars, setSpecialChars] = useState('^!#&@$%*+-_()<>');
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await getUISettings();
            if (settings.passwordGenerator?.specialChars) {
                setSpecialChars(settings.passwordGenerator.specialChars);
            }
        };
        loadSettings();
    }, []);

    useEffect(() => {
        if (isOpen) {
            generatePassword();
        }
    }, [isOpen, mode, length, wordCount, separator, useUppercase, useLowercase, useNumbers, useSymbols, specialChars]);

    const saveSpecialChars = async (newChars: string) => {
        setSpecialChars(newChars);
        const settings = await getUISettings();
        await saveUISettings({
            ...settings,
            passwordGenerator: {
                ...settings.passwordGenerator,
                specialChars: newChars
            }
        });
    };

    // Close on click outside
    useEffect(() => {
        if (!closeOnOutsideClick) return;

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
    }, [isOpen, onClose, closeOnOutsideClick]);

    const generatePassword = () => {
        if (mode === 'passphrase') {
            const words: string[] = [];
            for (let i = 0; i < wordCount; i++) {
                const word = EFF_LARGE_WORDLIST[Math.floor(Math.random() * EFF_LARGE_WORDLIST.length)];
                words.push(word.charAt(0).toUpperCase() + word.slice(1));
            }
            setGeneratedPassword(words.join(separator));
        } else {
            const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lowercase = 'abcdefghijklmnopqrstuvwxyz';
            const numbers = '0123456789';
            const symbols = specialChars;

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
        <div className={className || "absolute top-12 left-0 z-50 w-80 rounded-xl shadow-2xl border p-3"} style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }} ref={modalRef}>
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-primary)' }}>Password Generator</h3>
                <button type="button" onClick={onClose} className="transition-colors hover:text-gray-900 dark:hover:text-white" style={{ color: 'var(--color-text-tertiary)' }}>
                    <X size={14} strokeWidth={1.5} />
                </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 mb-2">
                <button
                    type="button"
                    onClick={() => setMode('password')}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors ${mode === 'password'
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    style={mode !== 'password' ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' } : {}}
                >
                    Password
                </button>
                <button
                    type="button"
                    onClick={() => setMode('passphrase')}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-colors ${mode === 'passphrase'
                        ? 'bg-indigo-600 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    style={mode !== 'passphrase' ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' } : {}}
                >
                    Diceware
                </button>
            </div>

            {/* Generated Password Display */}
            <div className="p-2 rounded-lg mb-2 flex items-start justify-between group relative" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <textarea
                    value={generatedPassword}
                    onChange={(e) => setGeneratedPassword(e.target.value)}
                    className="font-mono text-sm bg-transparent border-none focus:ring-0 flex-1 mr-2 outline-none min-w-0 resize-none h-16 leading-tight"
                    style={{ color: 'var(--color-text-primary)' }}
                    spellCheck={false}
                />
                <div className="flex flex-col space-y-1">
                    <button
                        type="button"
                        onClick={generatePassword}
                        className="p-1 rounded shadow-sm transition-all hover:text-indigo-600"
                        style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'}
                        title="Regenerate"
                    >
                        <RefreshCw size={14} strokeWidth={1.5} />
                    </button>
                    {showCopyButton && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="p-1 rounded shadow-sm transition-all hover:text-indigo-600"
                            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-primary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-primary)'}
                            title="Copy"
                        >
                            {copied ? <span className="text-[10px] font-bold text-green-600">✓</span> : <Copy size={14} strokeWidth={1.5} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-3">
                {mode === 'password' ? (
                    <>
                        <div>
                            <div className="flex justify-between text-[10px] mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                <span>Length</span>
                                <span>{length}</span>
                            </div>
                            <input
                                type="range"
                                min="8"
                                max="64"
                                value={length}
                                onChange={(e) => setLength(parseInt(e.target.value))}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 block"
                                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-1">
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useUppercase}
                                    onChange={(e) => setUseUppercase(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>A-Z</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useLowercase}
                                    onChange={(e) => setUseLowercase(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>a-z</span>
                            </label>
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useNumbers}
                                    onChange={(e) => setUseNumbers(e.target.checked)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                />
                                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>0-9</span>
                            </label>
                        </div>
                        <div className="mt-2">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="flex items-center space-x-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useSymbols}
                                        onChange={(e) => setUseSymbols(e.target.checked)}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                    />
                                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Symbols</span>
                                </label>
                                {useSymbols && (
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => saveSpecialChars(AVAILABLE_SPECIAL_CHARS)}
                                            className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            All
                                        </button>
                                        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>|</span>
                                        <button
                                            type="button"
                                            onClick={() => saveSpecialChars('')}
                                            className="text-[10px] hover:text-gray-700 dark:hover:text-gray-300"
                                            style={{ color: 'var(--color-text-tertiary)' }}
                                        >
                                            None
                                        </button>
                                    </div>
                                )}
                            </div>

                            {useSymbols && (
                                <div className="flex flex-wrap gap-1 p-2 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
                                    {AVAILABLE_SPECIAL_CHARS.split('').map(char => (
                                        <button
                                            key={char}
                                            type="button"
                                            onClick={() => {
                                                const newChars = specialChars.includes(char)
                                                    ? specialChars.replace(char, '')
                                                    : specialChars + char;
                                                saveSpecialChars(newChars);
                                            }}
                                            className={`w-5 h-5 flex items-center justify-center text-[10px] rounded font-mono transition-all ${specialChars.includes(char)
                                                ? 'bg-indigo-600 text-white shadow-sm border border-indigo-600'
                                                : 'border hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                            style={!specialChars.includes(char) ? { backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-tertiary)', borderColor: 'var(--color-border-medium)' } : {}}
                                        >
                                            {char}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <div className="flex justify-between text-[10px] mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                                <span>Word Count</span>
                                <span>{wordCount}</span>
                            </div>
                            <input
                                type="range"
                                min="3"
                                max="8"
                                value={wordCount}
                                onChange={(e) => setWordCount(parseInt(e.target.value))}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 block"
                                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] mb-1" style={{ color: 'var(--color-text-secondary)' }}>Separator</label>
                            <div className="flex gap-1">
                                {['-', '_', '.', ' '].map(sep => (
                                    <button
                                        key={sep}
                                        type="button"
                                        onClick={() => setSeparator(sep)}
                                        className={`flex-1 py-1 px-1 rounded text-xs font-mono ${separator === sep
                                            ? 'bg-indigo-600 text-white'
                                            : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        style={separator !== sep ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' } : {}}
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
            {
                showUseButton && (
                    <button
                        type="button"
                        onClick={handleUse}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                    >
                        Use Password
                    </button>
                )
            }
        </div >
    );
};
