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
    const [vaultLoaded, setVaultLoaded] = useState(false);

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
            onAddGroup(name, parentGroupId, icon, allowAdd);
        } else {
            if (categoryModal.initialData?.uuid) {
                onUpdateGroup(categoryModal.initialData.uuid, name, icon, parentGroupId, allowAdd);
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

    const handleSuccess = () => {
        setVaultLoaded(true);
    };

    // If no vault is loaded yet, show the Auth Form (Unlock or Create)
    if (vaults.length === 0 && !vaultLoaded) {
        return (
            <div className="flex h-screen w-screen overflow-hidden flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)' }} onContextMenu={(e) => e.preventDefault()}>
                {/* Unified title bar and content area */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                    {/* Drag Region and Traffic Lights Placeholder */}
                    <div
                        className="absolute top-0 left-0 w-full h-12"
                        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                        data-tauri-drag-region
                    >
                        {/* You can add a subtle background or leave it transparent */}
                    </div>

                    <div className="w-full max-w-sm">
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 border" style={{ boxShadow: 'var(--shadow-xl)', borderColor: 'var(--color-border-light)' }}>
                            {initMode === 'create' ? (
                                <VaultAuthForm
                                    hideHeader={false}
                                    initialMode="create"
                                    allowModeSwitch={false}
                                    onSuccess={handleSuccess}
                                />
                            ) : (
                                <VaultAuthForm
                                    hideHeader={false}
                                    initialVaultInfo={initPath ? { path: initPath, filename: initPath.split(/[/\\]/).pop() || '', lastOpened: 0 } : undefined}
                                    initialMode="open"
                                    allowModeSwitch={false}
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
        <div className="flex h-screen w-screen overflow-hidden flex-col" style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }} onContextMenu={(e) => e.preventDefault()}>
            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar: Vaults and Groups */}
                <aside
                    className={`${leftSidebarVisible ? 'w-64' : 'w-0'} flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden`}
                    style={{ 
                        minWidth: leftSidebarVisible ? '256px' : '0px',
                        backgroundColor: 'var(--color-bg-sidebar)',
                        borderRight: '1px solid var(--color-border-light)'
                    }}
                >
                    <div
                        className="h-12 flex items-center px-4 justify-between flex-shrink-0"
                        style={{ 
                            WebkitAppRegion: 'drag',
                            borderBottom: '1px solid var(--color-border-light)'
                        } as React.CSSProperties}
                        data-tauri-drag-region
                    >
                        {/* Traffic Lights Placeholder / Vault Name */}
                        <div className="pl-14 flex items-center pointer-events-none">
                            <span className="font-semibold text-sm tracking-tight truncate" style={{ color: 'var(--color-text-primary)', opacity: 0.9 }}>{vaultName}</span>
                        </div>

                        <div className="flex items-center space-x-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                            <button
                                onClick={() => activeVaultId && handleAddCategory(activeVaultId)}
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
                                onClick={() => activeVaultId && removeVault(activeVaultId)}
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
                    <Sidebar
                        onOpenVault={handleOpenVault}
                        onAddCategory={handleAddCategory}
                        onEditCategory={handleEditCategory}
                    />
                </aside>

                {/* Main Content Area: Entry List */}
                <main className="flex-1 flex flex-col min-w-0 relative" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                    <div className="flex-1 overflow-hidden flex">
                        <div className={`${selectedEntryId && !rightSidebarVisible ? 'flex' : selectedEntryId ? 'hidden md:flex' : 'flex'} flex-1 flex-col`} style={{ borderRight: '1px solid var(--color-border-light)' }}>
                            <EntryList onSelectEntry={setSelectedEntryId} selectedEntryId={selectedEntryId} leftSidebarVisible={leftSidebarVisible} rightSidebarVisible={rightSidebarVisible} toggleLeftSidebar={toggleLeftSidebar} toggleRightSidebar={toggleRightSidebar} />
                        </div>

                        {/* Right Panel: Details */}
                        {selectedEntryId && rightSidebarVisible ? (
                            <div className="flex-1 md:w-[450px] md:flex-none" style={{ 
                                minWidth: '320px', 
                                maxWidth: '500px',
                                backgroundColor: 'var(--color-bg-sidebar)',
                                borderLeft: '1px solid var(--color-border-light)'
                            }}>
                                <EntryDetail
                                    entryId={selectedEntryId}
                                    onClose={() => setSelectedEntryId(null)}
                                />
                            </div>
                        ) : !selectedEntryId && rightSidebarVisible ? (
                            <div className="hidden md:flex flex-1 items-center justify-center flex-col" style={{ 
                                minWidth: '320px',
                                backgroundColor: 'var(--color-bg-sidebar)',
                                borderLeft: '1px solid var(--color-border-light)'
                            }}>
                                <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-bg-hover)' }}>
                                    <Lock className="w-10 h-10" style={{ color: 'var(--color-text-placeholder)', opacity: 0.5 }} />
                                </div>
                                <p style={{ color: 'var(--color-text-tertiary)' }}>Select an item to view details</p>
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
