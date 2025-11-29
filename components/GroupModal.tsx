import React, { useState, useEffect, useRef } from 'react';
import {
    X, Check, ChevronDown,
    Folder, LifeBuoy, Compass, Plane, Pyramid, Receipt, Zap, DraftingCompass, Gem, Gamepad2, Server, Mail, House, Glasses, StickyNote, Trophy, FolderLock, Image, Video, Flag, Map, Book, Heart
} from 'lucide-react';
import { VaultGroup } from '../types';
import { GroupSelector } from './GroupSelector';

interface GroupModalProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    initialData?: {
        name: string;
        icon: number;
        parentGroupId?: string;
        allowAdd?: boolean;
        uuid?: string;
    };
    groups: VaultGroup[]; // Root groups to build tree
    onClose: () => void;
    onSave: (name: string, icon: number, parentGroupId: string, allowAdd: boolean) => Promise<void> | void;
}

// Extended icon set with Lucide mappings
const ICONS = [
    { id: 48, label: 'Folder', icon: Folder },
    { id: 78, label: 'Life Buoy', icon: LifeBuoy },
    { id: 11, label: 'Compass', icon: Compass },
    { id: 14, label: 'Plane', icon: Plane },
    { id: 15, label: 'Pyramid', icon: Pyramid },
    { id: 16, label: 'Receipt', icon: Receipt },
    { id: 22, label: 'Bolt', icon: Zap },
    { id: 23, label: 'Drafting Compass', icon: DraftingCompass },
    { id: 70, label: 'Gem', icon: Gem },
    { id: 67, label: 'Gamepad', icon: Gamepad2 },
    { id: 3, label: 'Server', icon: Server },
    { id: 62, label: 'Mail', icon: Mail },
    { id: 59, label: 'House', icon: House },
    { id: 37, label: 'Glasses', icon: Glasses },
    { id: 35, label: 'Sticky Note', icon: StickyNote },
    { id: 33, label: 'Trophy', icon: Trophy },
    { id: 54, label: 'Folder Lock', icon: FolderLock },
    { id: 5, label: 'Image', icon: Image },
    { id: 9, label: 'Video', icon: Video },
    { id: 77, label: 'Flag', icon: Flag },
    { id: 28, label: 'Map', icon: Map },
    { id: 31, label: 'Book', icon: Book },
    { id: 38, label: 'Heart', icon: Heart },
];

export const GroupModal: React.FC<GroupModalProps> = ({
    isOpen, mode, initialData, groups, onClose, onSave
}) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState(48); // Default folder icon
    const [parentGroupId, setParentGroupId] = useState<string>('');
    const [allowAdd, setAllowAdd] = useState(true);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const iconPickerRef = useRef<HTMLDivElement>(null);
    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        // Only initialize when modal is first opened (transition from closed to open)
        if (isOpen && !prevIsOpenRef.current) {
            setError(null);
            setIsSaving(false);
            if (mode === 'edit' && initialData) {
                setName(initialData.name);
                setIcon(initialData.icon);
                setParentGroupId(initialData.parentGroupId || '');
                setAllowAdd(initialData.allowAdd !== false);
            } else {
                // New Group – default name is ""
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

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name.trim()) return;
        setError(null);
        setIsSaving(true);
        try {
            await onSave(name, icon, parentGroupId, allowAdd);
            // Parent component handles closing on success
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to save group");
            setIsSaving(false);
        }
    };

    const SelectedIcon = ICONS.find(i => i.id === icon)?.icon || Folder;
    const isRootGroup = mode === 'edit' && groups.some(g => g.uuid === initialData?.uuid);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="rounded-xl w-full max-w-md overflow-visible border transform transition-all" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                <div className="flex items-center justify-between px-4 py-2.5 rounded-t-xl" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {mode === 'add' ? 'New Group' : 'Edit Group'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md">
                        <X size={14} />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-b border-red-200 text-red-600 px-4 py-2 text-xs flex items-center">
                        <span className="font-medium mr-1">Error:</span> {error}
                    </div>
                )}

                <div className="p-5 space-y-6">
                    {/* Fusion Header: Icon & Name */}
                    <div className="flex items-center space-x-5">
                        {/* Large Icon Picker */}
                        <div className="relative flex-shrink-0" ref={iconPickerRef}>
                            <button
                                type="button"
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="w-16 h-16 flex items-center justify-center border rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group relative"
                                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-medium)' }}
                            >
                                <SelectedIcon size={32} className="text-indigo-500 group-hover:scale-110 transition-transform duration-200" strokeWidth={2} fill="currentColor" fillOpacity={0.2} />

                                {/* Edit Badge */}
                                <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 shadow-sm border" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)' }}>
                                    <div className="rounded-full p-1" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                        <ChevronDown size={10} className="text-gray-400" />
                                    </div>
                                </div>
                            </button>

                            {/* Popover Icon Grid */}
                            {showIconPicker && (
                                <div className="absolute top-full left-0 mt-2 p-3 backdrop-blur-xl rounded-xl shadow-2xl border w-72 z-50 grid grid-cols-6 gap-2 animate-in fade-in zoom-in-95 duration-100" style={{ backgroundColor: 'var(--color-bg-primary)', borderColor: 'var(--color-border-light)', opacity: 0.95 }}>
                                    {ICONS.map(ic => (
                                        <button
                                            key={ic.id}
                                            type="button"
                                            onClick={() => {
                                                setIcon(ic.id);
                                                setShowIconPicker(false);
                                            }}
                                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${icon === ic.id
                                                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                                }`}
                                            title={ic.label}
                                        >
                                            <ic.icon
                                                size={20}
                                                strokeWidth={icon === ic.id ? 2.5 : 2}
                                                fill={icon === ic.id ? "currentColor" : "none"}
                                                fillOpacity={icon === ic.id ? 0.2 : 0}
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Name Input */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Group Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full text-xl font-semibold bg-transparent border-b-2 hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-all pb-1"
                                style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)', '--tw-placeholder-opacity': '0.5' } as React.CSSProperties}
                                placeholder="Enter Name"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Parent Group Selector */}
                    <div className="bg-transparent">
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-secondary)' }}>Location</label>
                        <GroupSelector
                            groups={groups}
                            selectedGroupId={parentGroupId}
                            onSelect={setParentGroupId}
                            disabled={isRootGroup}
                            excludedGroupId={initialData?.uuid}
                            direction="up"
                            placeholder="Select Parent Group"
                        />
                    </div>
                </div>

                <div className="px-4 py-2.5 border-t flex justify-end space-x-2 rounded-b-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
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
