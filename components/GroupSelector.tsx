import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Folder, FolderOpen, Check, ChevronRight } from 'lucide-react';
import { VaultGroup } from '../types';

interface GroupSelectorProps {
    groups: VaultGroup[];
    selectedGroupId: string;
    onSelect: (groupId: string) => void;
    disabled?: boolean;
    placeholder?: string;
    excludeRecycleBin?: boolean;
    className?: string;
}

interface FlatGroup {
    id: string;
    name: string;
    depth: number;
    icon: number;
    hasChildren: boolean;
    path: string[]; // Array of group names for search context
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({
    groups,
    selectedGroupId,
    onSelect,
    disabled = false,
    placeholder = "Select Group",
    excludeRecycleBin = true,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    // Flatten groups for the list view
    const flatGroups = useMemo(() => {
        const result: FlatGroup[] = [];

        const processGroup = (group: VaultGroup, depth: number, path: string[]) => {
            if (excludeRecycleBin && group.isRecycleBin) return;

            const currentPath = [...path, group.name];

            result.push({
                id: group.uuid,
                name: group.name,
                depth,
                icon: group.icon,
                hasChildren: group.subgroups && group.subgroups.length > 0,
                path: currentPath
            });

            if (group.subgroups) {
                group.subgroups.forEach(sub => processGroup(sub, depth + 1, currentPath));
            }
        };

        groups.forEach(g => processGroup(g, 0, []));
        return result;
    }, [groups, excludeRecycleBin]);

    // Filter groups based on search
    const filteredGroups = useMemo(() => {
        if (!searchQuery.trim()) return flatGroups;

        const query = searchQuery.toLowerCase();
        return flatGroups.filter(g =>
            g.name.toLowerCase().includes(query) ||
            g.path.some(p => p.toLowerCase().includes(query))
        );
    }, [flatGroups, searchQuery]);

    const selectedGroup = flatGroups.find(g => g.id === selectedGroupId);

    const handleSelect = (id: string) => {
        onSelect(id);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm transition-all
                    ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-white hover:border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'}
                    ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500 bg-white' : ''}
                `}
            >
                <div className="flex items-center overflow-hidden">
                    <div className={`mr-2.5 p-1 rounded-md ${selectedGroup ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                        {selectedGroup ? <FolderOpen size={14} /> : <Folder size={14} />}
                    </div>
                    <span className={`truncate ${selectedGroup ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {selectedGroup ? selectedGroup.name : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
                    {/* Search Header */}
                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter categories..."
                                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Group List */}
                    <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                        {filteredGroups.length > 0 ? (
                            filteredGroups.map((group) => (
                                <button
                                    key={group.id}
                                    type="button"
                                    onClick={() => handleSelect(group.id)}
                                    className={`w-full flex items-center px-3 py-2 text-sm transition-colors relative group
                                        ${selectedGroupId === group.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}
                                    `}
                                >
                                    {/* Indentation lines */}
                                    <div className="flex items-center mr-2" style={{ width: `${group.depth * 16}px` }}>
                                        {group.depth > 0 && (
                                            <div className="w-full border-b border-gray-200 border-dashed h-0 opacity-50" />
                                        )}
                                    </div>

                                    {/* Icon */}
                                    <div className={`mr-2.5 flex-shrink-0 transition-colors ${selectedGroupId === group.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                        {group.hasChildren ? <FolderOpen size={16} /> : <Folder size={16} />}
                                    </div>

                                    {/* Name */}
                                    <span className="truncate flex-1 text-left font-medium">
                                        {group.name}
                                    </span>

                                    {/* Checkmark for selected */}
                                    {selectedGroupId === group.id && (
                                        <Check size={14} className="text-indigo-600 ml-2" />
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                <p>No categories found</p>
                            </div>
                        )}
                    </div>

                    {/* Footer / Quick Info */}
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between">
                        <span>{filteredGroups.length} categories</span>
                        {selectedGroup && <span>Current: {selectedGroup.name}</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
