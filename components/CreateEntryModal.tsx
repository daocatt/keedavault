import React, { useState, useEffect } from 'react';
import { X, Save, User, Lock, Globe, FileText, Key, Mail, Clock, Folder } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { PasswordGenerator } from './PasswordGenerator';
import { VaultEntry, VaultGroup } from '../types';
import { CategorySelector } from './CategorySelector';

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
    const [showGen, setShowGen] = useState(false);

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
                setGroupUuid(activeGroupId || '');
            } else {
                reset();
                setGroupUuid(activeGroupId || '');
            }
        }
    }, [isOpen, editEntry, activeGroupId]);

    const reset = () => {
        setTitle('');
        setUsername('');
        setEmail('');
        setPassword('');
        setUrl('');
        setNotes('');
        setTotpSecret('');
        setShowGen(false);
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
        };
        if (editEntry) {
            onEditEntry({ ...formData, uuid: editEntry.uuid });
        } else {
            onAddEntry(formData);
        }
        onClose();
    };



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden relative transition-transform transform-gpu hover:scale-105">
                {/* Header */}
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                    <h2 className="text-base font-semibold text-gray-800">
                        {editEntry ? 'Edit Entry' : 'Create New Entry'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="entry-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Group selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Group</label>
                            {activeVault && (
                                <CategorySelector
                                    groups={activeVault.groups}
                                    selectedGroupId={groupUuid}
                                    onSelect={setGroupUuid}
                                    placeholder="Select a Group"
                                />
                            )}
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Title</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                                    placeholder="e.g., Google, Amazon"
                                />
                            </div>
                        </div>

                        {/* Two‑column fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Username */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Username</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                                        placeholder="username"
                                    />
                                </div>
                            </div>
                            {/* Email */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                                        placeholder="email@example.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* URL & TOTP */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* URL */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Website URL</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            {/* TOTP */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">TOTP Secret (2FA)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={totpSecret}
                                        onChange={e => setTotpSecret(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                                        placeholder={editEntry ? "(Unchanged)" : "Base32 Secret Key"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Password with generator */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1 flex justify-between">
                                <span>Password</span>
                                <button
                                    type="button"
                                    onClick={() => setShowGen(!showGen)}
                                    className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center"
                                >
                                    <Key size={10} className="mr-1" /> {showGen ? 'HIDE GEN' : 'GENERATE'}
                                </button>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400 font-mono"
                                    placeholder="Secret password"
                                />
                            </div>
                            {showGen && (
                                <div className="mt-2 relative">
                                    <PasswordGenerator
                                        isOpen={showGen}
                                        onClose={() => setShowGen(false)}
                                        onGenerate={pwd => setPassword(pwd)}
                                        showCopyButton={false}
                                        className="w-full bg-gray-50 rounded-lg border border-gray-200 p-4"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Notes</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-gray-400"
                                placeholder="Additional details..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        form="entry-form"
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center"
                    >
                        <Save size={16} className="mr-2" />
                        {editEntry ? 'Update Entry' : 'Save Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};