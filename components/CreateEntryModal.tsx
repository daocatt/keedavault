import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Lock, Globe, FileText, Key, Mail, Clock, Folder, Wand2, Plus, Trash2, Paperclip, Pencil, ChevronDown } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useVault } from '../context/VaultContext';
import { PasswordGenerator } from './PasswordGenerator';
import { VaultEntry, VaultGroup, ProtectedValue } from '../types';
import { auditPassword } from '../utils/passwordAudit';
import { getEntryIconColor, getNeutralIconColor } from '../utils/iconColor';
import { GroupSelector } from './GroupSelector';
import { getUISettings } from '../services/uiSettingsService';
import { IconSelector } from './IconSelector';
import { ICONS_MAP } from '../constants';
import { PasswordStrength } from './PasswordStrength';

interface CreateEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    editEntry?: VaultEntry | null; // If provided, we are editing
}

export const CreateEntryModal: React.FC<CreateEntryModalProps> = ({ isOpen, onClose, editEntry }) => {
    const { onAddEntry, onEditEntry, vaults, activeVaultId, activeGroupId } = useVault();
    const [groupUuid, setGroupUuid] = useState('');
    const [icon, setIcon] = useState(0);
    const [title, setTitle] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [totpSecret, setTotpSecret] = useState('');
    const [expiryTime, setExpiryTime] = useState('');
    const [showGen, setShowGen] = useState(false);
    const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
    const [attachments, setAttachments] = useState<{ name: string; data: ArrayBuffer }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [colorizeIcons, setColorizeIcons] = useState(true);
    const [isDark, setIsDark] = useState(false);
    const iconPickerRef = useRef<HTMLDivElement>(null);

    const activeVault = vaults.find(v => v.id === activeVaultId);
    const audit = password ? auditPassword(password) : null;

    // Populate fields when opening modal
    useEffect(() => {
        if (isOpen) {
            setError(null);
            setIsSaving(false);
            if (editEntry) {
                setIcon(editEntry.icon !== undefined ? editEntry.icon : 0);
                setTitle(editEntry.title);
                setUsername(editEntry.username);
                setEmail(editEntry.fields['Email'] || '');
                setPassword(editEntry.password || '');
                setUrl(editEntry.url);
                setNotes(editEntry.notes);
                setTotpSecret('');
                setExpiryTime(editEntry.expiryTime ? new Date(editEntry.expiryTime.getTime() - (editEntry.expiryTime.getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '');
                setGroupUuid(activeGroupId || '');

                // Parse custom fields
                const standardKeys = ['Title', 'UserName', 'Password', 'URL', 'Notes', 'otp', 'Email'];
                const fields = Object.entries(editEntry.fields)
                    .filter(([key]) => !standardKeys.includes(key))
                    .map(([key, value]) => ({ key, value }));
                setCustomFields(fields);
                setAttachments(editEntry.attachments || []);
            } else {
                reset();
                setIcon(0);
                setGroupUuid(activeGroupId || '');
            }
        }
    }, [isOpen, editEntry, activeGroupId]);

    // Prevent keyboard shortcuts from affecting underlying components when modal is open
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Always stop propagation of these keys when modal is open
            // This prevents the EntryList from handling them
            // But we don't preventDefault, so form fields still work normally

            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.stopPropagation();
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopPropagation();
            }

            if (e.key === 'Enter') {
                e.stopPropagation();
            }
        };

        // Use capture phase to intercept events before they reach the document listener
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isOpen]);

    // Close icon picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
                setShowIconPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load colorize icons setting
    useEffect(() => {
        const loadSettings = async () => {
            const settings = await getUISettings();
            setColorizeIcons(settings.general?.colorizedEntryIcons ?? true);
        };
        loadSettings();

        // Detect dark mode
        const checkDarkMode = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    const reset = () => {
        setIcon(0);
        setTitle('');
        setUsername('');
        setEmail('');
        setPassword('');
        setUrl('');
        setNotes('');
        setTotpSecret('');
        setExpiryTime('');
        setShowGen(false);
        setError(null);

        setCustomFields([]);
        setAttachments([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);

        const formData = {
            groupUuid,
            icon,
            title,
            username,
            email,
            password,
            url,
            notes,
            totpSecret,
            expiryTime: expiryTime ? new Date(expiryTime) : undefined,
            customFields: customFields.reduce((acc, field) => {
                if (field.key) acc[field.key] = field.value;
                return acc;

            }, {} as Record<string, string>),
            attachments
        };

        try {
            if (editEntry) {
                await onEditEntry({ ...formData, uuid: editEntry.uuid });
            } else {
                await onAddEntry(formData);
            }
            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to save entry");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newAttachments = [...attachments];
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                const buffer = await file.arrayBuffer();
                newAttachments.push({ name: file.name, data: buffer });
            }
            setAttachments(newAttachments);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col p-2 pt-10 bg-black/50 backdrop-blur-md">
            <div className="rounded-xl flex-1 w-full overflow-hidden border shadow-[0_20px_60px_rgba(0,0,0,0.3)] transform transition-all relative flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>

                {/* Header / Title Area */}
                <div
                    className="px-4 py-2.5 flex justify-between items-center border-b pl-4"
                    data-tauri-drag-region
                    style={{ WebkitAppRegion: 'drag', cursor: 'default', borderColor: 'var(--color-border-light)' } as React.CSSProperties}
                >
                    <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        {editEntry ? <Pencil size={16} strokeWidth={1.5} className="text-gray-500" /> : <Plus size={16} strokeWidth={1.5} className="text-gray-500" />}
                        {editEntry ? 'Edit Entry' : 'New Entry'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-b border-red-200 text-red-600 px-4 py-2 text-xs flex items-center">
                        <span className="font-medium mr-1">Error:</span> {error}
                    </div>
                )}

                {/* Two-column layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Column: Standard Fields (60%) */}
                    <div className="w-[50%] flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto px-4 py-3 pb-16">
                            <form id="entry-form" onSubmit={handleSubmit} className="space-y-4">
                                {/* Title & Group Block */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        {/* Icon Picker */}
                                        <div className="relative flex-shrink-0" ref={iconPickerRef}>
                                            <button
                                                type="button"
                                                onClick={() => setShowIconPicker(!showIconPicker)}
                                                className="w-10 h-10 flex items-center justify-center border rounded-lg shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group relative"
                                                style={{
                                                    backgroundColor: 'var(--color-bg-secondary)',
                                                    borderColor: 'var(--color-border-medium)'
                                                }}
                                            >
                                                {(() => {
                                                    const Icon = ICONS_MAP[icon] || Key;
                                                    const iconColor = colorizeIcons
                                                        ? getEntryIconColor(editEntry?.uuid || '', title || 'New Entry')
                                                        : getNeutralIconColor(isDark);

                                                    return <Icon size={20} strokeWidth={2} style={{ color: iconColor }} fill="currentColor" fillOpacity={0.2} className="group-hover:scale-110 transition-transform duration-200" />;
                                                })()}

                                                {/* Edit Badge */}
                                                <div className="absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 shadow-sm border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                                                    <div className="rounded-full p-0.5" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                                        <ChevronDown size={8} className="text-gray-400" />
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Inline Icon Grid */}
                                            {showIconPicker && (
                                                <div className="absolute top-full left-0 mt-2 p-3 backdrop-blur-xl rounded-xl shadow-2xl border w-72 z-50 grid grid-cols-6 gap-2 animate-in fade-in zoom-in-95 duration-100 max-h-[300px] overflow-y-auto overflow-x-hidden" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)', opacity: 0.95 }}>
                                                    {Object.entries(ICONS_MAP).map(([idStr, IconComponent]) => {
                                                        const id = parseInt(idStr);
                                                        return (
                                                            <button
                                                                key={id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setIcon(id);
                                                                    setShowIconPicker(false);
                                                                }}
                                                                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${icon === id
                                                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                                                    : 'text-gray-500 hover:text-gray-900'
                                                                    }`}
                                                                style={icon !== id ? { backgroundColor: 'transparent' } : {}}
                                                                onMouseEnter={(e) => {
                                                                    if (icon !== id) {
                                                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                                                    }
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    if (icon !== id) {
                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                    }
                                                                }}
                                                                title={`Icon ${id}`}
                                                            >
                                                                <IconComponent
                                                                    size={20}
                                                                    strokeWidth={icon === id ? 2.5 : 2}
                                                                    fill={icon === id ? "currentColor" : "none"}
                                                                    fillOpacity={icon === id ? 0.2 : 0}
                                                                />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                required
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                className="w-full text-xl font-bold bg-transparent border-b-2 hover:border-gray-600 focus:border-indigo-600 focus:outline-none transition-all pb-2"
                                                style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)', '--tw-placeholder-opacity': '0.5' } as React.CSSProperties}
                                                placeholder="Title (e.g. Google)"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-transparent">
                                        <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>Location</label>
                                        {activeVault && (
                                            <GroupSelector
                                                groups={activeVault.groups}
                                                selectedGroupId={groupUuid}
                                                onSelect={setGroupUuid}
                                                placeholder="Select Group"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Credentials Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Username */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Username</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User size={16} strokeWidth={1.5} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                placeholder="johndoe"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Email</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail size={16} strokeWidth={1.5} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Password */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">
                                            Password
                                        </label>
                                        <div className="relative flex items-center">
                                            {/* Icon on the left */}
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Key size={16} strokeWidth={1.5} className="text-gray-500" />
                                            </div>

                                            {/* Input */}
                                            <input
                                                type="text"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="block w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                placeholder="••••••••"
                                            />

                                            {/* Generate button (Wand2) with Popover */}
                                            <Popover open={showGen} onOpenChange={setShowGen}>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="absolute inset-y-0 right-0 flex items-center justify-center pr-3 cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Wand2 size={16} strokeWidth={1.5} />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent side="right" align="start" className="w-80 p-0 z-[10000]">
                                                    <div className="rounded-xl shadow-none border-0 p-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                                                        <PasswordGenerator
                                                            isOpen={true}
                                                            onGenerate={(pw: string) => {
                                                                setPassword(pw);
                                                                setShowGen(false);
                                                            }}
                                                            onClose={() => setShowGen(false)}
                                                            className="w-full shadow-none border-0"
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        {audit && (
                                            <div className="mt-1 flex items-center space-x-2 px-1">
                                                <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${audit.color.replace('text-', 'bg-')} transition-all duration-500 dark:brightness-75`}
                                                        style={{ width: `${audit.score}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-medium ${audit.color}`}>
                                                    {audit.label} ({audit.entropy} bits)
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* URL */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">URL</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Globe size={16} strokeWidth={1.5} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={url}
                                                onChange={e => setUrl(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Info (TOTP & Expiry) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">TOTP Secret</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Clock size={16} strokeWidth={1.5} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={totpSecret}
                                                onChange={e => setTotpSecret(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                placeholder="Secret Key"
                                            />
                                        </div>
                                    </div>

                                    {/* Expiry Date - Modern Picker */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Expires</label>
                                        <DateTimePicker
                                            value={expiryTime ? new Date(expiryTime) : null}
                                            onChange={(date) => {
                                                if (date) {
                                                    const iso = date.toISOString().slice(0, 16);
                                                    setExpiryTime(iso);
                                                } else {
                                                    setExpiryTime('');
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Notes, Attachments, Attributes (40%) */}
                    <div className="w-[50%] border-l flex flex-col h-full" style={{ borderColor: 'var(--color-border-light)' }}>
                        {/* Top Section: Notes & Attachments (60% height) */}
                        <div className="h-[60%] flex flex-row border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                            {/* Notes (40% width) */}
                            <div className="w-[60%] border-r flex flex-col h-full" style={{ borderColor: 'var(--color-border-light)' }}>
                                <div className="flex-1 overflow-y-auto px-4 py-3">
                                    <div className="space-y-1 h-full flex flex-col">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Notes</label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="w-full px-4 py-2 border rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none flex-1"
                                            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                            placeholder="Add any additional notes here..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Attachments (40% width) */}
                            <div className="w-[40%] flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto px-3 py-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Files</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id="attachment-upload"
                                                className="hidden"
                                                onChange={handleFileSelect}
                                            />
                                            <label
                                                htmlFor="attachment-upload"
                                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer flex items-center"
                                                title="Add Attachment"
                                            >
                                                <Plus size={14} strokeWidth={1.5} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {attachments.map((att, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 rounded-md border" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-medium)' }}>
                                                <div className="flex items-center overflow-hidden min-w-0">
                                                    <Paperclip size={14} strokeWidth={1.5} className="mr-1 flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
                                                    <span className="text-xs truncate" style={{ color: 'var(--color-text-primary)' }} title={att.name}>{att.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newAtts = attachments.filter((_, i) => i !== index);
                                                        setAttachments(newAtts);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-1 flex-shrink-0"
                                                >
                                                    <Trash2 size={14} strokeWidth={1.5} />
                                                </button>
                                            </div>
                                        ))}
                                        {attachments.length === 0 && (
                                            <div className="text-center py-4 text-xs text-gray-400 italic border-2 border-dashed border-gray-100 rounded-lg">
                                                No files
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section: Attributes (40% height) */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-4 py-3 pb-16">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Attributes</label>
                                    <button
                                        type="button"
                                        onClick={() => setCustomFields([...customFields, { key: '', value: '' }])}
                                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        title="Add Attribute"
                                    >
                                        <Plus size={14} strokeWidth={1.5} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {customFields.map((field, index) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={field.key}
                                                onChange={(e) => {
                                                    const newFields = [...customFields];
                                                    newFields[index].key = e.target.value;
                                                    setCustomFields(newFields);
                                                }}
                                                className="w-1/3 px-2 py-1.5 border rounded text-xs focus:border-indigo-500 focus:outline-none"
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                placeholder="Name"
                                            />
                                            <input
                                                type="text"
                                                value={field.value}
                                                onChange={(e) => {
                                                    const newFields = [...customFields];
                                                    newFields[index].value = e.target.value;
                                                    setCustomFields(newFields);
                                                }}
                                                className="flex-1 px-2 py-1.5 border rounded text-xs focus:border-indigo-500 focus:outline-none"
                                                style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                placeholder="Value"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newFields = customFields.filter((_, i) => i !== index);
                                                    setCustomFields(newFields);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={14} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    ))}
                                    {customFields.length === 0 && (
                                        <div className="text-center py-4 text-xs text-gray-400 italic border-2 border-dashed border-gray-100 rounded-lg">
                                            No custom attributes
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 backdrop-blur-sm border-t flex justify-end space-x-2 z-10" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)', opacity: 0.9 }}>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        form="entry-form"
                        type="submit"
                        className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md shadow-sm transition-all flex items-center transform active:scale-95"
                    >
                        <Save size={14} strokeWidth={1.5} className="mr-1.5" />
                        {editEntry ? 'Update' : 'Save'}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};