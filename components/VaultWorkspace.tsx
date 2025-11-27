import React, { useState, useEffect, useRef } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { useVault } from '../context/VaultContext';
import { Sidebar } from './Sidebar';
import { EntryList } from './EntryList';
import { EntryDetail } from './EntryDetail';
import { VaultUnlockModal } from './VaultUnlockModal';
import { Toaster, useToast } from './ui/Toaster';
import { ShieldCheck, Lock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, FileText } from 'lucide-react';
import { getUISettings, saveUISettings } from '../services/uiSettingsService';
import { GroupModal } from './GroupModal';
import { ImportModal } from './ImportModal';
import { PasswordPromptModal } from './PasswordPromptModal';
import { ExportModal } from './ExportModal';
import { PasswordGenerator } from './PasswordGenerator';
import { CreateEntryModal } from './CreateEntryModal';
import { VaultGroup, EntryFormData } from '../types';

export const VaultWorkspace: React.FC = () => {
    const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
    const { vaults, activeVaultId, activeGroupId, activeEntries, onAddGroup, onUpdateGroup, onMoveEntry, saveVault, onAddEntry } = useVault();
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

    // Enable database menu items when vault is unlocked
    useEffect(() => {
        invoke('set_database_menu_state', { unlocked: true });
        return () => {
            invoke('set_database_menu_state', { unlocked: false });
        };
    }, []);

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

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [passwordPrompt, setPasswordPrompt] = useState<{ isOpen: boolean, fileBuffer: ArrayBuffer | null }>({ isOpen: false, fileBuffer: null });
    const [exportModal, setExportModal] = useState<{
        isOpen: boolean;
        type: 'database' | 'selected';
    }>({
        isOpen: false,
        type: 'database',
    });

    const [passwordGeneratorOpen, setPasswordGeneratorOpen] = useState(false);
    const [createEntryModalOpen, setCreateEntryModalOpen] = useState(false);

    // Handle Menu Actions (Import/Export)
    useEffect(() => {
        const onImportDatabase = () => {
            if (!activeVault) {
                addToast({ title: 'No active vault', type: 'error' });
                return;
            }
            setImportModalOpen(true);
        };

        const onExportDatabase = () => {
            if (!activeVault) {
                addToast({ title: 'No active vault', type: 'error' });
                return;
            }
            setExportModal({ isOpen: true, type: 'database' });
        };

        const onExportSelected = () => {
            if (!activeVault) {
                addToast({ title: 'No active vault', type: 'error' });
                return;
            }
            if (selectedEntryIds.size === 0) {
                addToast({ title: 'No entries selected', type: 'info' });
                return;
            }
            setExportModal({ isOpen: true, type: 'selected' });
        };

        const onPasswordGenerator = () => setPasswordGeneratorOpen(true);
        const onCreateEntry = () => {
            if (!activeVault) {
                addToast({ title: 'No active vault', type: 'error' });
                return;
            }
            setCreateEntryModalOpen(true);
        };
        const onLockDatabase = () => {
            if (activeVault) {
                // Use the lockVault function from context if available, but we need access to it here.
                // Since we are inside the component that provides the context, we can't use useVault() hook directly if we were wrapping it.
                // But VaultWorkspace is NOT the provider, it USES the provider.
                // Wait, VaultWorkspace is the child of VaultProvider?
                // Let's check App.tsx or main entry.
                // Ah, line 22: const { ... } = useVault();
                // So we have access to lockVault from useVault().
                // But wait, lockVault is not destructured in line 22.
                // I need to destructure it.
            }
        };
        const onChangeCredentials = () => addToast({ title: 'Coming Soon', description: 'Change Credentials feature is coming soon.', type: 'info' });
        const onDatabaseSetting = () => addToast({ title: 'Coming Soon', description: 'Database Settings feature is coming soon.', type: 'info' });


        const unlistenImportDb = getCurrentWebviewWindow().listen('import-database', onImportDatabase);
        const unlistenExportDb = getCurrentWebviewWindow().listen('export-database', onExportDatabase);
        const unlistenExportSel = getCurrentWebviewWindow().listen('export-selected', onExportSelected);
        const unlistenPwdGen = getCurrentWebviewWindow().listen('password-generator', onPasswordGenerator);
        const unlistenCreateEntry = getCurrentWebviewWindow().listen('create-entry', onCreateEntry);
        const unlistenLockDb = getCurrentWebviewWindow().listen('lock-database', () => {
            if (activeVaultId) {
                // We need to call lockVault from context.
                // Since we can't easily access the latest lockVault from closure without adding it to deps,
                // and adding it to deps might re-trigger effect.
                // But lockVault is stable?
                // Actually, I'll just emit a custom event or use a ref if needed.
                // Or better, just dispatch a custom event that VaultWorkspace listens to?
                // No, I can just use the function if I include it in dependencies.
                document.dispatchEvent(new CustomEvent('trigger-lock-vault', { detail: { vaultId: activeVaultId } }));
            }
        });
        const unlistenChangeCred = getCurrentWebviewWindow().listen('change-credentials', onChangeCredentials);
        const unlistenDbSetting = getCurrentWebviewWindow().listen('database-setting', onDatabaseSetting);

        return () => {
            unlistenImportDb.then(f => f());
            unlistenExportDb.then(f => f());
            unlistenExportSel.then(f => f());
            unlistenPwdGen.then(f => f());
            unlistenCreateEntry.then(f => f());
            unlistenLockDb.then(f => f());
            unlistenChangeCred.then(f => f());
            unlistenDbSetting.then(f => f());
        };
    }, [activeVault, selectedEntryIds, addToast, onAddEntry, activeVaultId]);

    // Effect to handle lock vault trigger
    const { lockVault } = useVault();
    useEffect(() => {
        const handleLock = (e: CustomEvent) => {
            if (e.detail && e.detail.vaultId) {
                lockVault(e.detail.vaultId);
            }
        };
        document.addEventListener('trigger-lock-vault', handleLock as EventListener);
        return () => document.removeEventListener('trigger-lock-vault', handleLock as EventListener);
    }, [lockVault]);

    const importEntries = async (entries: EntryFormData[]) => {
        if (!activeVault) return;

        const targetGroupId = activeGroupId && activeGroupId !== 'smart-websites' && !activeGroupId.startsWith('smart-')
            ? activeGroupId
            : activeVault.groups[0]?.uuid;

        if (!targetGroupId) {
            addToast({ title: 'Cannot determine target group', type: 'error' });
            return;
        }

        let successCount = 0;
        for (const entry of entries) {
            try {
                await onAddEntry({ ...entry, groupUuid: targetGroupId });
                successCount++;
            } catch (e) {
                console.warn('Failed to import entry', entry.title);
            }
        }

        if (successCount > 0) {
            addToast({ title: `Imported ${successCount} entries`, type: 'success' });
        } else {
            addToast({ title: 'No entries imported', type: 'info' });
        }
    };

    const handleKdbxUnlock = async (password: string) => {
        if (!passwordPrompt.fileBuffer) return;

        try {
            const { parseKdbxToEntries } = await import('../services/importService');
            const entries = await parseKdbxToEntries(passwordPrompt.fileBuffer, password);

            if (entries.length === 0) {
                addToast({ title: 'No entries found in KDBX', type: 'info' });
                setPasswordPrompt({ isOpen: false, fileBuffer: null });
                return;
            }

            await importEntries(entries);
            setPasswordPrompt({ isOpen: false, fileBuffer: null });

        } catch (e: any) {
            addToast({ title: e.message || 'Failed to import KDBX', type: 'error' });
        }
    };

    const handleImportConfirm = async (source: 'kdbx' | 'csv' | 'bitwarden' | 'lastpass' | 'apple' | 'enpass' | '1password' | 'chrome' | 'firefox') => {
        if (!activeVault) return;

        try {
            if (source === 'kdbx') {
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'KDBX Database', extensions: ['kdbx', 'kdb'] }]
                });

                if (!selected || typeof selected !== 'string') return;

                const content = await readFile(selected);
                setPasswordPrompt({ isOpen: true, fileBuffer: content.buffer as ArrayBuffer });
                return;
            }

            if (source === 'csv') {
                // Open file dialog
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'CSV File', extensions: ['csv'] }]
                });

                if (!selected || typeof selected !== 'string') return;

                // Read file
                const content = await readFile(selected);
                const text = new TextDecoder().decode(content);

                // Parse CSV
                const { parseCsvToEntries } = await import('../services/importService');
                const entries = parseCsvToEntries(text);

                if (entries.length === 0) {
                    addToast({ title: 'No entries found in CSV', type: 'error' });
                    return;
                }

                await importEntries(entries);
            } else if (source === 'bitwarden') {
                // Open file dialog
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Bitwarden JSON', extensions: ['json'] }]
                });

                if (!selected || typeof selected !== 'string') return;

                // Read file
                const content = await readFile(selected);
                const text = new TextDecoder().decode(content);

                // Parse JSON
                const { parseBitwardenJsonToEntries } = await import('../services/importService');
                const entries = parseBitwardenJsonToEntries(text);

                if (entries.length === 0) {
                    addToast({ title: 'No entries found in Bitwarden JSON', type: 'error' });
                    return;
                }

                await importEntries(entries);
            } else if (source === 'lastpass') {
                // Open file dialog
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'LastPass CSV', extensions: ['csv'] }]
                });

                if (!selected || typeof selected !== 'string') return;

                // Read file
                const content = await readFile(selected);
                const text = new TextDecoder().decode(content);

                // Parse CSV
                const { parseLastPassCsvToEntries } = await import('../services/importService');
                const entries = parseLastPassCsvToEntries(text);

                if (entries.length === 0) {
                    addToast({ title: 'No entries found in LastPass CSV', type: 'error' });
                    return;
                }

                await importEntries(entries);
            } else if (source === 'apple') {
                // Open file dialog
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Apple Passwords CSV', extensions: ['csv'] }]
                });

                if (!selected || typeof selected !== 'string') return;

                // Read file
                const content = await readFile(selected);
                const text = new TextDecoder().decode(content);

                // Parse CSV
                const { parseAppleCsvToEntries } = await import('../services/importService');
                const entries = parseAppleCsvToEntries(text);

                if (entries.length === 0) {
                    addToast({ title: 'No entries found in Apple CSV', type: 'error' });
                    return;
                }

                await importEntries(entries);
            } else if (source === 'chrome') {
                // Open file dialog
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Chrome Passwords CSV', extensions: ['csv'] }]
                });

                if (!selected || typeof selected !== 'string') return;

                // Read file
                const content = await readFile(selected);
                const text = new TextDecoder().decode(content);

                // Parse CSV
                const { parseChromeCsvToEntries } = await import('../services/importService');
                const entries = parseChromeCsvToEntries(text);

                if (entries.length === 0) {
                    addToast({ title: 'No entries found in Chrome CSV', type: 'error' });
                    return;
                }

                await importEntries(entries);
            } else if (source === 'firefox') {
                // Open file dialog
                const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Firefox Passwords CSV', extensions: ['csv'] }]
                });

                if (!selected || typeof selected !== 'string') return;

                // Read file
                const content = await readFile(selected);
                const text = new TextDecoder().decode(content);

                // Parse CSV
                const { parseFirefoxCsvToEntries } = await import('../services/importService');
                const entries = parseFirefoxCsvToEntries(text);

                if (entries.length === 0) {
                    addToast({ title: 'No entries found in Firefox CSV', type: 'error' });
                    return;
                }

                await importEntries(entries);
            } else {
                addToast({ title: 'Coming Soon', description: `${source} import is not yet implemented.`, type: 'info' });
            }
        } catch (e: any) {
            console.error('Import failed', e);
            addToast({ title: 'Import failed', description: e.message, type: 'error' });
        }
    };

    const handleExportConfirm = async (format: 'kdbx' | 'csv') => {
        if (!activeVault) return;

        try {
            const defaultName = exportModal.type === 'database'
                ? `${activeVault.filename || 'Database'}_Export`
                : 'Selected_Entries_Export';

            const extension = format;
            const filterName = format === 'kdbx' ? 'KeePass Database' : 'CSV File';

            const path = await save({
                defaultPath: `${defaultName}.${extension}`,
                filters: [{ name: filterName, extensions: [extension] }]
            });

            if (!path) return;

            if (exportModal.type === 'database') {
                if (format === 'csv') {
                    // CSV Export Full DB
                    const { getAllEntriesFromGroups, entriesToCsv } = await import('../services/exportService');
                    const allEntries = getAllEntriesFromGroups(activeVault.groups);
                    const data = entriesToCsv(allEntries);
                    await writeFile(path, new TextEncoder().encode(data));
                } else {
                    // KDBX Export Full DB
                    const kdbxData = await activeVault.db.save();
                    await writeFile(path, new Uint8Array(kdbxData));
                }
            } else {
                // Export Selected
                const { getAllEntriesFromGroups, entriesToCsv, createKdbxFromEntries } = await import('../services/exportService');
                const allEntries = getAllEntriesFromGroups(activeVault.groups);
                const selectedEntries = allEntries.filter(e => selectedEntryIds.has(e.uuid));

                if (format === 'csv') {
                    const csvData = entriesToCsv(selectedEntries);
                    await writeFile(path, new TextEncoder().encode(csvData));
                } else {
                    // @ts-ignore
                    const credentials = activeVault.db.credentials;
                    if (!credentials) throw new Error("Could not retrieve vault credentials.");

                    const kdbxData = await createKdbxFromEntries(selectedEntries, credentials, 'Exported');
                    await writeFile(path, new Uint8Array(kdbxData));
                }
            }

            addToast({ title: 'Export successful', type: 'success' });
        } catch (error) {
            console.error('Export failed:', error);
            addToast({ title: 'Export failed', description: String(error), type: 'error' });
        }
    };

    // Global Save Shortcut (Cmd+S)
    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();

                // Check if our local group modal is open
                if (groupModal.isOpen) return;
                if (exportModal.isOpen) return;
                if (importModalOpen) return;
                if (passwordPrompt.isOpen) return;

                // Simple check for other modals (like Entry Edit modal) by checking for common modal classes or z-index layers
                // This is a heuristic since we don't have access to EntryList's state directly
                const hasOpenModals = document.querySelectorAll('.fixed.inset-0.z-50').length > 0;
                if (hasOpenModals) return;

                if (activeVaultId) {
                    await saveVault(activeVaultId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeVaultId, groupModal.isOpen, exportModal.isOpen, importModalOpen, passwordPrompt.isOpen, saveVault]);

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
            <ExportModal
                isOpen={exportModal.isOpen}
                type={exportModal.type}
                onClose={() => setExportModal(prev => ({ ...prev, isOpen: false }))}
                onExport={handleExportConfirm}
            />
            <ImportModal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImportConfirm}
            />

            <PasswordPromptModal
                isOpen={passwordPrompt.isOpen}
                onClose={() => setPasswordPrompt({ isOpen: false, fileBuffer: null })}
                onConfirm={handleKdbxUnlock}
                title="Unlock Import Database"
                description="Enter the master password for the KDBX file you want to import."
            />
            {/* Global Password Generator Modal */}
            {passwordGeneratorOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setPasswordGeneratorOpen(false)}>
                    <div onClick={e => e.stopPropagation()}>
                        <PasswordGenerator
                            isOpen={true}
                            onClose={() => setPasswordGeneratorOpen(false)}
                            onGenerate={() => setPasswordGeneratorOpen(false)}
                            className="w-96 bg-white rounded-xl shadow-2xl border border-gray-200 p-4"
                        />
                    </div>
                </div>
            )}

            <CreateEntryModal
                isOpen={createEntryModalOpen}
                onClose={() => setCreateEntryModalOpen(false)}
            />
        </div>
    );
};
