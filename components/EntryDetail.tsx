import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { X, Copy, Eye, EyeOff, ExternalLink, Clock, Edit } from 'lucide-react';
import * as OTPAuth from 'otpauth';
import { useToast } from './ui/Toaster';
import { CreateEntryModal } from './CreateEntryModal';

interface EntryDetailProps {
    entryId: string;
    onClose: () => void;
}

const CopyButton: React.FC<{ text: string, label?: string }> = ({ text, label }) => {
    const { addToast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        addToast({ id: Date.now().toString(), title: `${label || 'Text'} copied to clipboard`, type: 'success' });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Copy"
        >
            {copied ? <span className="text-green-600 text-xs font-bold">Copied</span> : <Copy size={16} />}
        </button>
    );
}

const TOTPDisplay: React.FC<{ url: string }> = ({ url }) => {
    const [code, setCode] = useState<string>('--- ---');
    const [period, setPeriod] = useState<number>(30);
    const [timeLeft, setTimeLeft] = useState<number>(0);

    const { addToast } = useToast();

    useEffect(() => {
        let totp: OTPAuth.TOTP;
        try {
            const parsed = OTPAuth.URI.parse(url);
            if (parsed instanceof OTPAuth.TOTP) {
                totp = parsed;
                setPeriod(totp.period);
            } else {
                return;
            }
        } catch (e) {
            return;
        }

        const update = () => {
            try {
                setCode(totp.generate());
                const epoch = Math.round(new Date().getTime() / 1000.0);
                setTimeLeft(totp.period - (epoch % totp.period));
            } catch (e) {
                setCode('Error');
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [url]);

    const handleDoubleClick = () => {
        if (!code || code === '--- ---' || code === 'Error') return;
        navigator.clipboard.writeText(code);
        addToast({ title: '2FA Code copied', type: 'success' });
    };

    return (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 mt-4">
            <div className="flex justify-between items-center mb-1">
                <div className="text-xs font-mono text-gray-300 uppercase tracking-wider flex items-center">
                    2FA Code
                </div>
                <div className="text-xs text-indigo-400 font-mono">{timeLeft}s</div>
            </div>
            <div className="flex items-center justify-between">
                <div
                    className="font-mono text-2xl font-bold text-gray-800 tracking-widest cursor-pointer select-none"
                    onDoubleClick={handleDoubleClick}
                    title="Double click to copy"
                >
                    {code.slice(0, 3)} {code.slice(3)}
                </div>
                <CopyButton text={code} label="2FA Code" />
            </div>
            <div className="w-full bg-gray-200 h-1 mt-2 rounded-full overflow-hidden">
                <div
                    className="bg-indigo-500 h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / period) * 100}%` }}
                />
            </div>
        </div>
    );
};

export const EntryDetail: React.FC<EntryDetailProps> = ({ entryId, onClose }) => {
    const { getEntry } = useVault();
    const { addToast } = useToast();
    const entry = getEntry(entryId);
    const [showPassword, setShowPassword] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (!entry) return null;

    const FieldRow: React.FC<{ label: string, value: string, isSecret?: boolean, type?: 'link' | 'text' }> = ({ label, value, isSecret, type = 'text' }) => {
        const handleDoubleClick = () => {
            if (!value) return;
            navigator.clipboard.writeText(value);
            addToast({ title: `${label} copied`, type: 'success' });
        };

        return (
            <div className="mb-3 group">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-0.5">{label}</label>
                <div
                    className="flex items-center bg-white border border-gray-200 rounded-md px-2.5 py-1 shadow-sm group-hover:border-indigo-300 transition-colors relative cursor-pointer"
                    onDoubleClick={handleDoubleClick}
                    title="Double click to copy"
                >
                    {type === 'link' && value ? (
                        <a href={value} target="_blank" rel="noreferrer" className="flex-1 text-blue-600 hover:underline truncate text-xs" onClick={e => e.stopPropagation()}>
                            {value}
                        </a>
                    ) : (
                        <div className="flex-1 text-xs text-gray-800 truncate font-mono select-none">
                            {isSecret && !showPassword ? '••••••••••••••••' : value || <span className="text-gray-300 italic">Empty</span>}
                        </div>
                    )}

                    <div className="flex items-center space-x-1 ml-2">
                        {isSecret && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowPassword(!showPassword); }}
                                className="p-1.5 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        )}
                        {value && (
                            <div onClick={e => e.stopPropagation()}>
                                <CopyButton text={value} label={label} />
                            </div>
                        )}
                        {type === 'link' && value && (
                            <a href={value} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-gray-600" onClick={e => e.stopPropagation()}>
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-sidebar)', boxShadow: 'var(--shadow-xl)' }}>
            {/* Header Toolbar - Aligned with Traffic Lights */}
            <div className="h-10 flex items-center justify-between px-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-bg-primary)' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Entry Details</h2>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-1.5 rounded-md transition-all duration-200"
                        style={{ color: 'var(--color-text-secondary)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                            e.currentTarget.style.color = 'var(--color-accent)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                        title="Edit Entry"
                    >
                        <Edit size={16} />
                    </button>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md transition-all duration-200 md:hidden"
                        style={{ color: 'var(--color-text-secondary)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                            e.currentTarget.style.color = 'var(--color-text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-md mx-auto">
                    <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mr-3 flex-shrink-0">
                            <span className="text-lg font-bold">{entry.title.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 break-all leading-tight">{entry.title}</h1>
                            {/* <p className="text-xs text-gray-500">{entry.username}</p> */}
                        </div>
                    </div>

                    {entry.expiryTime && (
                        <div className="mb-3 bg-orange-50 px-3 py-2 rounded-lg border border-orange-100">
                            <div className="flex items-center text-xs text-orange-600 mb-1">
                                <Clock size={14} className="mr-1 flex-shrink-0" />
                                <span className="font-semibold">Expires</span>
                            </div>
                            <div className="text-xs text-orange-700 font-medium">
                                {entry.expiryTime.toLocaleString()}
                            </div>
                        </div>
                    )}

                    <FieldRow label="Username" value={entry.username} />
                    {entry.fields['Email'] && <FieldRow label="Email" value={entry.fields['Email']} />}
                    <FieldRow label="Password" value={entry.password || ''} isSecret />
                    <FieldRow label="Website" value={entry.url} type="link" />

                    {/* TOTP Section */}
                    {entry.otpUrl && <TOTPDisplay url={entry.otpUrl} />}

                    {/* Notes */}
                    <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notes</label>
                        <div className="bg-yellow-50/50 border border-yellow-100 rounded-md p-2 text-xs text-gray-700 min-h-[60px] whitespace-pre-wrap">
                            {entry.notes || <span className="text-gray-400 italic">No notes available.</span>}
                        </div>
                    </div>

                    {/* Custom Fields */}
                    {Object.keys(entry.fields).length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Attributes</h3>
                            {Object.entries(entry.fields).map(([k, v]) => {
                                if (['Title', 'UserName', 'Password', 'URL', 'Notes', 'otp', 'Email'].includes(k)) return null;
                                return <FieldRow key={k} label={k} value={v} />;
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Meta Information */}
            <div className="px-4 pb-4 pt-2">
                <div className="max-w-md mx-auto pt-3 border-t border-gray-200 text-[10px] text-gray-400 space-y-1 font-mono">
                    <div className="flex justify-between items-center">
                        <span className="uppercase tracking-wider font-semibold">Created</span>
                        <span>{entry.creationTime.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="uppercase tracking-wider font-semibold">Modified</span>
                        <span>{entry.lastModTime.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center group">
                        <span className="uppercase tracking-wider font-semibold">UUID</span>
                        <span className="select-all cursor-text hover:text-gray-600 transition-colors" title="Click to select">{entry.uuid}</span>
                    </div>
                </div>
            </div>



            <CreateEntryModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                editEntry={entry}
            />
        </div>
    );
};