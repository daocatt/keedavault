import React, { useState, useEffect } from 'react';
import { X, Save, User, Lock, Globe, FileText, Key, Mail, Clock, Folder, Wand2 } from 'lucide-react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-gray-200/60 shadow-2xl transform transition-all">

                {/* Header / Title Area */}
                <div className="px-6 pt-6 pb-2 flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {editEntry ? 'Edit Entry' : 'New Entry'}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {editEntry ? 'Update your credential details.' : 'Add a new credential to your vault.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-2">
                    <form id="entry-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Title & Group Block */}
                        <div className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full text-xl font-semibold text-gray-900 bg-transparent border-b-2 border-gray-100 hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-300 pb-1"
                                    placeholder="Title (e.g. Google)"
                                    autoFocus
                                />
                            </div>
                            <div className="bg-transparent">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Location</label>
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
                        <div className="grid grid-cols-1 gap-3">
                            {/* Username */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-gray-400"
                                    placeholder="Username"
                                />
                            </div>

                            {/* Email - Moved Here & Styled to match */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-gray-400"
                                    placeholder="Email (Optional)"
                                />
                            </div>

                            {/* Password */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-10 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-gray-400 font-mono"
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGen(!showGen)}
                                    className={`absolute right-2 top-2 p-1 rounded-md transition-colors ${showGen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                    title="Generate Password"
                                >
                                    <Wand2 size={16} />
                                </button>
                            </div>

                            {/* Password Generator Panel */}
                            {showGen && (
                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <PasswordGenerator
                                        isOpen={showGen}
                                        onClose={() => setShowGen(false)}
                                        onGenerate={pwd => setPassword(pwd)}
                                        showCopyButton={false}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {/* URL */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Globe size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all placeholder:text-gray-400"
                                    placeholder="Website URL"
                                />
                            </div>
                        </div>

                        {/* Additional Info (TOTP only now) */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Clock size={16} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={totpSecret}
                                    onChange={e => setTotpSecret(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                    placeholder="TOTP Secret (Optional)"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-400 resize-none"
                                placeholder="Notes..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        form="entry-form"
                        type="submit"
                        className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm hover:shadow transition-all flex items-center transform active:scale-95"
                    >
                        <Save size={14} className="mr-2" />
                        {editEntry ? 'Update' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};