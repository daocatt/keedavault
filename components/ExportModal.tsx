import React, { useState } from 'react';
import { X, FileText, Database } from 'lucide-react';

interface ExportModalProps {
    isOpen: boolean;
    type: 'database' | 'selected';
    onClose: () => void;
    onExport: (format: 'kdbx' | 'csv') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
    isOpen, type, onClose, onExport
}) => {
    const [format, setFormat] = useState<'kdbx' | 'csv'>('kdbx');

    if (!isOpen) return null;

    const handleExport = () => {
        onExport(format);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="rounded-xl w-full max-w-sm overflow-hidden border shadow-2xl transform transition-all" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {type === 'database' ? 'Export Database' : 'Export Selected Entries'}
                    </h3>
                    <button onClick={onClose} className="transition-colors p-1 rounded-md hover:bg-gray-100/10" style={{ color: 'var(--color-text-tertiary)' }}>
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5">
                    <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                        Choose the format you want to export your data to:
                    </p>

                    <div className="space-y-3">
                        <label
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${format === 'kdbx'
                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                : 'hover:border-gray-300'
                                }`}
                            style={format !== 'kdbx' ? { borderColor: 'var(--color-border-medium)', backgroundColor: 'var(--color-bg-secondary)' } : {}}
                        >
                            <input
                                type="radio"
                                name="export-format"
                                value="kdbx"
                                checked={format === 'kdbx'}
                                onChange={() => setFormat('kdbx')}
                                className="sr-only"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${format === 'kdbx' ? 'bg-indigo-100 text-indigo-600' : ''
                                }`}
                                style={format !== 'kdbx' ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' } : {}}
                            >
                                <Database size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>KeePass Database (.kdbx)</div>
                                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Encrypted, compatible with other KeePass apps</div>
                            </div>
                        </label>

                        <label
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${format === 'csv'
                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                : 'hover:border-gray-300'
                                }`}
                            style={format !== 'csv' ? { borderColor: 'var(--color-border-medium)', backgroundColor: 'var(--color-bg-secondary)' } : {}}
                        >
                            <input
                                type="radio"
                                name="export-format"
                                value="csv"
                                checked={format === 'csv'}
                                onChange={() => setFormat('csv')}
                                className="sr-only"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${format === 'csv' ? 'bg-indigo-100 text-indigo-600' : ''
                                }`}
                                style={format !== 'csv' ? { backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' } : {}}
                            >
                                <FileText size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>CSV File (.csv)</div>
                                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Plain text, readable by spreadsheet apps</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="px-4 py-3 border-t flex justify-end space-x-2" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-gray-200/60 rounded-md transition-colors"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md shadow-sm transition-all transform active:scale-95"
                    >
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
};
