import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import {
    ChevronRight, ChevronDown, Folder, Trash2, Edit, Plus, X, Check,
    Database, Lock, Save, Globe, Smartphone, StickyNote, Sparkles, RefreshCw, FolderPlus,
    AlertTriangle, Server, PenTool, Settings, Home, Star, Wrench, FolderOpen, FileText, Image, Music, Video, Code, Key, Copy
} from 'lucide-react';
import { VaultGroup } from '../types';
import { WebviewWindow } from '@tauri-apps/api/window';

const ICONS_MAP: Record<number, React.ElementType> = {
    48: Folder,
    49: FolderOpen,
    0: Key,
    1: Globe,
    2: AlertTriangle,
    3: Server,
    6: PenTool,
    7: Settings,
    60: Home,
    61: Star,
    68: Lock,
    69: Wrench,
    4: FileText,
    5: Image,
    8: Music,
    9: Video,
    10: Code
};

// Helper component for inline inputs
const GroupInput: React.FC<{
    initialValue: string;
    onSubmit: (value: string) => void;
    onCancel: () => void;
    placeholder?: string;
}> = ({ initialValue, onSubmit, onCancel, placeholder }) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const submittedRef = useRef(false);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const finish = (save: boolean) => {
        if (submittedRef.current) return;
        submittedRef.current = true;

        if (save && value.trim()) {
            onSubmit(value.trim());
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.stopPropagation();
            e.preventDefault();
            finish(true);
        } else if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            finish(false);
        }
    };

    return (
        <div className="flex items-center flex-1 min-w-0 mr-2" onClick={e => e.stopPropagation()}>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => finish(true)}
                placeholder={placeholder}
                className="w-full px-1 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 h-6"
                style={{
                    borderColor: 'var(--color-accent)',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            />
        </div>
    );
};

interface ActionState {
    type: 'rename' | 'add';
    nodeId: string;
}

const GroupItem: React.FC<{
    group: VaultGroup;
    depth: number;
    activeGroupId: string | null;
    actionState: ActionState | null;
    onSelect: (id: string) => void;
    onStartAdd: (id: string) => void;
    onStartRename: (id: string) => void;
    onSubmitAction: (value: string) => void;
    onCancelAction: () => void;
    onDelete: (id: string) => void;
    getEntryCount: (group: VaultGroup) => number;
    parentId?: string;
    onEditCategory: (group: VaultGroup, parentId?: string) => void;
}> = ({
    group, depth, activeGroupId, actionState,
    onSelect, onStartAdd, onStartRename, onSubmitAction, onCancelAction, onDelete, getEntryCount,
    parentId, onEditCategory
}) => {
        const [expanded, setExpanded] = useState(true);
        const [isHovered, setIsHovered] = useState(false);
        const hasChildren = group.subgroups.length > 0;
        const isActive = activeGroupId === group.uuid;
        const entryCount = getEntryCount(group);

        // If we are adding a child to THIS group, ensure it is expanded
        useEffect(() => {
            if (actionState?.type === 'add' && actionState.nodeId === group.uuid) {
                setExpanded(true);
            }
        }, [actionState, group.uuid]);

        const isRenaming = actionState?.type === 'rename' && actionState.nodeId === group.uuid;
        const isAddingChild = actionState?.type === 'add' && actionState.nodeId === group.uuid;
        const isRootCategory = depth === 1;

        return (
            <div>
                <div
                    className={`flex items-center px-2 py-1 my-0.5 rounded-md cursor-pointer text-sm transition-all duration-200 group relative pr-2 ${isActive ? 'font-medium' : ''}`}
                    style={{
                        paddingLeft: `${depth * 12 + 8}px`,
                        backgroundColor: isActive ? 'var(--color-accent-light)' : 'transparent',
                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                        setIsHovered(true);
                        if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        setIsHovered(false);
                        if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }
                    }}
                    onClick={() => onSelect(group.uuid)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className={`p-0.5 rounded mr-1 transition-colors ${hasChildren || isAddingChild ? '' : 'invisible'}`}
                        style={{ color: 'inherit' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-active)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>

                    {group.isRecycleBin ? (
                        <Trash2 size={16} className="mr-2 flex-shrink-0" style={{ color: '#ff3b30' }} />
                    ) : (
                        (() => {
                            const IconComponent = ICONS_MAP[group.icon] || (expanded ? FolderOpen : Folder);
                            return <IconComponent size={16} className="mr-2 flex-shrink-0" style={{ color: expanded ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }} />;
                        })()
                    )}

                    {isRenaming ? (
                        <GroupInput
                            initialValue={group.name}
                            onSubmit={onSubmitAction}
                            onCancel={onCancelAction}
                        />
                    ) : (
                        <span className="truncate select-none flex-1">{group.name}</span>
                    )}

                    {!isRenaming && !isHovered && (
                        <span className="text-[10px] ml-2" style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>{entryCount}</span>
                    )}

                    {/* Action Buttons - Show on hover, hide recycle bin actions */}
                    {!isRenaming && isHovered && !group.isRecycleBin && (
                        <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditCategory(group, parentId);
                                }}
                                className="p-1 rounded transition-all duration-200"
                                style={{ color: 'var(--color-text-tertiary)' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-active)';
                                    e.currentTarget.style.color = 'var(--color-accent)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                }}
                                title="Edit Category"
                            >
                                <Edit size={12} />
                            </button>
                            {!isRootCategory && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(group.uuid);
                                    }}
                                    className="p-1 rounded transition-all duration-200"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-active)';
                                        e.currentTarget.style.color = '#ff3b30';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                    }}
                                    title="Delete Category"
                                >
                                    <Trash2 size={12} />
                                </button>
                            )}
                        </div>
                    )}

                </div>

                {/* Render Subgroups */}
                {expanded && (
                    <>
                        {group.subgroups.map(sg => (
                            <GroupItem
                                key={sg.uuid}
                                group={sg}
                                depth={depth + 1}
                                activeGroupId={activeGroupId}
                                actionState={actionState}
                                onSelect={onSelect}
                                onStartAdd={onStartAdd}
                                onStartRename={onStartRename}
                                onSubmitAction={onSubmitAction}
                                onCancelAction={onCancelAction}
                                onDelete={onDelete}
                                getEntryCount={getEntryCount}
                                parentId={group.uuid}
                                onEditCategory={onEditCategory}
                            />
                        ))}

                        {/* Render "New Group" Input if Adding */}
                        {isAddingChild && (
                            <div
                                className="flex items-center px-2 py-1 my-0.5"
                                style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
                            >
                                <div className="w-4 mr-1"></div> {/* Indent for chevron placeholder */}
                                <Folder size={16} className="mr-2 text-gray-300 flex-shrink-0" />
                                <GroupInput
                                    initialValue=""
                                    placeholder="New Group Name"
                                    onSubmit={onSubmitAction}
                                    onCancel={onCancelAction}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

interface SidebarProps {
    onOpenVault: () => void;
    onAddCategory: (vaultId: string, parentId?: string) => void;
    onEditCategory: (vaultId: string, group: VaultGroup, parentId?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenVault, onAddCategory, onEditCategory }) => {
    const {
        vaults, activeVaultId, setActiveVault,
        activeGroupId, setActiveGroup,
        removeVault, saveVault, lockVault,
        isUnlocking,
        onAddGroup, onRenameGroup, onDeleteGroup, onUpdateGroup
    } = useVault();

    const activeVault = vaults.find(v => v.id === activeVaultId);

    const [actionState, setActionState] = useState<ActionState | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const handleStartAdd = (groupId: string) => {
        setActionState({ type: 'add', nodeId: groupId });
    };

    const handleStartRename = (groupId: string) => {
        setActionState({ type: 'rename', nodeId: groupId });
    };

    const handleCancelAction = () => {
        setActionState(null);
    };

    const handleSubmitAction = (value: string) => {
        if (!actionState) return;

        if (actionState.type === 'add') {
            onAddGroup(value, actionState.nodeId);
        } else if (actionState.type === 'rename') {
            onRenameGroup(actionState.nodeId, value);
        }
        setActionState(null);
    };

    // Helper to count entries recursively
    const getEntryCount = (group: VaultGroup): number => {
        let count = group.entries.length;
        for (const sub of group.subgroups) {
            count += getEntryCount(sub);
        }
        return count;
    };

    // Calculate total stats
    const stats = useMemo(() => {
        let totalFolders = 0;
        let totalEntries = 0;
        const countRecursive = (group: VaultGroup) => {
            totalFolders++;
            totalEntries += group.entries.length;
            group.subgroups.forEach(countRecursive);
        };

        const activeVault = vaults.find(v => v.id === activeVaultId);
        if (activeVault) {
            activeVault.groups.forEach(countRecursive);
        }
        return { totalFolders, totalEntries };
    }, [vaults, activeVaultId]);

    // Smart View Counts
    const smartCounts = useMemo(() => {
        const counts = { websites: 0, twoFA: 0, notes: 0, duplicated: 0 };
        const activeVault = vaults.find(v => v.id === activeVaultId);

        const passwordMap = new Map<string, number>();

        const traverse = (group: VaultGroup) => {
            group.entries.forEach(entry => {
                if (entry.fields.URL) counts.websites++;
                if (entry.fields.OTP) counts.twoFA++;
                if (entry.fields.Notes) counts.notes++;

                if (entry.password) {
                    passwordMap.set(entry.password, (passwordMap.get(entry.password) || 0) + 1);
                }
            });
            group.subgroups.forEach(traverse);
        };

        if (activeVault) {
            activeVault.groups.forEach(traverse);

            // Calculate duplicates
            let duplicateCount = 0;
            passwordMap.forEach((count) => {
                if (count > 1) duplicateCount += count;
            });
            counts.duplicated = duplicateCount;
        }
        return counts;
    }, [vaults, activeVaultId]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden" onClick={() => {
            if (actionState) setActionState(null);
        }}>
            {/* Row 1: Traffic Lights & Settings */}
            <div
                className="h-10 flex items-center justify-between px-3 flex-shrink-0"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                data-tauri-drag-region
            >
                <div className="w-16"></div>
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-1.5 rounded-md transition-all duration-200"
                    style={{ color: 'var(--color-text-tertiary)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                        e.currentTarget.style.color = 'var(--color-accent)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                    }}
                    title="Settings"
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Row 2: Database Name & Actions */}
            <div className="h-10 flex items-center justify-between px-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <div className="flex items-center font-medium text-sm text-gray-700 truncate flex-1 mr-2 select-none">
                    <Database size={14} className="mr-2 opacity-50 flex-shrink-0" />
                    <span className="truncate">{activeVault ? activeVault.name : 'KeedaVault'}</span>
                </div>

                <div className="flex items-center space-x-0.5">
                    <button
                        onClick={() => activeVaultId && onAddCategory(activeVaultId)}
                        className="p-1.5 rounded transition-all duration-200"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                            e.currentTarget.style.color = 'var(--color-accent)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-tertiary)';
                        }}
                        title="Add Category"
                    >
                        <Plus size={16} />
                    </button>
                    <button
                        onClick={() => activeVaultId && saveVault(activeVaultId)}
                        className="p-1.5 rounded transition-all duration-200"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                            e.currentTarget.style.color = 'var(--color-accent)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-tertiary)';
                        }}
                        title="Save Vault"
                    >
                        <Save size={16} />
                    </button>
                    <button
                        onClick={() => activeVaultId && lockVault(activeVaultId)}
                        className="p-1.5 rounded transition-all duration-200"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                            e.currentTarget.style.color = '#ff3b30';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--color-text-tertiary)';
                        }}
                        title="Lock Vault"
                    >
                        <Lock size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {/* Vaults List */}
                {vaults.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                        <p>No vaults open.</p>
                        <p>Click the + button to open or create a KDBX file.</p>
                    </div>
                )}

                {vaults.map(vault => (
                    <div key={vault.id} className="mb-4">
                        <div
                            className={`px-3 py-1.5 flex items-center justify-between group cursor-pointer ${activeVaultId === vault.id ? '' : 'hover:bg-gray-100'}`}
                            onClick={(e) => { e.stopPropagation(); setActiveVault(vault.id); }}
                        >
                            {vaults.length > 1 ? (
                                <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wider overflow-hidden flex-1">
                                    <Database size={12} className="mr-1.5 flex-shrink-0" />
                                    <span className="truncate">{vault.name}</span>
                                    {vault.fileHandle && <span className="ml-1 text-[10px] text-green-600 bg-green-100 px-1 rounded">Sync</span>}
                                </div>
                            ) : null}
                        </div>

                        {activeVaultId === vault.id && (
                            <div className="mt-1">
                                {/* Standard Groups */}
                                {vault.groups.filter(g => !g.isRecycleBin).map(group => (
                                    <GroupItem
                                        key={group.uuid}
                                        group={group}
                                        depth={1}
                                        activeGroupId={activeGroupId}
                                        actionState={actionState}
                                        onSelect={setActiveGroup}
                                        onStartAdd={handleStartAdd}
                                        onStartRename={handleStartRename}
                                        onSubmitAction={handleSubmitAction}
                                        onCancelAction={handleCancelAction}
                                        onDelete={onDeleteGroup}
                                        getEntryCount={getEntryCount}
                                        onEditCategory={(g, pid) => onEditCategory(vault.id, g, pid)}
                                    />
                                ))}

                                {/* Recycle Bin (Separated with more spacing) */}
                                {vault.groups.filter(g => g.isRecycleBin).map(group => (
                                    <div key={group.uuid} className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                                        <GroupItem
                                            group={group}
                                            depth={1}
                                            activeGroupId={activeGroupId}
                                            actionState={actionState}
                                            onSelect={setActiveGroup}
                                            onStartAdd={handleStartAdd}
                                            onStartRename={handleStartRename}
                                            onSubmitAction={handleSubmitAction}
                                            onCancelAction={handleCancelAction}
                                            onDelete={onDeleteGroup}
                                            getEntryCount={getEntryCount}
                                            onEditCategory={(g, pid) => onEditCategory(vault.id, g, pid)}
                                        />
                                    </div>
                                ))}

                                {/* Smart Views */}
                                <div className="mt-6 pt-2 px-3" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center" style={{ color: 'var(--color-text-tertiary)' }}>
                                        <Sparkles size={10} className="mr-1" /> Smart Views
                                    </div>
                                    <div
                                        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-all duration-200 mb-0.5 ${activeGroupId === 'smart-duplicated' ? 'font-medium' : ''}`}
                                        style={{
                                            backgroundColor: activeGroupId === 'smart-duplicated' ? 'var(--color-accent-light)' : 'transparent',
                                            color: activeGroupId === 'smart-duplicated' ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (activeGroupId !== 'smart-duplicated') {
                                                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeGroupId !== 'smart-duplicated') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                        onClick={() => setActiveGroup('smart-duplicated')}
                                    >
                                        <Copy size={16} className="mr-2" style={{ color: '#ff3b30' }} />
                                        <span className="flex-1">Duplicated</span>
                                        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{smartCounts.duplicated}</span>
                                    </div>
                                    <div
                                        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-all duration-200 mb-0.5 ${activeGroupId === 'smart-2fa' ? 'font-medium' : ''}`}
                                        style={{
                                            backgroundColor: activeGroupId === 'smart-2fa' ? 'var(--color-accent-light)' : 'transparent',
                                            color: activeGroupId === 'smart-2fa' ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (activeGroupId !== 'smart-2fa') {
                                                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeGroupId !== 'smart-2fa') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                        onClick={() => setActiveGroup('smart-2fa')}
                                    >
                                        <Smartphone size={16} className="mr-2" style={{ color: '#af52de' }} />
                                        <span className="flex-1">2FA Codes</span>
                                        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{smartCounts.twoFA}</span>
                                    </div>
                                    <div
                                        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-all duration-200 mb-0.5 ${activeGroupId === 'smart-websites' ? 'font-medium' : ''}`}
                                        style={{
                                            backgroundColor: activeGroupId === 'smart-websites' ? 'var(--color-accent-light)' : 'transparent',
                                            color: activeGroupId === 'smart-websites' ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (activeGroupId !== 'smart-websites') {
                                                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeGroupId !== 'smart-websites') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                        onClick={() => setActiveGroup('smart-websites')}
                                    >
                                        <Globe size={16} className="mr-2" style={{ color: '#007aff' }} />
                                        <span className="flex-1">Websites</span>
                                        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{smartCounts.websites}</span>
                                    </div>
                                    <div
                                        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-all duration-200 mb-0.5 ${activeGroupId === 'smart-notes' ? 'font-medium' : ''}`}
                                        style={{
                                            backgroundColor: activeGroupId === 'smart-notes' ? 'var(--color-accent-light)' : 'transparent',
                                            color: activeGroupId === 'smart-notes' ? 'var(--color-accent)' : 'var(--color-text-secondary)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (activeGroupId !== 'smart-notes') {
                                                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeGroupId !== 'smart-notes') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                        onClick={() => setActiveGroup('smart-notes')}
                                    >
                                        <StickyNote size={16} className="mr-2" style={{ color: '#ffcc00' }} />
                                        <span className="flex-1">Notes</span>
                                        <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{smartCounts.notes}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Stats & Action */}
            <div style={{ borderTop: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-bg-tertiary)' }}>
                {activeVaultId && (
                    <div className="px-4 py-2 text-[10px] flex justify-between" style={{ color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-border-light)' }}>
                        <span>{stats.totalFolders} Folders</span>
                        <span>{stats.totalEntries} Entries</span>
                    </div>
                )}
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-64 text-center border border-gray-100 transform scale-100 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <Settings size={24} />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Settings</h3>
                        <p className="text-sm text-gray-500 mb-4">Coming Soon</p>
                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}


        </div>
    );
};