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
    const [visibleColumns, setVisibleColumns] = useState({ title: true, username: true, email: true, password: true, url: true, created: true, modified: true });
    // Column widths state
    const [columnWidths, setColumnWidths] = useState({ title: 250, username: 150, email: 180, password: 120, url: 180, created: 140, modified: 140 });
    // Sorting state
    const [sortField, setSortField] = useState<'title' | 'username' | 'created' | 'modified'>('title');
    const [sortAsc, setSortAsc] = useState(true);
    // Resize state
    const [resizing, setResizing] = useState<{ column: keyof typeof columnWidths; startX: number; startWidth: number } | null>(null);

    useEffect(() => {
        const settings = getUISettings();
        setToolbarMode(settings.toolbarStyle);
        // Load column visibility if saved
        if (settings.entryColumns) {
            setVisibleColumns(settings.entryColumns);
        }
        // Load column widths if saved
        if (settings.entryColumnWidths) {
            setColumnWidths(settings.entryColumnWidths);
        }
        // Load sorting preferences
        if (settings.entrySort) {
            setSortField(settings.entrySort.field);
            setSortAsc(settings.entrySort.asc);
        }
    }, []);

    // Handle column resize
    useEffect(() => {
        if (!resizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizing) return;
            const delta = e.clientX - resizing.startX;
            const newWidth = Math.max(80, resizing.startWidth + delta);
            setColumnWidths(prev => ({ ...prev, [resizing.column]: newWidth }));
        };

        const handleMouseUp = () => {
            if (resizing) {
                // Save to settings
                const settings = getUISettings();
                saveUISettings({ ...settings, entryColumnWidths: columnWidths });
                setResizing(null);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing, columnWidths]);

    const startResize = (column: keyof typeof columnWidths, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing({
            column,
            startX: e.clientX,
            startWidth: columnWidths[column]
        });
    };

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
                case 'title':
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
        <div className="flex-1 overflow-hidden flex flex-col bg-white relative" onClick={() => setToolbarContextMenu(null)} style={{ cursor: resizing ? 'col-resize' : 'default' }}>
            {/* Header Toolbar */}
            <div
                className={`h-12 flex items-center px-4 border-b border-gray-200 bg-white space-x-2 relative ${!leftSidebarVisible ? 'pl-20' : ''}`}
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                data-tauri-drag-region
                onContextMenu={(e) => {
                    e.preventDefault();
                    setToolbarContextMenu({ x: e.clientX, y: e.clientY });
                }}
            >
                <button
                    onClick={toggleLeftSidebar}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    title={leftSidebarVisible ? "Hide sidebar" : "Show sidebar"}
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    {leftSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>

                <button
                    onClick={handleCreate}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    title="New Entry"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <Plus size={18} />
                </button>



                {/* Password Generator Icon */}
                <button
                    onClick={() => setShowPassGen(!showPassGen)}
                    className={`p-2 rounded-md transition-colors ${showPassGen ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
                    title="Password Generator"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <Key size={16} />
                </button>

                <div className="h-6 w-px bg-gray-200 mx-2"></div>



                <button
                    onClick={handleRefresh}
                    disabled={isSyncing}
                    className={`p-2 rounded-md transition-colors ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                    title="Refresh / Sync"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                </button>

                <div className="flex-1"></div>

                <div className="relative w-64" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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
            <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 h-6 flex items-center text-xs text-gray-500 uppercase tracking-wider select-none">
                {visibleColumns.title && (
                    <div
                        className="relative flex items-center justify-start text-left px-2 text-xs overflow-hidden whitespace-nowrap cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                        style={{ width: `${columnWidths.title}px`, minWidth: '80px' }}
                        onClick={() => changeSort('title')}
                    >
                        <span className="flex-1 truncate">Title</span>
                        {sortField === 'title' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                        )}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600"
                            onMouseDown={(e) => startResize('title', e)}
                        />
                    </div>
                )}
                {visibleColumns.username && (
                    <div
                        className="relative hidden sm:flex items-center justify-start text-left cursor-pointer hover:bg-gray-100 transition-colors px-2 overflow-hidden whitespace-nowrap border-r border-gray-200"
                        style={{ width: `${columnWidths.username}px`, minWidth: '80px' }}
                        onClick={() => changeSort('username')}
                    >
                        <span className="flex-1 truncate">Username</span>
                        {sortField === 'username' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                        )}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600"
                            onMouseDown={(e) => startResize('username', e)}
                        />
                    </div>
                )}
                {visibleColumns.email && (
                    <div
                        className="relative hidden sm:flex items-center justify-start text-left px-2 overflow-hidden whitespace-nowrap hover:bg-gray-100 border-r border-gray-200"
                        style={{ width: `${columnWidths.email}px`, minWidth: '80px' }}
                    >
                        <span className="flex-1 truncate">Email</span>
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600"
                            onMouseDown={(e) => startResize('email', e)}
                        />
                    </div>
                )}
                {visibleColumns.password && (
                    <div
                        className="relative hidden sm:flex items-center justify-start text-left px-2 overflow-hidden whitespace-nowrap hover:bg-gray-100 border-r border-gray-200"
                        style={{ width: `${columnWidths.password}px`, minWidth: '80px' }}
                    >
                        <span className="flex-1 truncate">Password</span>
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600"
                            onMouseDown={(e) => startResize('password', e)}
                        />
                    </div>
                )}
                {visibleColumns.url && (
                    <div
                        className="relative hidden sm:flex items-center justify-start text-left px-2 overflow-hidden whitespace-nowrap hover:bg-gray-100 border-r border-gray-200"
                        style={{ width: `${columnWidths.url}px`, minWidth: '80px' }}
                    >
                        <span className="flex-1 truncate">URL</span>
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600"
                            onMouseDown={(e) => startResize('url', e)}
                        />
                    </div>
                )}
                {visibleColumns.created && (
                    <div
                        className="relative hidden sm:flex items-center justify-start text-left px-2 text-xs overflow-hidden whitespace-nowrap cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                        style={{ width: `${columnWidths.created}px`, minWidth: '80px' }}
                        onClick={() => changeSort('created')}
                    >
                        <span className="flex-1 truncate">Created</span>
                        {sortField === 'created' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                        )}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600"
                            onMouseDown={(e) => startResize('created', e)}
                        />
                    </div>
                )}
                {visibleColumns.modified && (
                    <div
                        className="relative hidden sm:flex items-center justify-start text-left px-2 text-xs overflow-hidden whitespace-nowrap cursor-pointer hover:bg-gray-100 border-r border-gray-200"
                        style={{ width: `${columnWidths.modified}px`, minWidth: '80px' }}
                        onClick={() => changeSort('modified')}
                    >
                        <span className="flex-1 truncate">Modified</span>
                        {sortField === 'modified' && (
                            sortAsc ? <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                        )}
                        <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600"
                            onMouseDown={(e) => startResize('modified', e)}
                        />
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

                <div className="">
                    {sortedEntries.map(entry => (
                        <div
                            key={entry.uuid}
                            onClick={() => onSelectEntry(entry.uuid)}
                            onContextMenu={(e) => handleContextMenu(e, entry)}
                            className={`py-0.5 flex items-center cursor-pointer transition-colors group even:bg-gray-50 ${selectedEntryId === entry.uuid ? 'bg-indigo-100 hover:bg-indigo-100 text-indigo-900' : 'hover:bg-gray-100 text-gray-700'}`}
                        >
                            {/* Title Column */}
                            {visibleColumns.title && (
                                <div className="flex items-center min-w-0 justify-start text-left px-2 text-xs overflow-hidden whitespace-nowrap"
                                    style={{ width: `${columnWidths.title}px`, minWidth: '80px' }}
                                    title={entry.title}>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs truncate whitespace-nowrap ${selectedEntryId === entry.uuid ? 'text-indigo-900' : 'text-gray-900'}`} title={entry.title}>
                                            {entry.title}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Username Column */}
                            {visibleColumns.username && (
                                <div className="hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-2 overflow-hidden whitespace-nowrap"
                                    style={{ width: `${columnWidths.username}px`, minWidth: '80px' }}
                                    title={entry.username}>
                                    <span className="truncate" title={entry.username}>{entry.username}</span>
                                </div>
                            )}

                            {/* Email Column */}
                            {visibleColumns.email && (
                                <div className="hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-2 overflow-hidden whitespace-nowrap"
                                    style={{ width: `${columnWidths.email}px`, minWidth: '80px' }}
                                    title={entry.email || entry.fields?.Email || ''}>
                                    <span className="truncate" title={entry.email || entry.fields?.Email || ''}>{entry.email || entry.fields?.Email || ''}</span>
                                </div>
                            )}

                            {/* Password Column */}
                            {visibleColumns.password && (
                                <div className="hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-2 overflow-hidden whitespace-nowrap"
                                    style={{ width: `${columnWidths.password}px`, minWidth: '80px' }}
                                    title={entry.password ? '••••••' : ''}>
                                    <span className="truncate" title={entry.password ? '••••••' : ''}>{entry.password ? '••••••' : ''}</span>
                                </div>
                            )}

                            {/* URL Column */}
                            {visibleColumns.url && (
                                <div className="hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-2 overflow-hidden whitespace-nowrap"
                                    style={{ width: `${columnWidths.url}px`, minWidth: '80px' }}
                                    title={entry.url}>
                                    <span className="truncate" title={entry.url}>{entry.url}</span>
                                </div>
                            )}

                            {/* Created Column */}
                            {visibleColumns.created && (
                                <div className="hidden sm:flex items-center justify-start text-left text-xs text-gray-500 truncate px-2 overflow-hidden whitespace-nowrap"
                                    style={{ width: `${columnWidths.created}px`, minWidth: '80px' }}
                                    title={formatDistanceToNow(entry.creationTime, { addSuffix: true })}>
                                    <span className="truncate" title={formatDistanceToNow(entry.creationTime, { addSuffix: true })}>{formatDistanceToNow(entry.creationTime, { addSuffix: true })}</span>
                                </div>
                            )}

                            {/* Modified Column */}
                            {visibleColumns.modified && (
                                <div className="hidden sm:flex items-center justify-start text-left text-xs text-gray-400 px-2 overflow-hidden whitespace-nowrap"
                                    style={{ width: `${columnWidths.modified}px`, minWidth: '80px' }}
                                    title={formatDistanceToNow(entry.lastModTime, { addSuffix: true })}>
                                    <span className="truncate" title={formatDistanceToNow(entry.lastModTime, { addSuffix: true })}>
                                        {formatDistanceToNow(entry.lastModTime, { addSuffix: true })}
                                    </span>
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
