import React, { useState, useEffect, useRef } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { useVault } from '../context/VaultContext';
import { Sidebar } from './Sidebar';
import { EntryList } from './EntryList';
import { EntryDetail } from './EntryDetail';
import { VaultUnlockModal } from './VaultUnlockModal';
import { Toaster, useToast } from './ui/Toaster';
import { ShieldCheck, Lock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';
import { GroupModal } from './GroupModal';
import { VaultGroup } from '../types';

export const VaultWorkspace: React.FC = () => {
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const { vaults, activeVaultId, activeGroupId, activeEntries, onAddGroup, onUpdateGroup, onMoveEntry } = useVault();
    const activeVault = vaults.find(v => v.id === activeVaultId);
    const vaultName = activeVault ? activeVault.name : 'KeedaVault';

    // UI Settings
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(() => getUISettings().leftSidebarVisible);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(() => getUISettings().rightSidebarVisible);
    const { addToast } = useToast();

    // Group Modal State
    const [groupModal, setGroupModal] = useState<{
        isOpen: boolean;
        mode: 'add' | 'edit';
        vaultId: string;
        initialData?: {
            name: string;
            icon: number;
            parentGroupId?: string;
            allowAdd: boolean;
            uuid?: string;
        };
    }>({
        isOpen: false,
        mode: 'add',
        vaultId: '',
    });

    // Resize window on mount
    useEffect(() => {
        const initWindow = async () => {
            try {
                const win = getCurrentWebviewWindow();
                // Enforce window capabilities
                await win.setResizable(true);
                await win.setMaximizable(true);
                await win.setMinimizable(true);
                // Set size (230 + 600 + 350 = 1180)
                await win.setSize(new LogicalSize(1180, 700));
                // Center
                await win.center();
                // Ensure visible and focused
                await win.show();
                await win.setFocus();
                console.log("VaultWorkspace: Window resized and shown");
            } catch (e) {
                console.error("VaultWorkspace: Failed to init window", e);
            }
        };
        // Delay to ensure previous window state is cleared and transition is done
        setTimeout(initWindow, 500);
    }, []);

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

    const handleOpenVault = () => {
        document.dispatchEvent(new CustomEvent('open-unlock-modal'));
    };

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

    return (
        <div className="flex h-screen w-screen bg-gray-50 overflow-hidden text-sm select-none">
            <Toaster />

            {/* Drag Region */}
            <div
                className="absolute top-0 left-0 w-full h-8 z-50"
                style={{ userSelect: 'none' }}
                onMouseDown={(e) => {
                    if (e.button === 0) {
                        e.preventDefault();
                        getCurrentWebviewWindow().startDragging();
                    }
                }}
            />

            {/* Left Sidebar */}
            {leftSidebarVisible && (
                <Sidebar
                    className="flex-shrink-0 border-r border-gray-200 bg-gray-50/50"
                    style={{ width: 230 }}
                    onNewGroup={handleNewGroup}
                    onEditGroup={handleEditGroup}
                    onMoveEntry={onMoveEntry}
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative z-0">

                {/* Entry List */}
                <div className="flex-1 overflow-hidden relative">
                    <EntryList
                        onSelectEntry={(ids) => setSelectedEntryIds(ids)}
                        selectedEntryIds={selectedEntryIds}
                        leftSidebarVisible={leftSidebarVisible}
                        rightSidebarVisible={rightSidebarVisible}
                        toggleLeftSidebar={toggleLeftSidebar}
                        toggleRightSidebar={toggleRightSidebar}
                    />
                </div>
            </div>

            {/* Right Sidebar (Entry Detail) */}
            {rightSidebarVisible && (
                <div
                    className="flex-shrink-0 border-l border-gray-200 bg-white relative flex flex-col"
                    style={{ width: 350 }}
                >
                    {selectedEntryIds.size > 0 ? (
                        <EntryDetail
                            entryId={Array.from(selectedEntryIds)[0]}
                            onClose={() => setSelectedEntryIds(new Set())}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                            Select an entry to view details
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <VaultUnlockModal />
            <GroupModal
                isOpen={groupModal.isOpen}
                mode={groupModal.mode}
                initialData={groupModal.initialData}
                groups={activeVault?.groups || []}
                onClose={() => setGroupModal(prev => ({ ...prev, isOpen: false }))}
                onSave={onSaveGroup}
            />
        </div>
    );
};
