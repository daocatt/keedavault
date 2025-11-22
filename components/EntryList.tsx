import { RefreshCw, Settings, Search, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';
import { PasswordGenerator } from './PasswordGenerator';

import React, { useState, useEffect, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { Globe, Key, FileText, User, Plus, Trash2, Copy, Edit, Link, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateEntryModal } from './CreateEntryModal';
import { useToast } from './ui/Toaster';
import { VaultEntry } from '../types';

interface EntryListProps {
    onSelectEntry: (id: string) => void;
    selectedEntryId: string | null;
    leftSidebarVisible: boolean;
    rightSidebarVisible: boolean;
    toggleLeftSidebar: () => void;
    toggleRightSidebar: () => void;
}

interface ContextMenuState {
    x: number;
    y: number;
    entry: VaultEntry;
}

export const EntryList: React.FC<EntryListProps> = ({ onSelectEntry, selectedEntryId, leftSidebarVisible, rightSidebarVisible, toggleLeftSidebar, toggleRightSidebar }) => {
    const { activeEntries, searchQuery, setSearchQuery, onDeleteEntry, activeVaultId, getEntry, saveVault } = useVault();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [toolbarMode, setToolbarMode] = useState<'icon' | 'text' | 'both'>('icon');
    const [toolbarContextMenu, setToolbarContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [showPassGen, setShowPassGen] = useState(false);
    // Column visibility state persisted in UI settings
    const [visibleColumns, setVisibleColumns] = useState({ name: true, username: true, email: true, password: true, url: true, created: true, modified: true });
    // Sorting state
    const [sortField, setSortField] = useState<'name' | 'username' | 'created' | 'modified'>('name');
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        const settings = getUISettings();
        setToolbarMode(settings.toolbarStyle);
        // Load column visibility if saved
        if (settings.entryColumns) {
            setVisibleColumns(settings.entryColumns);
        }
        // Load sorting preferences
        if (settings.entrySort) {
            setSortField(settings.entrySort.field);
            setSortAsc(settings.entrySort.asc);
        }
    }, []);

    const handleSetToolbarMode = (mode: 'icon' | 'text' | 'both') => {
        setToolbarMode(mode);
        saveUISettings({ toolbarStyle: mode });
        setToolbarContextMenu(null);
    };
    // Toggle column visibility and persist
    const toggleColumn = (col: keyof typeof visibleColumns) => {
        const updated = { ...visibleColumns, [col]: !visibleColumns[col] };
        setVisibleColumns(updated);
        const settings = getUISettings();
        saveUISettings({ ...settings, entryColumns: updated });
    };
    // Change sorting field
    const changeSort = (field: typeof sortField) => {
        if (field === sortField) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
        const settings = getUISettings();
        saveUISettings({ ...settings, entrySort: { field, asc: field === sortField ? !sortAsc : true } });
    };

    // Sort entries based on current sort field and direction
    const sortedEntries = useMemo(() => {
        const sorted = [...activeEntries];
        sorted.sort((a, b) => {
            let aVal: any;
            let bVal: any;

            switch (sortField) {
                case 'name':
                    aVal = a.title.toLowerCase();
                    bVal = b.title.toLowerCase();
                    break;
                case 'username':
                    aVal = a.username.toLowerCase();
                    bVal = b.username.toLowerCase();
                    break;
                case 'created':
                    aVal = a.creationTime.getTime();
                    bVal = b.creationTime.getTime();
                    break;
                case 'modified':
                    aVal = a.lastModTime.getTime();
                    bVal = b.lastModTime.getTime();
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortAsc ? -1 : 1;
            if (aVal > bVal) return sortAsc ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [activeEntries, sortField, sortAsc]);

    // ... existing effects

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const getIcon = (url: string) => {
        if (url && url.includes('http')) return <Globe size={18} className="text-blue-500" />;
        return <Key size={18} className="text-gray-400" />;
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteEntry(id);
    };

    const handleContextMenu = (e: React.MouseEvent, entry: VaultEntry) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, entry });
    };

    const copyToClipboard = (text: string, label: string) => {
        if (!text) {
            addToast({ title: `No ${label} to copy`, type: 'info' });
            return;
        }
        navigator.clipboard.writeText(text);
        addToast({ title: `${label} copied`, type: 'success' });
        setContextMenu(null);
    };

    const handleEdit = (entry: VaultEntry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
        setContextMenu(null);
    };

    const handleCreate = () => {
        setEditingEntry(null);
        setIsModalOpen(true);
    };

    const [isSyncing, setIsSyncing] = useState(false);

    const handleRefresh = async () => {
        if (activeVaultId && !isSyncing) {
            setIsSyncing(true);
            addToast({ title: 'Syncing vault...', type: 'info' });
            try {
                await saveVault(activeVaultId);
                addToast({ title: 'Vault synced', type: 'success' });
            } catch (e) {
                addToast({ title: 'Sync failed', type: 'error' });
            } finally {
                setIsSyncing(false);
            }
        }
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white relative" onClick={() => setToolbarContextMenu(null)}>
            {/* Header Toolbar */}
            <div
                className="h-12 flex items-center px-4 border-b border-gray-200 bg-white space-x-2 relative"
                onContextMenu={(e) => {
                    e.preventDefault();
                    setToolbarContextMenu({ x: e.clientX, y: e.clientY });
                }}
            >
                <button
                    onClick={toggleLeftSidebar}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    title={leftSidebarVisible ? "Hide sidebar" : "Show sidebar"}
                >
                    {leftSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>

                <button
                    onClick={handleCreate}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    title="New Entry"
                >
                    <Plus size={18} />
                </button>



                {/* Password Generator Icon */}
                <button
                    onClick={() => setShowPassGen(!showPassGen)}
                    className={`p-2 rounded-md transition-colors ${showPassGen ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
                    title="Password Generator"
                >
                    <Key size={16} />
                </button>

                <div className="h-6 w-px bg-gray-200 mx-2"></div>



                <button
                    onClick={handleRefresh}
                    disabled={isSyncing}
                    className={`p-2 rounded-md transition-colors ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                    title="Refresh / Sync"
                >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                </button>

                <div className="flex-1"></div>

                <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-2 py-1.5 bg-white border border-gray-300 rounded-md text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150 shadow-sm"
                    />
                </div>

                <button
                    onClick={toggleRightSidebar}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors ml-2"
                    title={rightSidebarVisible ? "Hide details" : "Show details"}
                >
                    {rightSidebarVisible ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>

                {/* Password Generator Popover - Positioned relative to the toolbar container */}
                {showPassGen && (
                    <div className="absolute top-12 left-20 z-20 p-2 bg-white rounded-lg shadow-xl border border-gray-200 w-80">
                        <PasswordGenerator
                            isOpen={true}
                            onClose={() => setShowPassGen(false)}
                            onGenerate={(pwd) => {
                                navigator.clipboard.writeText(pwd);
                                addToast({ title: 'Password copied', type: 'success' });
                                setShowPassGen(false);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Toolbar Context Menu */}
            {toolbarContextMenu && (
                <div
                    className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48"
                    style={{ top: toolbarContextMenu.y, left: toolbarContextMenu.x }}
                >
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Toolbar Display</div>
                    <button onClick={() => handleSetToolbarMode('icon')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between">
                        <span>Icon Only</span>
                        {toolbarMode === 'icon' && <Check size={14} className="text-indigo-600" />}
                    </button>
                    <button onClick={() => handleSetToolbarMode('both')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between">
                        <span>Icon and Text</span>
                        {toolbarMode === 'both' && <Check size={14} className="text-indigo-600" />}
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                        <Settings size={14} className="mr-2 text-gray-400" /> Customize...
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    {/* Column visibility toggles */}
                    {Object.entries(visibleColumns).map(([col, visible]) => (
                        <button
                            key={col}
                            onClick={() => toggleColumn(col as keyof typeof visibleColumns)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                        >
                            <span>{col.charAt(0).toUpperCase() + col.slice(1)}</span>
                            {visible && <Check size={14} className="text-indigo-600" />}
                        </button>
                    ))}
                </div>
            )
            }

            {/* Column Headers */}
            <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 py-2 text-xs font-semibold text-gray-500 flex uppercase tracking-wider">
                {visibleColumns.name && (
                    <div
                        className="flex-1 flex items-center justify-start text-left px-4 text-xs overflow-hidden whitespace-nowrap border border-gray-200"
                        style={{ resize: 'horizontal', overflow: 'hidden' }}
                        onClick={() => changeSort('name')}
                    >
                        <span>Title</span>
                        {sortField === 'name' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />
                        )}
                    </div>
                )}
                {visibleColumns.username && (
                    <div
                        className="w-1/3 hidden sm:flex items-center justify-start text-left cursor-pointer hover:text-gray-700 transition-colors px-4 overflow-hidden whitespace-nowrap border border-gray-200"
                        style={{ resize: 'horizontal', overflow: 'hidden' }}
                        onClick={() => changeSort('username')}
                    >
                        <span>Username</span>
                        {sortField === 'username' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />
                        )}
                    </div>
                )}
                {visibleColumns.email && <div className="flex-1 hidden sm:flex items-center justify-start text-left px-4 overflow-hidden whitespace-nowrap border border-gray-200" style={{ resize: 'horizontal', overflow: 'hidden' }}>Email</div>}
                {visibleColumns.password && <div className="flex-1 hidden sm:flex items-center justify-start text-left px-4 overflow-hidden whitespace-nowrap border border-gray-200" style={{ resize: 'horizontal', overflow: 'hidden' }}>Password</div>}
                {visibleColumns.url && <div className="flex-1 hidden sm:flex items-center justify-start text-left px-4 overflow-hidden whitespace-nowrap border border-gray-200" style={{ resize: 'horizontal', overflow: 'hidden' }}>URL</div>}
                {visibleColumns.created && (
                    <div
                        className="w-32 hidden sm:flex items-center justify-start text-left px-4 text-xs overflow-hidden whitespace-nowrap border border-gray-200"
                        style={{ resize: 'horizontal', overflow: 'hidden' }}
                        onClick={() => changeSort('created')}
                    >
                        <span>Created</span>
                        {sortField === 'created' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />
                        )}
                    </div>
                )}
                {visibleColumns.modified && (
                    <div
                        className="w-32 hidden sm:flex items-center justify-start text-left px-4 text-xs overflow-hidden whitespace-nowrap border border-gray-200"
                        style={{ resize: 'horizontal', overflow: 'hidden' }}
                        onClick={() => changeSort('modified')}
                    >
                        <span>Modified</span>
                        {sortField === 'modified' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />
                        )}
                    </div>
                )}
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto">
                {activeEntries.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 opacity-30" />
                        </div>
                        <p>{searchQuery ? 'No entries found matching your search.' : 'No entries in this group.'}</p>
                        {!searchQuery && (
                            <button
                                onClick={handleCreate}
                                className="mt-4 text-indigo-600 hover:underline text-sm"
                            >
                                Create your first entry
                            </button>
                        )}
                    </div>
                )}

                <div className="divide-y divide-gray-100">
                    {sortedEntries.map(entry => (
                        <div
                            key={entry.uuid}
                            onClick={() => onSelectEntry(entry.uuid)}
                            onContextMenu={(e) => handleContextMenu(e, entry)}
                            className={`px-4 py-2 flex items-center hover:bg-gray-50 cursor-pointer transition-colors group ${selectedEntryId === entry.uuid ? 'bg-indigo-50 hover:bg-indigo-50 ring-1 ring-inset ring-indigo-500/20' : ''}`}
                        >
                            {/* Name Column */}
                            {visibleColumns.name && (
                                <div className="flex-1 flex items-center min-w-0 justify-start text-left px-4 text-xs overflow-hidden whitespace-nowrap border border-gray-200"
                                    style={{ resize: 'horizontal', overflow: 'hidden' }}
                                    title={entry.title}>
                                    <div className="flex-shrink-0 mr-3 p-2 bg-gray-100 rounded-lg">
                                        {getIcon(entry.url)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-medium truncate ${selectedEntryId === entry.uuid ? 'text-indigo-900' : 'text-gray-900'}`} title={entry.title}>
                                            {entry.title}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate md:hidden" title={entry.username}>
                                            {entry.username}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Username Column */}
                            {visibleColumns.username && (
                                <div className="flex-1 hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-4 overflow-hidden whitespace-nowrap border border-gray-200"
                                    style={{ resize: 'horizontal', overflow: 'hidden' }}
                                    title={entry.username}>
                                    {entry.username && <User size={12} className="mr-1.5 text-gray-400" />}
                                    <span className="truncate" title={entry.username}>{entry.username}</span>
                                </div>
                            )}

                            {/* Email Column */}
                            {visibleColumns.email && (
                                <div className="flex-1 hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-4 overflow-hidden whitespace-nowrap border border-gray-200"
                                    style={{ resize: 'horizontal', overflow: 'hidden' }}
                                    title={entry.email || entry.fields?.Email || ''}>
                                    <span className="truncate" title={entry.email || entry.fields?.Email || ''}>{entry.email || entry.fields?.Email || ''}</span>
                                </div>
                            )}

                            {/* Password Column */}
                            {visibleColumns.password && (
                                <div className="flex-1 hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-4 overflow-hidden whitespace-nowrap border border-gray-200"
                                    style={{ resize: 'horizontal', overflow: 'hidden' }}
                                    title={entry.password ? '••••••' : ''}>
                                    <span className="truncate" title={entry.password ? '••••••' : ''}>{entry.password ? '••••••' : ''}</span>
                                </div>
                            )}

                            {/* URL Column */}
                            {visibleColumns.url && (
                                <div className="flex-1 hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-4 overflow-hidden whitespace-nowrap border border-gray-200"
                                    style={{ resize: 'horizontal', overflow: 'hidden' }}
                                    title={entry.url}>
                                    <span className="truncate" title={entry.url}>{entry.url}</span>
                                </div>
                            )}

                            {/* Created Column */}
                            {visibleColumns.created && (
                                <div className="w-32 hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-4 overflow-hidden whitespace-nowrap border border-gray-200"
                                    style={{ resize: 'horizontal', overflow: 'hidden' }}
                                    title={formatDistanceToNow(entry.creationTime, { addSuffix: true })}>
                                    <span className="truncate" title={formatDistanceToNow(entry.creationTime, { addSuffix: true })}>{formatDistanceToNow(entry.creationTime, { addSuffix: true })}</span>
                                </div>
                            )}

                            {/* Modified Column with action buttons */}
                            {visibleColumns.modified && (
                                <div className="w-32 hidden sm:flex items-center justify-start text-left text-xs text-gray-400 px-4 overflow-hidden whitespace-nowrap border border-gray-200"
                                    style={{ resize: 'horizontal', overflow: 'hidden' }}
                                    title={formatDistanceToNow(entry.lastModTime, { addSuffix: true })}>
                                    <span className="group-hover:hidden" title={formatDistanceToNow(entry.lastModTime, { addSuffix: true })}>
                                        {formatDistanceToNow(entry.lastModTime, { addSuffix: true })}
                                    </span>
                                    <div className="hidden group-hover:flex items-center space-x-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                            title="Edit"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, entry.uuid)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Context Menu */}
            {
                contextMenu && (
                    <div
                        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-48"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <button onClick={() => copyToClipboard(contextMenu.entry.username, 'Username')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <User size={14} className="mr-2 text-gray-400" /> Copy Username
                        </button>
                        <button onClick={() => copyToClipboard(contextMenu.entry.password || '', 'Password')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Key size={14} className="mr-2 text-gray-400" /> Copy Password
                        </button>
                        <button onClick={() => copyToClipboard(contextMenu.entry.url, 'URL')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Link size={14} className="mr-2 text-gray-400" /> Copy URL
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={() => handleEdit(contextMenu.entry)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center">
                            <Edit size={14} className="mr-2 text-gray-400" /> Edit Entry
                        </button>
                        <button onClick={(e) => { handleDelete(e, contextMenu.entry.uuid); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                            <Trash2 size={14} className="mr-2" /> Delete
                        </button>
                    </div>
                )
            }

            <CreateEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editEntry={editingEntry}
            />
        </div >
    );
};