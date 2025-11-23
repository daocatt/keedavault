import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, Check, ChevronDown, Key, Globe, AlertTriangle, Server, PenTool, Settings, Home, Star, Lock, Wrench, FolderOpen, FileText, Image, Music, Video, Code } from 'lucide-react';
import { VaultGroup } from '../types';
import { CategorySelector } from './CategorySelector';

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
    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        // Only initialize when modal is first opened (transition from closed to open)
        if (isOpen && !prevIsOpenRef.current) {
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
        prevIsOpenRef.current = isOpen;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, mode, initialData]); // Removed 'groups' from dependencies

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



    const handleSave = () => {
        if (!name.trim()) return;
        onSave(name, icon, parentGroupId, allowAdd);
        onClose();
    };

    const SelectedIcon = ICONS.find(i => i.id === icon)?.icon || Folder;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md overflow-visible border border-gray-200/60 transform transition-all" style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-t-xl">
                    <h3 className="text-sm font-medium text-gray-700">
                        {mode === 'add' ? 'New Category' : 'Edit Category'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md">
                        <X size={14} />
                    </button>
                </div>

                <div className="px-4 py-3 space-y-3 border-t border-gray-100">
                    {/* Parent Group - Moved to Top */}
                    <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 ml-0.5 tracking-wide">Parent Category</label>
                        <CategorySelector
                            groups={groups}
                            selectedGroupId={parentGroupId}
                            onSelect={setParentGroupId}
                            disabled={mode === 'edit' && (!initialData?.parentGroupId)}
                            placeholder="Select Parent Category"
                        />
                    </div>

                    {/* Icon & Name - Side by Side */}
                    <div className="flex space-x-2.5">
                        {/* Icon Picker */}
                        <div className="flex-shrink-0 relative" ref={iconPickerRef}>
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 ml-0.5 tracking-wide">Icon</label>
                            <button
                                type="button"
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            >
                                <SelectedIcon size={18} className="text-indigo-600" />
                            </button>

                            {/* Popover Icon Grid */}
                            {showIconPicker && (
                                <div className="absolute top-full left-0 mt-1.5 p-2.5 bg-white rounded-lg shadow-lg border border-gray-200 w-60 z-50 grid grid-cols-5 gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                                    {ICONS.map(ic => (
                                        <button
                                            key={ic.id}
                                            type="button"
                                            onClick={() => {
                                                setIcon(ic.id);
                                                setShowIconPicker(false);
                                            }}
                                            className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${icon === ic.id
                                                ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-500/50'
                                                : 'hover:bg-gray-100 text-gray-600'
                                                }`}
                                            title={ic.label}
                                        >
                                            <ic.icon size={16} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Name Input */}
                        <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1 ml-0.5 tracking-wide">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
                                placeholder="Category Name"
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                <div className="px-4 py-2.5 bg-gray-50/50 border-t border-gray-100 flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {mode === 'add' ? 'Create' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
