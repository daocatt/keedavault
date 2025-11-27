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
            <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden border border-gray-200/60 shadow-2xl transform transition-all">
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Import Entries</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Select the source format to import from</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-md">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-3 gap-4">
                        {sortedOptions.map((option) => (
                            <label
                                key={option.id}
                                className={`relative flex items-center p-4 rounded-xl border transition-all h-24 group ${option.comingSoon
                                    ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                                    : `cursor-pointer ${source === option.id
                                        ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 shadow-sm'
                                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50 hover:shadow-sm'
                                    }`
                                    }`}
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
                                        ? 'bg-gray-100 text-gray-400'
                                        : source === option.id
                                            ? 'bg-indigo-100 text-indigo-600'
                                            : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'
                                        }`}
                                >
                                    <option.icon size={20} />
                                </div>
                                <div className="text-left">
                                    <div className={`text-sm font-semibold ${option.comingSoon
                                        ? 'text-gray-500'
                                        : source === option.id ? 'text-indigo-900' : 'text-gray-900'
                                        }`}>
                                        {option.label}
                                    </div>
                                    <div className={`text-xs ${option.comingSoon
                                        ? 'text-gray-400'
                                        : source === option.id ? 'text-indigo-600' : 'text-gray-500'
                                        }`}>
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

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
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
