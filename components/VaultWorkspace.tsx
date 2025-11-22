import React, { useState, useEffect, useRef } from 'react';
import { VaultProvider, useVault } from '../context/VaultContext';
import { Sidebar } from './Sidebar';
import { EntryList } from './EntryList';
import { EntryDetail } from './EntryDetail';
import { VaultUnlockModal } from './VaultUnlockModal';
import { Toaster } from './ui/Toaster';
import { VaultAuthForm } from './VaultAuthForm';
import { ShieldCheck, Lock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Plus, Save } from 'lucide-react';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';
import { CategoryModal } from './CategoryModal';
import { VaultGroup } from '../types';

const VaultLayout = () => {
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const { vaults, activeVaultId, activeGroupId, activeEntries, saveVault, removeVault, onAddGroup, onUpdateGroup } = useVault();
    const activeVault = vaults.find(v => v.id === activeVaultId);
    const vaultName = activeVault ? activeVault.name : 'KeedaVault';
    const [initMode, setInitMode] = useState<'unlock' | 'create' | null>(null);
    const [initPath, setInitPath] = useState<string | null>(null);

    // UI Settings
    const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
    const [rightSidebarVisible, setRightSidebarVisible] = useState(true);

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

        // Load UI settings
        const settings = getUISettings();
        setLeftSidebarVisible(settings.leftSidebarVisible);
        setRightSidebarVisible(settings.rightSidebarVisible);
    }, []);

    // Auto-select first entry when category changes
    const prevGroupIdRef = useRef<string | null | undefined>(undefined);
    useEffect(() => {
        if (activeGroupId !== prevGroupIdRef.current) {
            prevGroupIdRef.current = activeGroupId;
            if (activeEntries.length > 0) {
                setSelectedEntryId(activeEntries[0].uuid);
            } else {
                setSelectedEntryId(null);
            }
        }
    }, [activeGroupId, activeEntries]);

    // Category Modal State
    const [categoryModal, setCategoryModal] = useState<{
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

    const handleAddCategory = (vaultId: string, parentId?: string) => {
        const vault = vaults.find(v => v.id === vaultId);
        if (!vault) return;
        setCategoryModal({
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

    const handleEditCategory = (vaultId: string, group: VaultGroup, parentId?: string) => {
        setCategoryModal({
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

    const onSaveCategory = async (name: string, icon: number, parentGroupId: string, allowAdd: boolean) => {
        if (categoryModal.mode === 'add') {
            await onAddGroup(name, parentGroupId, icon, allowAdd);
        } else {
            if (categoryModal.initialData?.uuid) {
                await onUpdateGroup(categoryModal.initialData.uuid, name, icon, parentGroupId, allowAdd);
            }
        }
        setCategoryModal(prev => ({ ...prev, isOpen: false }));
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

    // If no vault is loaded yet, show the Auth Form (Unlock or Create)
    if (vaults.length === 0) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
                <div className="w-full max-w-md p-6">
                    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                        {initMode === 'create' ? (
                            <VaultAuthForm
                                hideHeader={false}
                                initialMode="create"
                                allowModeSwitch={false}
                            />
                        ) : (
                            <VaultAuthForm
                                hideHeader={false}
                                initialVaultInfo={initPath ? { path: initPath, filename: initPath.split(/[/\\]/).pop() || '', lastOpened: 0 } : undefined}
                                initialMode="open"
                                allowModeSwitch={false}
                            />
                        )}
                    </div>
                </div>
                <Toaster />
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900" onContextMenu={(e) => e.preventDefault()}>
            {/* Left Sidebar: Vaults and Groups */}
            <aside
                className={`${leftSidebarVisible ? 'w-64' : 'w-0'} flex-shrink-0 border-r border-gray-200 bg-gray-100/80 backdrop-blur-xl flex flex-col transition-all duration-300 overflow-hidden`}
                style={{ minWidth: leftSidebarVisible ? '256px' : '0px' }}
            >
                <div className="h-12 flex items-center px-4 border-b border-gray-200/50 draggable-region justify-between">
                    <div className="flex items-center min-w-0">
                        <ShieldCheck className="w-5 h-5 text-indigo-600 mr-2 flex-shrink-0" />
                        <span className="font-semibold text-gray-700 tracking-tight truncate" title={vaultName}>{vaultName}</span>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                        <button
                            onClick={() => activeVaultId && handleAddCategory(activeVaultId)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-200 rounded transition-colors"
                            title="Add Category"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => activeVaultId && saveVault(activeVaultId)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-200 rounded transition-colors"
                            title="Save Vault"
                        >
                            <Save size={16} />
                        </button>
                        <button
                            onClick={() => activeVaultId && removeVault(activeVaultId)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
                            title="Lock Vault"
                        >
                            <Lock size={16} />
                        </button>
                    </div>
                </div>
                <Sidebar
                    onOpenVault={handleOpenVault}
                    onAddCategory={handleAddCategory}
                    onEditCategory={handleEditCategory}
                />
            </aside>

            {/* Main Content Area: Entry List */}
            <main className="flex-1 flex flex-col min-w-0 bg-white relative z-0">


                <div className="flex-1 overflow-hidden flex">
                    <div className={`${selectedEntryId && !rightSidebarVisible ? 'flex' : selectedEntryId ? 'hidden md:flex' : 'flex'} flex-1 flex-col border-r border-gray-200`}>
                        <EntryList onSelectEntry={setSelectedEntryId} selectedEntryId={selectedEntryId} leftSidebarVisible={leftSidebarVisible} rightSidebarVisible={rightSidebarVisible} toggleLeftSidebar={toggleLeftSidebar} toggleRightSidebar={toggleRightSidebar} />
                    </div>

                    {/* Right Panel: Details */}
                    {selectedEntryId && rightSidebarVisible ? (
                        <div className="flex-1 md:w-[400px] md:flex-none bg-gray-50/50" style={{ minWidth: '320px', maxWidth: '500px' }}>
                            <EntryDetail
                                entryId={selectedEntryId}
                                onClose={() => setSelectedEntryId(null)}
                            />
                        </div>
                    ) : !selectedEntryId && rightSidebarVisible ? (
                        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 text-gray-400 flex-col" style={{ minWidth: '320px' }}>
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-10 h-10 opacity-20" />
                            </div>
                            <p>Select an item to view details</p>
                        </div>
                    ) : null}
                </div>
            </main>

            <VaultUnlockModal />

            {activeVault && (
                <CategoryModal
                    isOpen={categoryModal.isOpen}
                    mode={categoryModal.mode}
                    initialData={categoryModal.initialData}
                    groups={activeVault.groups}
                    onClose={() => setCategoryModal(prev => ({ ...prev, isOpen: false }))}
                    onSave={onSaveCategory}
                />
            )}

            <Toaster />
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
