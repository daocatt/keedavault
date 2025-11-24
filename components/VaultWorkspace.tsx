import React, { useState, useEffect, useRef } from 'react';
import { VaultProvider, useVault } from '../context/VaultContext';
import { Sidebar } from './Sidebar';
import { EntryList } from './EntryList';
import { EntryDetail } from './EntryDetail';
import { VaultUnlockModal } from './VaultUnlockModal';
import { Toaster, useToast } from './ui/Toaster';
import { VaultAuthForm } from './VaultAuthForm';
import { VaultCreateForm } from './VaultCreateForm';
import { ShieldCheck, Lock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus, Save } from 'lucide-react';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';
import { GroupModal } from './GroupModal';
import { VaultGroup } from '../types';

const VaultLayout = () => {
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const { vaults, activeVaultId, activeGroupId, activeEntries, saveVault, removeVault, onAddGroup, onUpdateGroup, onMoveEntry } = useVault();
    const activeVault = vaults.find(v => v.id === activeVaultId);
    const vaultName = activeVault ? activeVault.name : 'KeedaVault';
    const [initMode, setInitMode] = useState<'unlock' | 'create' | null>(null);
    const [initPath, setInitPath] = useState<string | null>(null);
    const [vaultLoaded, setVaultLoaded] = useState(false);

    // UI Settings
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(() => getUISettings().leftSidebarVisible);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(() => getUISettings().rightSidebarVisible);
    const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
        const settings = getUISettings();
        let width: any = settings.rightSidebarWidth;

        // Robustly handle potential string values from storage
        if (typeof width === 'string') {
            width = parseInt(width, 10);
        }

        // Check if we have a valid number
        if (typeof width === 'number' && !isNaN(width)) {
            // Clamp between 250 and 800. 
            // Using 250 as min to allow user flexibility, but ensuring it's not too small.
            return Math.max(250, Math.min(width, 800));
        }

        return 350; // Default if no valid setting found
    });
    const [isResizing, setIsResizing] = useState(false);
    const rightSidebarWidthRef = useRef(rightSidebarWidth);

    // Keep ref in sync
    useEffect(() => {
        rightSidebarWidthRef.current = rightSidebarWidth;
    }, [rightSidebarWidth]);

    useEffect(() => {
        // Parse URL params
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const path = params.get('path');

        if (action === 'create') {
            setInitMode('create');
        } else {
            setInitMode('unlock');
            if (path) setInitPath(path);
        }
    }, []);

    // Handle resizing
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX;
            // Min 250px, Max 800px
            if (newWidth >= 250 && newWidth <= 800) {
                setRightSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            saveUISettings({ rightSidebarWidth: rightSidebarWidthRef.current });
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);

    const { addToast } = useToast();
    const { onMoveEntries, isRecycleBinGroup } = useVault();

    // DEBUG: Global Drop Listener & Manual Drop Handling
    useEffect(() => {
        const handleGlobalDrop = async (e: DragEvent) => {
            const target = e.target as HTMLElement;
            console.log('🌟 WINDOW DROP EVENT:', target);

            // Manual Drop Detection
            // 1. Find the closest group row
            const groupRow = (e.target as HTMLElement).closest('[data-group-uuid]');

            if (groupRow) {
                const targetGroupId = groupRow.getAttribute('data-group-uuid');
                console.log('🎯 MANUAL DROP DETECTED on Group:', targetGroupId);

                if (targetGroupId) {
                    e.preventDefault();
                    e.stopPropagation();

                    // 2. Parse Data
                    const entriesData = e.dataTransfer?.getData('application/x-keedavault-entries');
                    const textData = e.dataTransfer?.getData('text/plain');

                    let entryIds: string[] = [];

                    if (entriesData) {
                        try {
                            entryIds = JSON.parse(entriesData);
                        } catch (err) { console.error(err); }
                    }

                    if (entryIds.length === 0 && textData) {
                        entryIds = textData.split(',');
                    }

                    // 3. Execute Move
                    if (entryIds.length > 0) {
                        addToast({
                            title: 'Processing Drop...',
                            description: `Moving ${entryIds.length} entries`,
                            type: 'info'
                        });

                        try {
                            // Check if target is recycle bin (we can't easily check isRecycleBinGroup here without passing it down or looking up)
                            // For now, just assume standard move, the context handles logic
                            await onMoveEntries(entryIds, targetGroupId);

                            addToast({
                                title: 'Success',
                                description: 'Entries moved successfully',
                                type: 'success'
                            });
                        } catch (error) {
                            console.error('Move failed:', error);
                            addToast({
                                title: 'Error',
                                description: 'Failed to move entries',
                                type: 'error'
                            });
                        }
                    }
                }
            } else {
                document.dispatchEvent(new CustomEvent('show-toast', {
                    detail: {
                        title: 'Window Drop Captured',
                        description: `Target: <${target.tagName.toLowerCase()}> (No Group ID)`,
                        type: 'info',
                        id: crypto.randomUUID()
                    }
                }));
            }
        };

        const handleGlobalDragOver = (e: DragEvent) => {
            e.preventDefault(); // Allow drops globally
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'move';
            }
        };

        window.addEventListener('drop', handleGlobalDrop, true); // Capture phase
        window.addEventListener('dragover', handleGlobalDragOver, true); // Capture phase

        return () => {
            window.removeEventListener('drop', handleGlobalDrop, true);
            window.removeEventListener('dragover', handleGlobalDragOver, true);
        };
    }, [onMoveEntries, addToast]);

    // Auto-select first entry when group changes
    const prevGroupIdRef = useRef<string | null | undefined>(undefined);
    useEffect(() => {
        if (activeGroupId !== prevGroupIdRef.current) {
            prevGroupIdRef.current = activeGroupId;
            if (activeEntries.length > 0) {
                setSelectedEntryIds(new Set([activeEntries[0].uuid]));
            } else {
                setSelectedEntryIds(new Set());
            }
        }
    }, [activeGroupId, activeEntries]);

    // Group Modal State
    const [groupModal, setGroupModal] = useState<{
        isOpen: boolean;
        mode: 'add' | 'edit';
        vaultId: string;
        initialData?: {
            name: string;
            icon: number;
            parentGroupId?: string;
            allowAdd?: boolean;
            uuid?: string;
        };
    }>({ isOpen: false, mode: 'add', vaultId: '' });

    const handleNewGroup = (vaultId: string, parentId?: string) => {
        const vault = vaults.find(v => v.id === vaultId);
        if (!vault) return;
        setGroupModal({
            isOpen: true,
            mode: 'add',
            vaultId,
            initialData: {
                name: '',
                icon: 48,
                parentGroupId: parentId || vault.groups[0]?.uuid,
                allowAdd: true
            }
        });
    };

    const handleEditGroup = (vaultId: string, group: VaultGroup, parentId?: string) => {
        setGroupModal({
            isOpen: true,
            mode: 'edit',
            vaultId,
            initialData: {
                name: group.name,
                icon: group.icon,
                parentGroupId: parentId,
                allowAdd: true,
                uuid: group.uuid
            }
        });
    };

    const onSaveGroup = async (name: string, icon: number, parentGroupId: string, allowAdd: boolean) => {
        if (groupModal.mode === 'add') {
            await onAddGroup(name, parentGroupId, icon, allowAdd);
        } else {
            if (groupModal.initialData?.uuid) {
                await onUpdateGroup(groupModal.initialData.uuid, name, icon, parentGroupId, allowAdd);
            }
        }
        setGroupModal(prev => ({ ...prev, isOpen: false }));
    };

    const toggleLeftSidebar = () => {
        const newValue = !leftSidebarVisible;
        setLeftSidebarVisible(newValue);
        saveUISettings({ leftSidebarVisible: newValue });
    };

    const toggleRightSidebar = () => {
        const newValue = !rightSidebarVisible;
        setRightSidebarVisible(newValue);
        saveUISettings({ rightSidebarVisible: newValue });
    };

    const handleOpenVault = () => {
        document.dispatchEvent(new CustomEvent('open-unlock-modal'));
    };

    const handleSuccess = () => {
        setVaultLoaded(true);
    };

    // If no vault is loaded yet, show the Auth Form (Unlock or Create)
    if (vaults.length === 0 && !vaultLoaded) {
        return (
            <div className="flex h-screen w-screen overflow-hidden flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)' }} onContextMenu={(e) => e.preventDefault()}>
                {/* Content area with traffic lights fusion */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                    {/* macOS Unified Toolbar - Fusion Style with Extended Drag Region */}
                    {/* Draggable Top Region */}
                    <div
                        className="absolute top-0 left-0 w-full h-12 z-20"
                        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                        data-tauri-drag-region
                    />

                    <div className="w-full max-w-sm relative z-10">
                        <div className="rounded-2xl p-8 bg-primary">
                            {initMode === 'create' ? (
                                <VaultCreateForm
                                    hideHeader={false}
                                    onSuccess={handleSuccess}
                                />
                            ) : (
                                <VaultAuthForm
                                    hideHeader={false}
                                    initialVaultInfo={initPath ? { path: initPath, filename: initPath.split(/[/\\]/).pop() || '', lastOpened: 0 } : undefined}
                                    onSuccess={handleSuccess}
                                />
                            )}
                        </div>
                    </div>
                </div>
                <Toaster />
            </div>
        );
    }



    return (
        <div
            className="flex h-screen w-screen overflow-hidden flex-col"
            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
            onContextMenu={(e) => e.preventDefault()}
        >

            {/* Main Content - Headers are the unified toolbar */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar: Vaults and Groups */}
                <aside
                    className={`${leftSidebarVisible ? 'w-56' : 'w-0'} flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden`}
                    style={{
                        minWidth: leftSidebarVisible ? '224px' : '0px',
                        backgroundColor: 'var(--color-bg-sidebar)',
                        borderRight: '1px solid var(--color-border-light)'
                    }}
                >
                    <Sidebar
                        onOpenVault={handleOpenVault}
                        onNewGroup={handleNewGroup}
                        onEditGroup={handleEditGroup}
                        onMoveEntry={onMoveEntry}
                    />
                </aside>

                {/* Main Content Area: Entry List */}
                <main className="flex-1 flex flex-col min-w-0 relative" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                    <div className="flex-1 overflow-hidden flex">
                        <div className={`${selectedEntryIds.size > 0 && !rightSidebarVisible ? 'flex' : selectedEntryIds.size > 0 ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
                            <EntryList
                                onSelectEntry={(ids) => setSelectedEntryIds(ids)}
                                selectedEntryIds={selectedEntryIds}
                                leftSidebarVisible={leftSidebarVisible}
                                rightSidebarVisible={rightSidebarVisible}
                                toggleLeftSidebar={toggleLeftSidebar}
                                toggleRightSidebar={toggleRightSidebar}
                            />
                        </div>
                        {/* Right Panel: Details */}
                        {/* Right Panel: Details */}
                        {rightSidebarVisible && (
                            <>
                                {/* Resize Handle */}
                                <div
                                    className="cursor-col-resize flex-none transition-colors delay-150 z-10 relative flex items-center justify-center"
                                    style={{
                                        backgroundColor: isResizing ? 'var(--color-accent)' : 'var(--color-border-light)',
                                        width: '1px'
                                    }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setIsResizing(true);
                                    }}
                                >
                                    {/* Invisible wider hit area */}
                                    <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize bg-transparent z-20" />
                                </div>

                                <div className="flex-none flex flex-col" style={{
                                    width: `${rightSidebarWidth}px`,
                                    minWidth: `${rightSidebarWidth}px`,
                                    maxWidth: `${rightSidebarWidth}px`,
                                    backgroundColor: 'var(--color-bg-sidebar)'
                                }}>
                                    {selectedEntryIds.size === 1 ? (
                                        <div className="h-full w-full">
                                            <EntryDetail
                                                entryId={Array.from(selectedEntryIds)[0]}
                                                onClose={() => setSelectedEntryIds(new Set())}
                                            />
                                        </div>
                                    ) : selectedEntryIds.size > 1 ? (
                                        <div className="flex flex-1 items-center justify-center flex-col h-full">
                                            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-bg-hover)' }}>
                                                <div className="text-4xl font-bold text-gray-300">{selectedEntryIds.size}</div>
                                            </div>
                                            <p style={{ color: 'var(--color-text-tertiary)' }}>{selectedEntryIds.size} items selected</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-1 items-center justify-center flex-col h-full">
                                            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-bg-hover)' }}>
                                                <Lock className="w-10 h-10" style={{ color: 'var(--color-text-placeholder)', opacity: 0.5 }} />
                                            </div>
                                            <p style={{ color: 'var(--color-text-tertiary)' }}>Select an item to view details</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>

                <VaultUnlockModal />

                {activeVault && (
                    <GroupModal
                        isOpen={groupModal.isOpen}
                        mode={groupModal.mode}
                        initialData={groupModal.initialData}
                        groups={activeVault.groups}
                        onClose={() => setGroupModal(prev => ({ ...prev, isOpen: false }))}
                        onSave={onSaveGroup}
                    />
                )}

                <Toaster />
            </div>
        </div>
    );
};

export const VaultWorkspace: React.FC = () => {
    return (
        <VaultProvider>
            <VaultLayout />
        </VaultProvider>
    );
};
