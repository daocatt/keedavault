import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import {
    ChevronRight, ChevronDown, Folder, Trash2, Edit, Plus, X, Check,
    Database, Lock, Save, Globe, Smartphone, StickyNote, Sparkles, RefreshCw, FolderPlus,
    AlertTriangle, Server, PenTool, Settings, Home, Star, Wrench, FolderOpen, FileText, Image, Music, Video, Code, Key
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
                className="w-full px-1 py-0.5 text-sm border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-gray-900 h-6"
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

        return (
            <div>
                <div
                    className={`flex items-center px-2 py-1 my-0.5 rounded-md cursor-pointer text-sm transition-colors group relative pr-2 ${isActive ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-200/50'}`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => onSelect(group.uuid)}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className={`p-0.5 rounded hover:bg-gray-300/50 mr-1 ${hasChildren || isAddingChild ? '' : 'invisible'}`}
                    >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>

                    {group.isRecycleBin ? (
                        <Trash2 size={16} className="mr-2 text-red-400 flex-shrink-0" />
                    ) : (
                        (() => {
                            const IconComponent = ICONS_MAP[group.icon] || (expanded ? FolderOpen : Folder);
                            return <IconComponent size={16} className={`mr-2 flex-shrink-0 ${expanded ? 'text-indigo-400' : 'text-gray-400'}`} />;
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

                    {!isRenaming && (
                        <span className={`text-[10px] ml-2 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>{entryCount}</span>
                    )}

                    {/* Hover Actions - Hide for Recycle Bin and during edits */}
                    {!group.isRecycleBin && !isRenaming && (
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center space-x-0.5 bg-gray-200/90 backdrop-blur-sm rounded px-1 shadow-sm z-10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditCategory(group, parentId);
                                }}
                                className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white rounded"
                                title="Edit Group"
                            >
                                <Edit size={12} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(group.uuid); }}
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-white rounded"
                                title="Delete Group"
                            >
                                <Trash2 size={12} />
                            </button>
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
        removeVault, saveVault,
        isUnlocking,
        onAddGroup, onRenameGroup, onDeleteGroup, onUpdateGroup
    } = useVault();

    const [actionState, setActionState] = useState<ActionState | null>(null);
    const [vaultContextMenu, setVaultContextMenu] = useState<{ x: number; y: number; vaultId: string } | null>(null);

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
        const counts = { websites: 0, twoFA: 0, notes: 0 };
        const activeVault = vaults.find(v => v.id === activeVaultId);

        const traverse = (group: VaultGroup) => {
            group.entries.forEach(entry => {
                if (entry.fields.URL) counts.websites++;
                if (entry.fields.OTP) counts.twoFA++;
                if (entry.fields.Notes) counts.notes++;
            });
            group.subgroups.forEach(traverse);
        };

        if (activeVault) {
            activeVault.groups.forEach(traverse);
        }
        return counts;
    }, [vaults, activeVaultId]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden" onClick={() => {
            if (actionState) setActionState(null);
        }}>
            <div className="flex-1 overflow-y-auto py-2">
                {/* Vaults List */}
                {vaults.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">
                        <p>No vaults open.</p>
                        <p>Click the + button to open or create a KDBX file.</p>
                    </div>
                )}

                {vaults.map(vault => (
                    <div key={vault.id} className="mb-4">
                        <div
                            className={`px-3 py-1.5 flex items-center justify-between group cursor-pointer ${activeVaultId === vault.id ? '' : 'hover:bg-gray-100'}`}
                            onClick={(e) => { e.stopPropagation(); setActiveVault(vault.id); }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setVaultContextMenu({ x: e.clientX, y: e.clientY, vaultId: vault.id });
                            }}
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
                                    <div key={group.uuid} className="mt-6 pt-4 border-t border-gray-200">
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
                                <div className="mt-6 pt-2 border-t border-gray-200/50 px-3">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                                        <Sparkles size={10} className="mr-1" /> Smart Views
                                    </div>
                                    <div
                                        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors mb-0.5 ${activeGroupId === 'smart-websites' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-200/50'}`}
                                        onClick={() => setActiveGroup('smart-websites')}
                                    >
                                        <Globe size={16} className="mr-2 text-blue-400" />
                                        <span className="flex-1">Websites</span>
                                        <span className="text-[10px] text-gray-400">{smartCounts.websites}</span>
                                    </div>
                                    <div
                                        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors mb-0.5 ${activeGroupId === 'smart-2fa' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-200/50'}`}
                                        onClick={() => setActiveGroup('smart-2fa')}
                                    >
                                        <Smartphone size={16} className="mr-2 text-purple-400" />
                                        <span className="flex-1">2FA Codes</span>
                                        <span className="text-[10px] text-gray-400">{smartCounts.twoFA}</span>
                                    </div>
                                    <div
                                        className={`flex items-center px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors mb-0.5 ${activeGroupId === 'smart-notes' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-200/50'}`}
                                        onClick={() => setActiveGroup('smart-notes')}
                                    >
                                        <StickyNote size={16} className="mr-2 text-yellow-400" />
                                        <span className="flex-1">Notes</span>
                                        <span className="text-[10px] text-gray-400">{smartCounts.notes}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Stats & Action */}
            <div className="border-t border-gray-200 bg-gray-50">
                {activeVaultId && (
                    <div className="px-4 py-2 text-[10px] text-gray-400 flex justify-between border-b border-gray-200/50">
                        <span>{stats.totalFolders} Folders</span>
                        <span>{stats.totalEntries} Entries</span>
                    </div>
                )}
            </div>

            {/* Vault Context Menu */}
            {vaultContextMenu && (
                <div
                    className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-48"
                    style={{ top: vaultContextMenu.y, left: vaultContextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            onAddCategory(vaultContextMenu.vaultId);
                            setVaultContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                        <FolderPlus size={14} className="mr-2 text-gray-400" /> New Category
                    </button>
                    <button
                        onClick={() => {
                            saveVault(vaultContextMenu.vaultId);
                            setVaultContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                        <RefreshCw size={14} className="mr-2 text-gray-400" /> Sync
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                        onClick={() => {
                            removeVault(vaultContextMenu.vaultId);
                            setVaultContextMenu(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                        <Lock size={14} className="mr-2" /> Lock
                    </button>
                </div>
            )}
        </div>
    );
};