import React, { useState, useEffect, useRef } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { useVault } from '../context/VaultContext';
import { Sidebar } from './Sidebar';
import { EntryList } from './EntryList';
import { EntryDetail } from './EntryDetail';
import { VaultUnlockModal } from './VaultUnlockModal';
import { Toaster, useToast } from './ui/Toaster';
import { ShieldCheck, Lock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, FileText } from 'lucide-react';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';
import { GroupModal } from './GroupModal';
import { VaultGroup } from '../types';

export const VaultWorkspace: React.FC = () => {
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const { vaults, activeVaultId, activeGroupId, activeEntries, onAddGroup, onUpdateGroup, onMoveEntry } = useVault();
    const activeVault = vaults.find(v => v.id === activeVaultId);
    const vaultName = activeVault ? activeVault.name : 'KeedaVault';

    // UI Settings - Ensure both sidebars are visible by default
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(false);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            const settings = await getUISettings();
            if (settings.rightSidebarVisible !== undefined) {
                setRightSidebarVisible(settings.rightSidebarVisible);
            }
        };
        loadSettings();
    }, []);

    // Update window title when vault changes
    useEffect(() => {
        const win = getCurrentWebviewWindow();
        const title = vaultName ? `${vaultName} - KeedaVault` : 'KeedaVault';
        win.setTitle(title);
    }, [vaultName]);

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
                console.log('VaultWorkspace: Initializing window...');

                // First, make window resizable and maximizable
                await win.setResizable(true);
                await win.setMaximizable(true);
                await win.setMinimizable(true);

                // Try multiple approaches to force the size
                console.log('VaultWorkspace: Attempting to resize window...');

                // Approach 1: Set min/max size constraints
                await win.setMinSize(new LogicalSize(650, 600));
                await win.setMaxSize(null); // Remove max size constraint

                // Approach 2: Set the actual size
                await win.setSize(new LogicalSize(1200, 700));

                // Approach 3: Force a second resize after a tiny delay
                setTimeout(async () => {
                    try {
                        await win.setSize(new LogicalSize(1200, 700));
                        console.log('VaultWorkspace: Second resize attempt completed');
                    } catch (e) {
                        console.error('Second resize failed:', e);
                    }
                }, 50);

                // Center the window
                await win.center();

                // Ensure visible and focused
                await win.show();
                await win.setFocus();

                // Focus the search input to prevent sidebar buttons from stealing focus
                setTimeout(() => {
                    const searchInput = document.getElementById('entry-search-input');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 100);

                console.log("VaultWorkspace: Window initialized successfully");
            } catch (e) {
                console.error("VaultWorkspace: Failed to init window", e);
            }
        };

        // Execute immediately - no delay
        initWindow();
    }, []);

    const toggleLeftSidebar = () => {
        console.log('Toggling left sidebar', !leftSidebarVisible);
        setLeftSidebarVisible(!leftSidebarVisible);
    };

    const toggleRightSidebar = () => {
        const newValue = !rightSidebarVisible;
        setRightSidebarVisible(newValue);
        saveUISettings({ rightSidebarVisible: newValue });
    };

    // Handle window resize - auto-hide/show sidebar based on width
    // Handle window resize - auto-hide/show sidebar based on width
    useEffect(() => {
        let unlistenFn: (() => void) | null = null;

        const checkAndToggleSidebar = async (logicalWidth?: number) => {
            const win = getCurrentWebviewWindow();
            const factor = await win.scaleFactor();
            const currentWidth: number = logicalWidth ?? await win.innerSize().then(size => size.toLogical(factor).width);

            if (currentWidth < 850) {
                setLeftSidebarVisible(false);
            } else {
                setLeftSidebarVisible(true);
            }
        };

        const setupListener = async () => {
            try {
                const win = getCurrentWebviewWindow();
                // console.log('VaultWorkspace: Setting up resize listener...');

                // Get scale factor for converting physical to logical pixels
                const scaleFactor = await win.scaleFactor();
                // console.log('VaultWorkspace: Scale factor:', scaleFactor);

                // Check initial size (convert physical to logical)
                const initialSize = await win.innerSize();
                const logicalWidth = initialSize.width / scaleFactor;

                await checkAndToggleSidebar(logicalWidth);

                // Listen for resize events using Tauri's listen API
                unlistenFn = await win.listen('tauri://resize', async (event: any) => {
                    // Get current size after resize (convert physical to logical)
                    const size = await win.innerSize();
                    const currentScaleFactor = await win.scaleFactor();
                    const currentLogicalWidth = size.width / currentScaleFactor;
                    await checkAndToggleSidebar(currentLogicalWidth);
                });

                // console.log('VaultWorkspace: Resize listener setup complete');
            } catch (e) {
                console.error('VaultWorkspace: Failed to setup resize listener:', e);
            }
        };

        setupListener();

        return () => {
            if (unlistenFn) {
                unlistenFn();
            }
        };
    }, []);

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



            {/* Left Sidebar - Conditionally rendered */}
            {leftSidebarVisible && (
                <div
                    className="flex-shrink-0 border-r border-gray-200 bg-gray-50/50"
                    style={{ width: 230 }}
                >
                    <Sidebar
                        className="h-full"
                        style={{ width: 230 }}
                        onNewGroup={handleNewGroup}
                        onEditGroup={handleEditGroup}
                        onMoveEntry={onMoveEntry}
                    />
                </div>
            )}

            {/* Main Content Area - EntryList with flexible width */}
            <div className="flex-1 flex flex-col bg-white relative z-0" style={{ minWidth: 300 }}>
                {/* Entry List */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative">
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

            {/* Right Sidebar (Entry Detail) - Conditionally rendered */}
            {rightSidebarVisible && (
                <div
                    className="flex-shrink-0 border-l border-gray-200 bg-white"
                    style={{ width: 300 }}
                >
                    <div className="h-full flex flex-col">
                        {selectedEntryIds.size > 0 ? (
                            <EntryDetail
                                entryId={Array.from(selectedEntryIds)[0]}
                                onClose={() => setSelectedEntryIds(new Set())}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <FileText className="w-8 h-8 opacity-30" />
                                </div>
                                Select an entry to view details
                            </div>
                        )}
                    </div>
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
