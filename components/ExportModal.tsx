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
            <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden border border-gray-200/60 shadow-2xl transform transition-all">
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">
                        {type === 'database' ? 'Export Database' : 'Export Selected Entries'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5">
                    <p className="text-sm text-gray-500 mb-4">
                        Choose the format you want to export your data to:
                    </p>

                    <div className="space-y-3">
                        <label
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${format === 'kdbx'
                                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="export-format"
                                value="kdbx"
                                checked={format === 'kdbx'}
                                onChange={() => setFormat('kdbx')}
                                className="sr-only"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${format === 'kdbx' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                <Database size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">KeePass Database (.kdbx)</div>
                                <div className="text-xs text-gray-500">Encrypted, compatible with other KeePass apps</div>
                            </div>
                        </label>

                        <label
                            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${format === 'csv'
                                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <input
                                type="radio"
                                name="export-format"
                                value="csv"
                                checked={format === 'csv'}
                                onChange={() => setFormat('csv')}
                                className="sr-only"
                            />
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${format === 'csv' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                }`}>
                                <FileText size={16} />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">CSV File (.csv)</div>
                                <div className="text-xs text-gray-500">Plain text, readable by spreadsheet apps</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
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
