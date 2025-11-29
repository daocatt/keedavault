import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { settingsStore } from '../services/settingsStore';
import { X, Copy, Eye, EyeOff, ExternalLink, Clock, Edit, ZoomIn, Maximize2, Minimize2, Paperclip, Download, FileText, History, Rows2, Check } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import * as OTPAuth from 'otpauth';
import { useToast } from './ui/Toaster';
import { CreateEntryModal } from './CreateEntryModal';
import { formatDistanceToNow } from 'date-fns';
import { VaultEntry } from '../types';
import { auditPassword } from '../utils/passwordAudit';
import { EntryIcon } from './EntryIcon';

interface EntryDetailProps {
    entryId: string;
    onClose: () => void;
}

const CopyButton: React.FC<{ text: string, label?: string }> = ({ text, label }) => {
    const { addToast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        document.dispatchEvent(new CustomEvent('clipboard-copy'));
        setCopied(true);
        addToast({ id: Date.now().toString(), title: `${label || 'Text'} copied to clipboard`, type: 'success' });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-accent)';
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
                e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Copy"
        >
            {copied ? <Copy size={16} strokeWidth={1.5} className="text-green-600" fill="currentColor" /> : <Copy size={16} strokeWidth={1.5} />}
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
        document.dispatchEvent(new CustomEvent('clipboard-copy'));
        addToast({ title: '2FA Code copied', type: 'success' });
    };

    return (

        <div className="border rounded-lg p-3 mt-4" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
            <div className="flex justify-between items-center mb-1">
                <div className="text-xs font-mono uppercase tracking-wider flex items-center" style={{ color: 'var(--color-text-tertiary)' }}>
                    2FA Code
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--color-accent)' }}>{timeLeft}s</div>
            </div>
            <div className="flex items-center justify-between">
                <div
                    className="font-mono text-2xl font-bold tracking-widest cursor-pointer select-none"
                    style={{ color: 'var(--color-text-primary)' }}
                    onDoubleClick={handleDoubleClick}
                    title="Double click to copy"
                >
                    {code.slice(0, 3)} {code.slice(3)}
                </div>
                <CopyButton text={code} label="2FA Code" />
            </div>
            <div className="w-full h-1 mt-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div
                    className="h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / period) * 100}%`, backgroundColor: 'var(--color-accent)' }}
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

const ColorizedPassword: React.FC<{ password: string }> = ({ password }) => {
    return (
        <>
            {password.split('').map((char, index) => {
                if (/[0-9]/.test(char)) {
                    return <span key={index} style={{ color: 'var(--color-accent)' }}>{char}</span>;
                } else if (/[^a-zA-Z0-9]/.test(char)) {
                    return <span key={index} style={{ color: '#f87171' }}>{char}</span>; // red-400 for better visibility in dark mode
                }
                return <span key={index}>{char}</span>;
            })}
        </>
    );
};

const FieldRow: React.FC<FieldRowProps> = ({ label, value, isSecret, type = 'text', onLargeType, isRevealed, onToggleReveal, onHistory, showAudit }) => {
    const { addToast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        settingsStore.get('keedavault_ui_settings').then(setSettings);
        const unlisten = listen('settings-changed', (event: any) => {
            setSettings(event.payload);
        });
        return () => { unlisten.then(f => f()); };
    }, []);

    const audit = showAudit && value ? auditPassword(value) : null;
    const colorize = isSecret && settings?.general?.colorizedPassword;

    const handleDoubleClick = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        document.dispatchEvent(new CustomEvent('clipboard-copy'));
        addToast({ title: `${label} copied`, type: 'success' });
    };

    const showFull = isExpanded || (isSecret && isRevealed);

    return (
        <div className="mb-3 group">
            <div className="flex justify-between items-center mb-0.5">
                <label className="block text-[10px] font-bold uppercase" style={{ color: 'var(--color-text-secondary)' }}>{label}</label>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onHistory && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onHistory(); }}
                            className="p-0.5 text-gray-400 hover:text-indigo-600"
                            title="View History"
                        >
                            <History size={16} strokeWidth={1.5} />
                        </button>
                    )}
                    {onLargeType && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onLargeType(); }}
                            className="p-0.5 hover:text-indigo-600"
                            style={{ color: 'var(--color-text-tertiary)' }}
                            title="Large Type"
                        >
                            <ZoomIn size={16} strokeWidth={1.5} />
                        </button>
                    )}
                </div>
            </div>
            <div
                className="flex items-center border rounded-md px-2.5 py-1 shadow-sm transition-colors relative cursor-pointer"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent-light)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border-light)'}
                onDoubleClick={handleDoubleClick}
                title="Double click to copy"
            >
                {type === 'link' && value ? (
                    <a href={value} target="_blank" rel="noreferrer" className={`flex-1 hover:underline text-xs ${showFull ? 'break-all whitespace-pre-wrap' : 'truncate'}`} style={{ color: 'var(--color-accent)' }} onClick={e => e.stopPropagation()}>
                        {value}
                    </a>
                ) : (
                    <div className={`flex-1 text-xs font-mono select-none ${showFull ? 'break-all whitespace-pre-wrap' : 'truncate'}`} style={{ color: 'var(--color-text-primary)' }}>
                        {isSecret && !isRevealed ? '••••••••••••••••' : (
                            value ? (
                                colorize && isSecret && isRevealed ? (
                                    <ColorizedPassword password={value} />
                                ) : (
                                    value
                                )
                            ) : <span className="italic" style={{ color: 'var(--color-text-placeholder)' }}>Empty</span>
                        )}
                    </div>
                )}

                <div className="flex items-center space-x-1 ml-2">
                    {isSecret && onToggleReveal && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleReveal(); }}
                            className="p-1.5"
                            style={{ color: 'var(--color-text-tertiary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                        >
                            {isRevealed ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                        </button>
                    )}
                    {value && (
                        <div onClick={e => e.stopPropagation()}>
                            <CopyButton text={value} label={label} />
                        </div>
                    )}
                    {type === 'link' && value && (
                        <a href={value} target="_blank" rel="noreferrer" className="p-1.5" style={{ color: 'var(--color-text-tertiary)' }} onClick={e => e.stopPropagation()}>
                            <ExternalLink size={16} strokeWidth={1.5} />
                        </a>
                    )}
                    {value && value.length > 30 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="p-1.5"
                            style={{ color: 'var(--color-text-tertiary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? <Minimize2 size={16} strokeWidth={1.5} /> : <Maximize2 size={16} strokeWidth={1.5} />}
                        </button>
                    )}
                </div>
            </div>
            {
                audit && (
                    <div className="mt-1 flex items-center space-x-2 px-1">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
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
            <div className="rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Password History</h3>
                    <button onClick={onClose} style={{ color: 'var(--color-text-tertiary)' }}>
                        <X size={16} strokeWidth={1.5} />
                    </button>
                </div>
                <div className="overflow-y-auto px-4 py-2">
                    {history.length === 0 ? (
                        <p className="text-center text-sm py-4" style={{ color: 'var(--color-text-tertiary)' }}>No history available.</p>
                    ) : (
                        history.slice().reverse().map((entry, index) => (
                            <div key={entry.uuid || index} className="py-3 border-b last:border-0" style={{ borderColor: 'var(--color-border-light)' }}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                        {entry.lastModTime.toLocaleString()}
                                    </span>
                                    <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                                        {formatDistanceToNow(entry.lastModTime, { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <code className="text-xs font-mono break-all mr-2" style={{ color: 'var(--color-text-primary)' }}>{entry.password || '<empty>'}</code>
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
    const { getEntry, getActiveGroup } = useVault();
    const { addToast } = useToast();
    const entry = getEntry(entryId);
    const activeGroup = getActiveGroup();
    const [showPassword, setShowPassword] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        settingsStore.get('keedavault_ui_settings').then(setSettings);
        const unlisten = listen('settings-changed', (event: any) => {
            setSettings(event.payload);
        });
        return () => { unlisten.then(f => f()); };
    }, []);
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
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColumnMenuPosition({ x: rect.left, y: rect.bottom + 5 });
                        setShowColumnMenu(!showColumnMenu);
                    }}
                    className="p-1.5 rounded-md transition-all duration-200 mr-2"
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
                    <Rows2 size={16} strokeWidth={1.5} />
                </button>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Entry Details</h2>

                {/* Middle Spacer - Layout */}
                <div className="flex-1 h-full" data-tauri-drag-region style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}></div>

                <div className="flex items-center space-x-1">


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
                        <Edit size={16} strokeWidth={1.5} />
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
                        <X size={16} strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-md mx-auto">
                    <div className="flex items-center mb-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 flex-shrink-0" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                            <EntryIcon entry={entry} group={activeGroup} size={24} className="text-gray-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold break-all leading-tight" style={{ color: 'var(--color-text-primary)' }}>{entry.title}</h1>
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
                        <div className="mt-4 flex items-center p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-light)' }}>
                            <Clock size={16} strokeWidth={1.5} className="mr-3 flex-shrink-0" style={{ color: '#f97316' }} />
                            <div className="flex-1">
                                <div className="font-semibold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: '#ea580c' }}>Expires</div>
                                <div className="font-mono font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                    {entry.expiryTime.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {visibleFields.notes && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium uppercase" style={{ color: 'var(--color-text-secondary)' }}>Notes</label>
                                {entry.notes && settings?.general?.markdownNotes && (
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
                                        <FileText size={14} strokeWidth={1.5} />
                                    </button>
                                )}
                            </div>
                            {settings?.general?.markdownNotes ? (
                                <div className="prose prose-sm max-w-none p-3 rounded-lg border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)', color: 'var(--color-text-primary)' }}>
                                    {/* Simple markdown rendering for now, can be replaced with react-markdown */}
                                    <div dangerouslySetInnerHTML={{
                                        __html: entry.notes
                                            .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold mb-2">$1</h1>')
                                            .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold mb-2">$1</h2>')
                                            .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold mb-1">$1</h3>')
                                            .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                                            .replace(/\*(.*)\*/gim, '<i>$1</i>')
                                            .replace(/`(.*?)`/gim, '<code class="bg-gray-200 px-1 rounded font-mono text-xs">$1</code>')
                                            .replace(/\n/gim, '<br />')
                                    }} />
                                </div>
                            ) : (
                                <div className="border rounded-md p-2 text-xs min-h-[60px] whitespace-pre-wrap font-mono" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)', color: 'var(--color-text-primary)' }}>
                                    {entry.notes || <span className="italic" style={{ color: 'var(--color-text-placeholder)' }}>No notes available.</span>}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Custom Fields */}
                    {visibleFields.attributes && Object.keys(entry.fields).length > 0 && (
                        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                            <h3 className="text-xs font-bold uppercase mb-4" style={{ color: 'var(--color-text-secondary)' }}>Attributes</h3>
                            {Object.entries(entry.fields).map(([k, v]) => {
                                if (['Title', 'UserName', 'Password', 'URL', 'Notes', 'otp', 'Email'].includes(k)) return null;
                                return <FieldRow key={k} label={k} value={v} />;
                            })}
                        </div>
                    )}

                    {/* Attachments */}
                    {visibleFields.files && entry.attachments && entry.attachments.length > 0 && (
                        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
                            <h3 className="text-xs font-bold uppercase mb-4" style={{ color: 'var(--color-text-secondary)' }}>Files</h3>
                            <div className="space-y-2">
                                {entry.attachments.map((att, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 rounded-md border transition-colors" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
                                        <div className="flex items-center overflow-hidden">
                                            <Paperclip size={14} strokeWidth={1.5} className="mr-2 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                                            <span className="text-xs truncate font-medium" style={{ color: 'var(--color-text-primary)' }} title={att.name}>{att.name}</span>
                                            <span className="text-[10px] ml-2 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>({Math.round(att.data.byteLength / 1024)} KB)</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            {isImageFile(att.name) && (
                                                <button
                                                    onClick={() => {
                                                        const blob = new Blob([att.data]);
                                                        const url = URL.createObjectURL(blob);
                                                        setPreviewImage({ name: att.name, url });
                                                    }}
                                                    className="p-1.5 rounded transition-colors"
                                                    style={{ color: 'var(--color-text-tertiary)' }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.color = 'var(--color-accent)';
                                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                    }}
                                                    title="Preview"
                                                >
                                                    <Eye size={14} strokeWidth={1.5} />
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
                                                className="p-1.5 rounded transition-colors"
                                                style={{ color: 'var(--color-text-tertiary)' }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.color = 'var(--color-accent)';
                                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                title="Download"
                                            >
                                                <Download size={14} strokeWidth={1.5} />
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
                <div className="max-w-md mx-auto pt-3 border-t text-[10px] space-y-1 font-mono" style={{ borderColor: 'var(--color-border-light)', color: 'var(--color-text-tertiary)' }}>
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
                        <span className="select-all cursor-text transition-colors" style={{ color: 'var(--color-text-tertiary)' }} title="Click to select">{entry.uuid}</span>
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
                            <X size={24} strokeWidth={1.5} />
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
                        className="fixed z-50 rounded-xl shadow-xl border py-1 w-48 backdrop-blur-md"
                        style={{
                            left: `${columnMenuPosition.x}px`,
                            top: `${columnMenuPosition.y}px`,
                            backgroundColor: 'var(--color-bg-primary)',
                            borderColor: 'var(--color-border-light)'
                        }}
                    >
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-50" style={{ color: 'var(--color-text-tertiary)' }}>
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
                                className="w-[calc(100%-8px)] mx-1 text-left px-2 py-1 text-sm flex items-center justify-between rounded-md transition-colors"
                                style={{ color: 'var(--color-text-primary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <span>{label}</span>
                                {visibleFields[key] && <Check size={14} strokeWidth={1.5} className="text-indigo-600" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};