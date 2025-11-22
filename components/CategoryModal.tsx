import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, Check, ChevronDown, Key, Globe, AlertTriangle, Server, PenTool, Settings, Home, Star, Lock, Wrench, FolderOpen, FileText, Image, Music, Video, Code } from 'lucide-react';
import { VaultGroup } from '../types';

interface CategoryModalProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    initialData?: {
        name: string;
        icon: number;
        parentGroupId?: string;
        allowAdd?: boolean;
    };
    groups: VaultGroup[]; // Root groups to build tree
    onClose: () => void;
    onSave: (name: string, icon: number, parentGroupId: string, allowAdd: boolean) => void;
}

// Extended icon set with Lucide mappings
const ICONS = [
    { id: 48, label: 'Folder', icon: Folder },
    { id: 49, label: 'Open Folder', icon: FolderOpen },
    { id: 0, label: 'Key', icon: Key },
    { id: 1, label: 'World', icon: Globe },
    { id: 2, label: 'Warning', icon: AlertTriangle },
    { id: 3, label: 'Server', icon: Server },
    { id: 6, label: 'Pen', icon: PenTool },
    { id: 7, label: 'Settings', icon: Settings },
    { id: 60, label: 'Home', icon: Home },
    { id: 61, label: 'Star', icon: Star },
    { id: 68, label: 'Lock', icon: Lock },
    { id: 69, label: 'Tools', icon: Wrench },
    // Additional common icons mapped to arbitrary IDs for UI demo purposes
    // In a real app, these should match KeePass standard icon IDs
    { id: 4, label: 'Text', icon: FileText },
    { id: 5, label: 'Image', icon: Image },
    { id: 8, label: 'Music', icon: Music },
    { id: 9, label: 'Video', icon: Video },
    { id: 10, label: 'Code', icon: Code },
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
    isOpen, mode, initialData, groups, onClose, onSave
}) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(48); // Default folder icon
    const [parentGroupId, setParentGroupId] = useState<string>('');
    const [allowAdd, setAllowAdd] = useState(true);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const iconPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setName(initialData.name);
                setIcon(initialData.icon);
                setParentGroupId(initialData.parentGroupId || '');
                setAllowAdd(initialData.allowAdd !== false);
            } else {
                // New category – default name is "Root"
                setName('');
                setIcon(48);
                setParentGroupId(initialData?.parentGroupId || groups[0]?.uuid || '');
                setAllowAdd(true);
            }
            setShowIconPicker(false);
        }
    }, [isOpen, mode, initialData, groups]);

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

    if (!isOpen) return null;

    const flattenGroups = (gs: VaultGroup[], depth = 0): { id: string, name: string, depth: number }[] => {
        let res: { id: string, name: string, depth: number }[] = [];
        gs.forEach(g => {
            if (!g.isRecycleBin) {
                res.push({ id: g.uuid, name: g.name, depth });
                res = res.concat(flattenGroups(g.subgroups, depth + 1));
            }
        });
        return res;
    };

    const flatGroups = flattenGroups(groups);

    const handleSave = () => {
        if (!name.trim()) return;
        onSave(name, icon, parentGroupId, allowAdd);
        onClose();
    };

    const SelectedIcon = ICONS.find(i => i.id === icon)?.icon || Folder;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-visible border border-gray-100 transform transition-all">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-base font-semibold text-gray-800">
                        {mode === 'add' ? 'New Category' : 'Edit Category'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-200 rounded-full">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Parent Group - Moved to Top */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Parent Category</label>
                        <div className="relative">
                            <select
                                value={parentGroupId}
                                onChange={e => setParentGroupId(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none transition-all text-sm font-medium text-gray-700"
                                disabled={mode === 'edit' && (!initialData?.parentGroupId)}
                            >
                                {flatGroups.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {'\u00A0'.repeat(g.depth * 4)}{g.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Icon & Name - Side by Side */}
                    <div className="flex space-x-3">
                        {/* Icon Picker */}
                        <div className="flex-shrink-0 relative" ref={iconPickerRef}>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Icon</label>
                            <button
                                type="button"
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-11 h-11 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            >
                                <SelectedIcon size={20} className="text-indigo-600" />
                            </button>

                            {/* Popover Icon Grid */}
                            {showIconPicker && (
                                <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-xl border border-gray-100 w-64 z-50 grid grid-cols-5 gap-2 animate-in fade-in zoom-in-95 duration-100">
                                    {ICONS.map(ic => (
                                        <button
                                            key={ic.id}
                                            onClick={() => {
                                                setIcon(ic.id);
                                                setShowIconPicker(false);
                                            }}
                                            className={`p-2 rounded-lg flex items-center justify-center transition-all aspect-square ${icon === ic.id ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500 ring-offset-1' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:scale-110'}`}
                                            title={ic.label}
                                        >
                                            <ic.icon size={18} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Name Input */}
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                placeholder="Category Name"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {mode === 'add' ? 'Create' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
