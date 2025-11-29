import React, { useState } from 'react';
import { X, FileText, Database, FileJson, Shield, Chrome, Globe, Cloud, Key } from 'lucide-react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Supported import sources
    onImport: (
        source: 'kdbx' | 'csv' | 'bitwarden' | 'lastpass' | 'apple' | 'enpass' | '1password' | 'chrome' | 'firefox'
    ) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const [source, setSource] = useState<
        'kdbx' | 'csv' | 'bitwarden' | 'lastpass' | 'apple' | 'enpass' | '1password' | 'chrome' | 'firefox'
    >('kdbx');

    if (!isOpen) return null;

    const handleImport = () => {
        onImport(source);
        onClose();
    };

    const importOptions = [
        { id: 'kdbx', label: 'KeePass', sub: 'Database (.kdbx)', icon: Database, comingSoon: false },
        { id: 'csv', label: 'CSV File', sub: 'Generic (.csv)', icon: FileText, comingSoon: false },
        { id: 'bitwarden', label: 'Bitwarden', sub: 'Export (.json)', icon: Shield, comingSoon: false },
        { id: 'lastpass', label: 'LastPass', sub: 'Export (.csv)', icon: Shield, comingSoon: false },
        { id: '1password', label: '1Password', sub: 'Export (.csv)', icon: Key, comingSoon: true },
        { id: 'enpass', label: 'Enpass', sub: 'Export (.csv)', icon: Key, comingSoon: true },
        { id: 'apple', label: 'Apple/iCloud', sub: 'Keychain', icon: Cloud, comingSoon: false },
        { id: 'chrome', label: 'Chrome', sub: 'Passwords', icon: Chrome, comingSoon: false },
        { id: 'firefox', label: 'Firefox', sub: 'Passwords', icon: Globe, comingSoon: false },
    ] as const;

    // Sort options: available first, then coming soon
    const sortedOptions = [...importOptions].sort((a, b) => {
        if (a.comingSoon === b.comingSoon) return 0;
        return a.comingSoon ? 1 : -1;
    });

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="rounded-xl w-full max-w-3xl overflow-hidden border shadow-2xl transform transition-all" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                    <div>
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Import Entries</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Select the source format to import from</p>
                    </div>
                    <button onClick={onClose} className="transition-colors p-1.5 rounded-md hover:bg-gray-100/10" style={{ color: 'var(--color-text-tertiary)' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                        {sortedOptions.map((option) => (
                            <label
                                key={option.id}
                                className={`relative flex items-center p-4 rounded-xl border transition-all h-24 group ${option.comingSoon
                                    ? 'opacity-60 cursor-not-allowed'
                                    : `cursor-pointer ${source === option.id
                                        ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-sm'
                                        : 'hover:border-indigo-200 hover:shadow-sm'
                                    }`
                                    }`}
                                style={option.comingSoon ? { borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-tertiary)' } : (source !== option.id ? { borderColor: 'var(--color-border-medium)', backgroundColor: 'var(--color-bg-secondary)' } : {})}
                            >
                                <input
                                    type="radio"
                                    name="import-source"
                                    value={option.id}
                                    checked={source === option.id}
                                    onChange={() => !option.comingSoon && setSource(option.id as any)}
                                    disabled={option.comingSoon}
                                    className="sr-only"
                                />
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 transition-colors flex-shrink-0 ${option.comingSoon
                                        ? ''
                                        : source === option.id
                                            ? 'bg-indigo-100 text-indigo-600'
                                            : 'group-hover:bg-indigo-50 group-hover:text-indigo-500'
                                        }`}
                                    style={option.comingSoon ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' } : (source !== option.id ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' } : {})}
                                >
                                    <option.icon size={20} />
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-semibold ${option.comingSoon
                                        ? ''
                                        : source === option.id ? 'text-indigo-900' : ''
                                        }`}
                                        style={option.comingSoon ? { color: 'var(--color-text-tertiary)' } : (source !== option.id ? { color: 'var(--color-text-primary)' } : {})}
                                    >
                                        {option.label}
                                    </div>
                                    <div className={`text-xs ${option.comingSoon
                                        ? ''
                                        : source === option.id ? 'text-indigo-600' : ''
                                        }`}
                                        style={option.comingSoon ? { color: 'var(--color-text-tertiary)' } : (source !== option.id ? { color: 'var(--color-text-secondary)' } : {})}
                                    >
                                        {option.sub}
                                    </div>
                                </div>

                                {option.comingSoon && (
                                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-medium rounded-full uppercase tracking-wide">
                                        Soon
                                    </div>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 border-t flex justify-end space-x-3" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium hover:bg-gray-200/60 rounded-lg transition-colors"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all transform active:scale-95"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};
