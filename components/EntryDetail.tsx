import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { settingsStore } from '../services/settingsStore';
import { X, Copy, Eye, EyeOff, ExternalLink, Clock, Edit, ZoomIn, Maximize2, Minimize2, Paperclip, Download, FileText, History, Rows2 } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import * as OTPAuth from 'otpauth';
import { useToast } from './ui/Toaster';
import { CreateEntryModal } from './CreateEntryModal';
import { formatDistanceToNow } from 'date-fns';
import { VaultEntry } from '../types';
import { auditPassword } from '../utils/passwordAudit';

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
            {copied ? <Copy size={16} className="text-green-600" fill="currentColor" /> : <Copy size={16} />}
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

interface FieldRowProps {
    label: string;
    value: string;
    isSecret?: boolean;
    type?: 'link' | 'text';
    onLargeType?: () => void;
    isRevealed?: boolean;
    onToggleReveal?: () => void;
    onHistory?: () => void;
    showAudit?: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, isSecret, type = 'text', onLargeType, isRevealed, onToggleReveal, onHistory, showAudit }) => {
    const { addToast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);

    const audit = showAudit && value ? auditPassword(value) : null;

    const handleDoubleClick = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        addToast({ title: `${label} copied`, type: 'success' });
    };

    const showFull = isExpanded || (isSecret && isRevealed);

    return (
        <div className="mb-3 group">
            <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">{label}</label>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onHistory && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onHistory(); }}
                            className="p-0.5 text-gray-400 hover:text-indigo-600"
                            title="View History"
                        >
                            <History size={16} />
                        </button>
                    )}
                    {onLargeType && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLargeType(); }}
                            className="p-0.5 text-gray-400 hover:text-indigo-600"
                            title="Large Type"
                        >
                            <ZoomIn size={16} />
                        </button>
                    )}
                </div>
            </div>
            <div
                className="flex items-center bg-white border border-gray-200 rounded-md px-2.5 py-1 shadow-sm group-hover:border-indigo-300 transition-colors relative cursor-pointer"
                onDoubleClick={handleDoubleClick}
                title="Double click to copy"
            >
                {type === 'link' && value ? (
                    <a href={value} target="_blank" rel="noreferrer" className={`flex-1 text-blue-600 hover:underline text-xs ${showFull ? 'break-all whitespace-pre-wrap' : 'truncate'}`} onClick={e => e.stopPropagation()}>
                        {value}
                    </a>
                ) : (
                    <div className={`flex-1 text-xs text-gray-900 font-mono select-none ${showFull ? 'break-all whitespace-pre-wrap' : 'truncate'}`}>
                        {isSecret && !isRevealed ? '••••••••••••••••' : value || <span className="text-gray-300 italic">Empty</span>}
                    </div>
                )}

                <div className="flex items-center space-x-1 ml-2">
                    {isSecret && onToggleReveal && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleReveal(); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600"
                        >
                            {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
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
                    {value && value.length > 30 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600"
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                    )}
                </div>
            </div>
            {
                audit && (
                    <div className="mt-1 flex items-center space-x-2 px-1">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${audit.color.replace('text-', 'bg-')} transition-all duration-500`}
                                style={{ width: `${audit.score}%` }}
                            />
                        </div>
                        <span className={`text-[10px] font-medium ${audit.color}`}>
                            {audit.label} ({audit.entropy} bits)
                        </span>
                    </div>
                )
            }
        </div >
    );
};

const PasswordHistoryModal: React.FC<{ history: VaultEntry[], onClose: () => void }> = ({ history, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Password History</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                </div>
                <div className="overflow-y-auto px-4 py-2">
                    {history.length === 0 ? (
                        <p className="text-center text-gray-500 text-sm py-4">No history available.</p>
                    ) : (
                        history.slice().reverse().map((entry, index) => (
                            <div key={entry.uuid || index} className="py-3 border-b border-gray-100 last:border-0">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-gray-500">
                                        {entry.lastModTime.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        {formatDistanceToNow(entry.lastModTime, { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <code className="text-xs font-mono text-gray-800 break-all mr-2">{entry.password || '<empty>'}</code>
                                    <CopyButton text={entry.password || ''} label="Old Password" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export const EntryDetail: React.FC<EntryDetailProps> = ({ entryId, onClose }) => {
    const { getEntry } = useVault();
    const { addToast } = useToast();
    const entry = getEntry(entryId);
    const [showPassword, setShowPassword] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ name: string; url: string } | null>(null);
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    // ...

    const [columnMenuPosition, setColumnMenuPosition] = useState({ x: 0, y: 0 });

    // Default settings
    const [visibleFields, setVisibleFields] = useState<{
        username: boolean;
        email: boolean;
        password: boolean;
        url: boolean;
        totp: boolean;
        expires: boolean;
        notes: boolean;
        attributes: boolean;
        files: boolean;
    }>({
        username: true,
        email: true,
        password: true,
        url: true,
        totp: true,
        expires: true,
        notes: true,
        attributes: true,
        files: true
    });

    useEffect(() => {
        const loadSettings = async () => {
            const saved = await settingsStore.get<typeof visibleFields>('entryDetail_visibleFields');
            if (saved) {
                setVisibleFields(saved);
            }
        };
        loadSettings();
    }, []);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (!entry) return null;

    const isImageFile = (filename: string) => {
        const ext = filename.toLowerCase().split('.').pop();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext || '');
    };

    const toggleField = (field: keyof typeof visibleFields) => {
        setVisibleFields(prev => {
            const newState = { ...prev, [field]: !prev[field] };
            settingsStore.set('entryDetail_visibleFields', newState);
            return newState;
        });
    };

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--color-bg-sidebar)', boxShadow: 'var(--shadow-xl)' }}>
            {/* Header Toolbar - Aligned with Traffic Lights */}
            <div className="h-10 flex items-center px-3 flex-shrink-0" style={{
                borderBottom: '1px solid var(--color-border-light)',
                backgroundColor: 'var(--color-bg-primary)'
            } as React.CSSProperties}>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Entry Details</h2>

                {/* Middle Spacer - Layout */}
                <div className="flex-1 h-full" data-tauri-drag-region style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}></div>

                <div className="flex items-center space-x-1">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            setColumnMenuPosition({ x: window.innerWidth - rect.right, y: rect.bottom + 5 });
                            setShowColumnMenu(!showColumnMenu);
                        }}
                        className="p-1.5 rounded-md transition-all duration-200"
                        style={{
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer'
                        } as React.CSSProperties}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                            e.currentTarget.style.color = 'var(--color-accent)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }}
                        title="Column Settings"
                    >
                        <Rows2 size={16} />
                    </button>

                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-1.5 rounded-md transition-all duration-200"
                        style={{
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer'
                        } as React.CSSProperties}
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
                        style={{
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer'
                        } as React.CSSProperties}
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

                    {visibleFields.username && <FieldRow label="Username" value={entry.username} />}
                    {visibleFields.email && entry.fields['Email'] && <FieldRow label="Email" value={entry.fields['Email']} />}
                    {visibleFields.password && (
                        <FieldRow
                            label="Password"
                            value={entry.password || ''}
                            isSecret
                            showAudit={true}
                            isRevealed={showPassword}
                            onToggleReveal={() => setShowPassword(!showPassword)}
                            onHistory={entry.history && entry.history.length > 0 ? () => setShowHistory(true) : undefined}
                            onLargeType={() => {
                                const label = `large-type-${Date.now()}`;
                                const url = `index.html?mode=large-type&text=${encodeURIComponent(entry.password || '')}&title=${encodeURIComponent(entry.title)}&username=${encodeURIComponent(entry.username || '')}`;
                                new WebviewWindow(label, {
                                    url,
                                    title: entry.title,
                                    width: 800,
                                    height: 600,
                                    resizable: true,
                                    center: true,
                                    titleBarStyle: 'overlay',
                                    hiddenTitle: true,
                                    minimizable: false,
                                    maximizable: false
                                });
                            }}
                        />
                    )}
                    {visibleFields.url && <FieldRow label="URL" value={entry.url} type="link" />}

                    {/* TOTP Section */}
                    {visibleFields.totp && entry.otpUrl && <TOTPDisplay url={entry.otpUrl} />}

                    {/* Expiry Section */}
                    {visibleFields.expires && entry.expiryTime && (
                        <div className="mt-4 flex items-center p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs">
                            <Clock size={16} className="text-orange-500 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                                <div className="font-semibold text-orange-800 uppercase tracking-wider text-[10px] mb-0.5">Expires</div>
                                <div className="font-mono text-orange-900 font-medium">
                                    {entry.expiryTime.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {visibleFields.notes && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-gray-600 uppercase">Notes</label>
                                {entry.notes && (
                                    <button
                                        onClick={() => {
                                            const label = `markdown-preview-${Date.now()}`;
                                            const url = `index.html?mode=markdown-preview&title=${encodeURIComponent(entry.title)}&text=${encodeURIComponent(entry.notes)}`;
                                            new WebviewWindow(label, {
                                                url,
                                                title: `Notes - ${entry.title}`,
                                                width: 600,
                                                height: 800,
                                                resizable: true,
                                                center: true,
                                                titleBarStyle: 'overlay',
                                                hiddenTitle: true,
                                            });
                                        }}
                                        className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                                        title="Preview Markdown"
                                    >
                                        <FileText size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="bg-yellow-50/50 border border-yellow-100 rounded-md p-2 text-xs text-gray-900 min-h-[60px] whitespace-pre-wrap font-mono">
                                {entry.notes || <span className="text-gray-400 italic">No notes available.</span>}
                            </div>
                        </div>
                    )}

                    {/* Custom Fields */}
                    {visibleFields.attributes && Object.keys(entry.fields).length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Attributes</h3>
                            {Object.entries(entry.fields).map(([k, v]) => {
                                if (['Title', 'UserName', 'Password', 'URL', 'Notes', 'otp', 'Email'].includes(k)) return null;
                                return <FieldRow key={k} label={k} value={v} />;
                            })}
                        </div>
                    )}

                    {/* Attachments */}
                    {visibleFields.files && entry.attachments && entry.attachments.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Files</h3>
                            <div className="space-y-2">
                                {entry.attachments.map((att, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200 group hover:border-indigo-300 transition-colors">
                                        <div className="flex items-center overflow-hidden">
                                            <Paperclip size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                                            <span className="text-xs text-gray-700 truncate font-medium" title={att.name}>{att.name}</span>
                                            <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">({Math.round(att.data.byteLength / 1024)} KB)</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            {isImageFile(att.name) && (
                                                <button
                                                    onClick={() => {
                                                        const blob = new Blob([att.data]);
                                                        const url = URL.createObjectURL(blob);
                                                        setPreviewImage({ name: att.name, url });
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                    title="Preview"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    const blob = new Blob([att.data]);
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = att.name;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                title="Download"
                                            >
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Meta Information */}
            <div className="px-4 pb-4 pt-2">
                <div className="max-w-md mx-auto pt-3 border-t border-gray-200 text-[10px] text-gray-500 space-y-1 font-mono">
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

            {showHistory && entry.history && (
                <PasswordHistoryModal
                    history={entry.history}
                    onClose={() => setShowHistory(false)}
                />
            )}

            {previewImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
                    onClick={() => {
                        URL.revokeObjectURL(previewImage.url);
                        setPreviewImage(null);
                    }}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                URL.revokeObjectURL(previewImage.url);
                                setPreviewImage(null);
                            }}
                            className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300 transition-colors"
                            title="Close"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={previewImage.url}
                            alt={previewImage.name}
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                        <div className="absolute -bottom-10 left-0 right-0 text-center text-white text-sm">
                            {previewImage.name}
                        </div>
                    </div>
                </div>
            )}

            {/* Column Settings Menu */}
            {showColumnMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowColumnMenu(false)}
                    />
                    <div
                        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px]"
                        style={{
                            right: `${columnMenuPosition.x}px`,
                            top: `${columnMenuPosition.y}px`
                        }}
                    >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-1">
                            Column Settings
                        </div>
                        {[
                            { key: 'username' as const, label: 'Username' },
                            { key: 'email' as const, label: 'Email' },
                            { key: 'password' as const, label: 'Password' },
                            { key: 'url' as const, label: 'URL' },
                            { key: 'totp' as const, label: '2FA Code' },
                            { key: 'expires' as const, label: 'Expires' },
                            { key: 'notes' as const, label: 'Notes' },
                            { key: 'attributes' as const, label: 'Attributes' },
                            { key: 'files' as const, label: 'Files' }
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => toggleField(key)}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center transition-colors"
                            >
                                <div className="w-4 h-4 border border-gray-300 rounded mr-2 flex items-center justify-center flex-shrink-0">
                                    {visibleFields[key] && (
                                        <div className="w-2 h-2 bg-indigo-600 rounded-sm" />
                                    )}
                                </div>
                                <span className={visibleFields[key] ? 'text-gray-900' : 'text-gray-400'}>
                                    {label}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};