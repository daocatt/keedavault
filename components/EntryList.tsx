import { RefreshCw, Settings, Search, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';
import { PasswordGenerator } from './PasswordGenerator';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
    const { activeEntries, searchQuery, setSearchQuery, onDeleteEntry, activeVaultId, getEntry, saveVault, onAddEntry, activeGroupId, getActiveGroup, onEmptyRecycleBin } = useVault();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [toolbarMode, setToolbarMode] = useState<'icon' | 'text' | 'both'>(() => getUISettings().toolbarStyle);
    const [toolbarContextMenu, setToolbarContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [columnMenuOpen, setColumnMenuOpen] = useState(false);
    const [showPassGen, setShowPassGen] = useState(false);
    // Column visibility state persisted in UI settings
    const [visibleColumns, setVisibleColumns] = useState(() => getUISettings().entryColumns || { title: true, username: true, email: true, password: true, url: true, created: true, modified: true });
    // Column widths state
    const [columnWidths, setColumnWidths] = useState(() => getUISettings().entryColumnWidths || { title: 250, username: 150, email: 180, password: 120, url: 180, created: 140, modified: 140 });
    // Sorting state
    const [sortField, setSortField] = useState<'title' | 'username' | 'created' | 'modified'>(() => getUISettings().entrySort?.field || 'title');
    const [sortAsc, setSortAsc] = useState(() => getUISettings().entrySort?.asc ?? true);
    // Resize state
    const [resizing, setResizing] = useState<{ column: keyof typeof columnWidths; startX: number; startWidth: number } | null>(null);



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

    // Keyboard shortcut for Delete key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Esc key - Close modal if open
            if (e.key === 'Escape' && isModalOpen) {
                e.preventDefault();
                setIsModalOpen(false);
                setEditingEntry(null);
                return;
            }

            // Enter key - Edit selected entry
            if (e.key === 'Enter' && selectedEntryId && !isModalOpen) {
                e.preventDefault();
                const entry = getEntry(selectedEntryId);
                if (entry) {
                    handleEdit(entry);
                }
                return;
            }

            // Delete or Backspace key - Delete selected entry
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntryId && !isModalOpen) {
                // Prevent default behavior (like navigating back in browser)
                e.preventDefault();
                // Trigger delete
                handleDelete(e as any, selectedEntryId);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedEntryId, isModalOpen]);

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
        onSelectEntry(entry.uuid);

        // Calculate menu dimensions (approximate)
        const menuHeight = 240; // Approximate height of the context menu
        const menuWidth = 192; // w-48 = 12rem = 192px

        // Get viewport dimensions
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calculate position
        let x = e.clientX;
        let y = e.clientY;

        // Adjust Y position if menu would go off bottom of screen
        if (y + menuHeight > viewportHeight) {
            y = viewportHeight - menuHeight - 10; // 10px margin from bottom
        }

        // Adjust X position if menu would go off right of screen
        if (x + menuWidth > viewportWidth) {
            x = viewportWidth - menuWidth - 10; // 10px margin from right
        }

        setContextMenu({ x, y, entry });
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

    const handleDuplicate = async (entry: VaultEntry) => {
        try {
            const duplicateData = {
                title: `${entry.title} (Copy)`,
                username: entry.username,
                password: entry.password || '',
                url: entry.url,
                email: entry.email || entry.fields?.Email || '',
                notes: entry.notes,
                totpSecret: entry.fields?.OTP || '',
                groupUuid: activeGroupId || entry.fields?.groupUuid || ''
            };
            await onAddEntry(duplicateData);
            addToast({ title: 'Entry duplicated', type: 'success' });
            setContextMenu(null);
        } catch (e) {
            addToast({ title: 'Failed to duplicate entry', type: 'error' });
        }
    };

    const [isSyncing, setIsSyncing] = useState(false);
    const syncInProgressRef = useRef(false);
    const lastSyncTimeRef = useRef(0);

    const handleRefresh = useCallback(async (e?: React.MouseEvent) => {
        // Prevent event bubbling
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        const now = Date.now();
        // Debounce: prevent clicks within 500ms
        if (now - lastSyncTimeRef.current < 500) {
            return;
        }

        // Use ref to immediately prevent multiple calls
        if (syncInProgressRef.current || !activeVaultId) {
            return;
        }

        lastSyncTimeRef.current = now;
        syncInProgressRef.current = true;
        setIsSyncing(true);
        addToast({ title: 'Syncing vault...', type: 'info' });

        try {
            // Pass isAutoSave=true to suppress saveVault's toast
            await saveVault(activeVaultId, true);
            addToast({ title: 'Vault synced', type: 'success' });
        } catch (e) {
            addToast({ title: 'Sync failed', type: 'error' });
        } finally {
            syncInProgressRef.current = false;
            setIsSyncing(false);
        }
    }, [activeVaultId, saveVault]); // Removed addToast from dependencies

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-white relative" onClick={() => { setToolbarContextMenu(null); setColumnMenuOpen(false); }} style={{ cursor: resizing ? 'col-resize' : 'default' }}>
            {/* Header Toolbar - Aligned with Traffic Lights */}
            <div
                className="h-10 flex items-center px-3 space-x-1.5 relative"
                style={{
                    WebkitAppRegion: 'drag',
                    borderBottom: '1px solid var(--color-border-light)',
                    backgroundColor: 'var(--color-bg-primary)'
                } as React.CSSProperties}
                data-tauri-drag-region
                onContextMenu={(e) => {
                    e.preventDefault();
                    setToolbarContextMenu({ x: e.clientX, y: e.clientY });
                }}
            >
                {/* Left spacing for traffic lights - Only when sidebar is hidden */}
                {!leftSidebarVisible && <div className="w-16"></div>}

                <button
                    onClick={toggleLeftSidebar}
                    className={`p-1.5 rounded-md transition-all duration-200 flex items-center ${toolbarMode !== 'icon' ? 'px-2' : ''}`}
                    style={{ WebkitAppRegion: 'no-drag', color: 'var(--color-text-secondary)' } as React.CSSProperties}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={leftSidebarVisible ? "Hide sidebar" : "Show sidebar"}
                >
                    {leftSidebarVisible ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                    {toolbarMode !== 'icon' && <span className="ml-1.5 text-xs font-medium">Sidebar</span>}
                </button>

                {/* Empty Recycle Bin Button - Only show when in Recycle Bin */}
                {getActiveGroup()?.isRecycleBin && activeEntries.length > 0 && (
                    <>
                        <button
                            onClick={onEmptyRecycleBin}
                            className={`p-1.5 rounded-md transition-all duration-200 flex items-center ${toolbarMode !== 'icon' ? 'px-2' : ''}`}
                            style={{
                                WebkitAppRegion: 'no-drag',
                                color: '#dc2626'
                            } as React.CSSProperties}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Empty Recycle Bin"
                        >
                            <Trash2 size={16} />
                            {toolbarMode !== 'icon' && <span className="ml-1.5 text-xs font-medium">Empty</span>}
                        </button>
                    </>
                )}

                <button
                    onClick={handleCreate}
                    className={`p-1.5 rounded-md transition-all duration-200 flex items-center ${toolbarMode !== 'icon' ? 'px-2' : ''}`}
                    style={{ WebkitAppRegion: 'no-drag', color: 'var(--color-text-secondary)' } as React.CSSProperties}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="New"
                >
                    <Plus size={16} />
                    {toolbarMode !== 'icon' && <span className="ml-1.5 text-xs font-medium">New</span>}
                </button>

                {/* Password Generator Icon */}
                <button
                    onClick={() => setShowPassGen(!showPassGen)}
                    className={`p-1.5 rounded-md transition-all duration-200 flex items-center ${toolbarMode !== 'icon' ? 'px-2' : ''}`}
                    style={{
                        WebkitAppRegion: 'no-drag',
                        backgroundColor: showPassGen ? 'var(--color-accent-light)' : 'transparent',
                        color: showPassGen ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                        if (!showPassGen) {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!showPassGen) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }
                    }}
                    title="Password Generator"
                >
                    <Key size={14} />
                    {toolbarMode !== 'icon' && <span className="ml-1.5 text-xs font-medium">Generator</span>}
                </button>



                <div className="flex-1"></div>

                <div className="relative w-56" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--color-text-placeholder)' }} />
                    <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1 rounded-md text-xs focus:outline-none transition-all duration-150"
                        style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-light)',
                            color: 'var(--color-text-primary)'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-accent)';
                            e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-accent-light)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border-light)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>

                <button
                    onClick={toggleRightSidebar}
                    className={`p-1.5 rounded-md transition-all duration-200 ml-2 flex items-center ${toolbarMode !== 'icon' ? 'px-2' : ''}`}
                    style={{ WebkitAppRegion: 'no-drag', color: 'var(--color-text-secondary)' } as React.CSSProperties}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={rightSidebarVisible ? "Hide details" : "Show details"}
                >
                    {rightSidebarVisible ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    {toolbarMode !== 'icon' && <span className="ml-1.5 text-xs font-medium">Details</span>}
                </button>

                {/* Password Generator Popover - Positioned relative to the toolbar container */}
                {showPassGen && (
                    <PasswordGenerator
                        isOpen={true}
                        onClose={() => setShowPassGen(false)}
                        onGenerate={(pwd) => {
                            navigator.clipboard.writeText(pwd);
                            addToast({ title: 'Password copied', type: 'success' });
                            setShowPassGen(false);
                        }}
                        className="absolute top-12 left-20 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-5"
                    />
                )}
            </div>

            {/* Toolbar Context Menu */}
            {toolbarContextMenu && (
                <div
                    className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-48"
                    style={{ top: toolbarContextMenu.y, left: toolbarContextMenu.x }}
                >
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Toolbar</div>
                    <button onClick={() => handleSetToolbarMode('icon')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center justify-between">
                        <span>Icon Only</span>
                        {toolbarMode === 'icon' && <Check size={14} className="text-indigo-600" />}
                    </button>
                    <button onClick={() => handleSetToolbarMode('both')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center justify-between">
                        <span>Icon and Text</span>
                        {toolbarMode === 'both' && <Check size={14} className="text-indigo-600" />}
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center">
                        <Settings size={14} className="mr-2 text-gray-400" /> Customize...
                    </button>
                </div>
            )
            }

            {/* Column Headers */}
            <div className="sticky top-0 z-10 h-6 flex items-center text-xs uppercase tracking-wider select-none" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border-light)', color: 'var(--color-text-secondary)' }}>
                {visibleColumns.title && (
                    <div
                        className="relative flex items-center justify-start text-left px-2 text-xs overflow-hidden whitespace-nowrap cursor-pointer transition-colors"
                        style={{ width: `${columnWidths.title}px`, minWidth: '80px', borderRight: '1px solid var(--color-border-light)' }}
                        onClick={() => changeSort('title')}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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

                {/* Column Settings Button - Frozen on Right */}
                <div className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center bg-[var(--color-bg-tertiary)] border-l border-[var(--color-border-light)] z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); setColumnMenuOpen(!columnMenuOpen); }}
                        className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-500"
                    >
                        <Settings size={12} />
                    </button>
                </div>

                {/* Column Settings Menu */}
                {columnMenuOpen && (
                    <div
                        className="absolute top-6 right-0 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-48"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Columns</div>
                        {['title', 'username', 'email', 'password', 'url', 'created', 'modified'].map((col) => (
                            <button
                                key={col}
                                onClick={() => toggleColumn(col as keyof typeof visibleColumns)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                            >
                                <span>{col.charAt(0).toUpperCase() + col.slice(1)}</span>
                                {visibleColumns[col as keyof typeof visibleColumns] && <Check size={14} className="text-indigo-600" />}
                            </button>
                        ))}
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
                            className={`py-1.5 flex items-center cursor-pointer transition-colors group ${selectedEntryId === entry.uuid
                                ? 'bg-indigo-100 hover:bg-indigo-100 text-indigo-900'
                                : 'even:bg-gray-50 hover:bg-gray-100 text-gray-700'
                                }`}
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
                        <button onClick={() => copyToClipboard(contextMenu.entry.username, 'Username')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center">
                            <User size={14} className="mr-2 text-gray-400" /> Copy Username
                        </button>
                        <button onClick={() => copyToClipboard(contextMenu.entry.password || '', 'Password')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center">
                            <Key size={14} className="mr-2 text-gray-400" /> Copy Password
                        </button>
                        <button onClick={() => copyToClipboard(contextMenu.entry.url, 'URL')} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center">
                            <Link size={14} className="mr-2 text-gray-400" /> Copy URL
                        </button>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button onClick={() => handleEdit(contextMenu.entry)} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center">
                            <Edit size={14} className="mr-2 text-gray-400" /> Edit Entry
                        </button>
                        <button onClick={() => handleDuplicate(contextMenu.entry)} className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center">
                            <Copy size={14} className="mr-2 text-gray-400" /> Duplicate
                        </button>
                        <button onClick={(e) => { handleDelete(e, contextMenu.entry.uuid); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center">
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
