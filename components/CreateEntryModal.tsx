import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User, Lock, Globe, FileText, Key, Mail, Clock, Folder, Wand2, Plus, Trash2 } from 'lucide-react';
import { DateTimePicker } from './DateTimePicker';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useVault } from '../context/VaultContext';
import { PasswordGenerator } from './PasswordGenerator';
import { VaultEntry, VaultGroup } from '../types';
import { GroupSelector } from './GroupSelector';

interface CreateEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    editEntry?: VaultEntry | null; // If provided, we are editing
}

export const CreateEntryModal: React.FC<CreateEntryModalProps> = ({ isOpen, onClose, editEntry }) => {
    const { onAddEntry, onEditEntry, vaults, activeVaultId, activeGroupId } = useVault();
    const [groupUuid, setGroupUuid] = useState('');
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

    const activeVault = vaults.find(v => v.id === activeVaultId);

    // Populate fields when opening modal
    useEffect(() => {
        if (isOpen) {
            if (editEntry) {
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
            } else {
                reset();
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

    const reset = () => {
        setTitle('');
        setUsername('');
        setEmail('');
        setPassword('');
        setUrl('');
        setNotes('');
        setTotpSecret('');
        setExpiryTime('');
        setShowGen(false);
        setCustomFields([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = {
            groupUuid,
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
        };
        if (editEntry) {
            onEditEntry({ ...formData, uuid: editEntry.uuid });
        } else {
            onAddEntry(formData);
        }
        onClose();
    };



    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
            <div className="bg-white rounded-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-300 shadow-[0_20px_60px_rgba(0,0,0,0.3)] transform transition-all">

                {/* Header / Title Area */}
                <div
                    className="px-4 py-2.5 flex justify-between items-center border-b border-gray-200"
                    data-tauri-drag-region
                    style={{ WebkitAppRegion: 'drag', cursor: 'default' } as React.CSSProperties}
                >
                    <h3 className="text-sm font-medium text-gray-700">
                        {editEntry ? 'Edit Entry' : 'New Entry'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md">
                        <X size={14} />
                    </button>
                </div>

                {/* Two-column layout */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel */}
                    <div className="w-1/2 border-r border-gray-200 flex flex-col">

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            <form id="entry-form" onSubmit={handleSubmit} className="space-y-4">

                                {/* Title & Group Block */}
                                <div className="space-y-3">
                                    <div>
                                        <input
                                            type="text"
                                            required
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="w-full text-xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-400 hover:border-gray-600 focus:border-indigo-600 focus:outline-none transition-all placeholder:text-gray-400 pb-2"
                                            placeholder="Title (e.g. Google)"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="bg-transparent">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Location</label>
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
                                                <User size={16} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
                                                placeholder="johndoe"
                                            />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Email</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail size={16} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
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
                                                <Key size={16} className="text-gray-500" />
                                            </div>

                                            {/* Input */}
                                            <input
                                                type="text"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="block w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400 font-mono"
                                                placeholder="••••••••"
                                            />

                                            {/* Generate button (Wand2) with Popover */}
                                            <Popover open={showGen} onOpenChange={setShowGen}>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="absolute inset-y-0 right-0 flex items-center justify-center pr-3 cursor-pointer text-gray-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <Wand2 size={16} />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent side="right" align="start" className="w-80 p-0 z-[10000]">
                                                    <div className="bg-bg-primary rounded-xl shadow-none border-0 p-4">
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
                                    </div>



                                    {/* URL */}
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">URL</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Globe size={16} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={url}
                                                onChange={e => setUrl(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
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
                                                <Clock size={16} className="text-gray-500 group-focus-within:text-indigo-600 transition-colors" />
                                            </div>
                                            <input
                                                type="text"
                                                value={totpSecret}
                                                onChange={e => setTotpSecret(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400"
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

                    {/* Right Panel */}
                    <div className="w-1/2 flex flex-col">
                        {/* Notes */}
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    rows={8}
                                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:border-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-gray-400 resize-none"
                                    placeholder="Add any additional notes here..."
                                />
                            </div>
                        </div>

                        {/* Custom Attributes */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider ml-1">Attributes</label>
                                <button
                                    type="button"
                                    onClick={() => setCustomFields([...customFields, { key: '', value: '' }])}
                                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Add Attribute"
                                >
                                    <Plus size={14} />
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
                                            className="w-1/3 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
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
                                            className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none"
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
                                            <Trash2 size={14} />
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

                {/* Footer actions */}
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
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
                        <Save size={14} className="mr-1.5" />
                        {editEntry ? 'Update' : 'Save'}
                    </button>
                </div>

            </div >


        </div >,
        document.body
    );
};