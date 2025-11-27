import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { save, ask } from '@tauri-apps/plugin-dialog';
import { emit } from '@tauri-apps/api/event';
import * as kdbxweb from 'kdbxweb';
import { Vault, VaultGroup, VaultEntry, FileSystemFileHandle, EntryFormData } from '../types';
import {
    parseKdbxStructure,
    createDatabase,
    addGroupToDb,
    renameGroupInDb,
    addEntryToDb,
    updateEntryInDb,
    updateGroupInDb,
    deleteGroupFromDb,
    findGroup,
    findEntryParent,
    deleteEntryFromDb,
    moveEntryInDb,
    restoreEntryFromRecycleBin,
    getOriginalGroupInfo,
    initializeArgon2
} from '../services/kdbxService';
import { useToast } from '../components/ui/Toaster';
import { saveRecentVault, getRecentVaults } from '../services/storageService';
import { fileSystem, FileHandle } from '../services/fileSystemAdapter';

interface VaultContextType {
    vaults: Vault[];
    activeVaultId: string | null;
    activeGroupId: string | null;
    searchQuery: string;
    addVault: (fileOrPath: File | FileSystemFileHandle | string, password: string, keyFile?: File) => Promise<void>;
    createVault: (name: string, password: string, keyFile?: File) => Promise<void>;
    saveVault: (id: string, isAutoSave?: boolean) => Promise<void>;
    removeVault: (id: string) => void;
    setActiveVault: (id: string) => void;
    setActiveGroup: (id: string) => void;
    setSearchQuery: (query: string) => void;
    activeEntries: VaultEntry[];
    getEntry: (uuid: string) => VaultEntry | undefined;
    getActiveGroup: () => VaultGroup | undefined;
    refreshVault: (vaultId: string) => void;
    isUnlocking: boolean;
    unlockError: string | null;
    clearError: () => void;

    // CRUD
    onAddGroup: (name: string, parentGroupId?: string, icon?: number, allowAdd?: boolean) => Promise<void>;
    onRenameGroup: (groupId: string, newName: string) => Promise<void>;
    onUpdateGroup: (groupId: string, name: string, icon?: number, parentGroupId?: string, allowAdd?: boolean) => Promise<void>;
    onDeleteGroup: (groupId: string) => Promise<void>;
    onAddEntry: (data: EntryFormData) => Promise<void>;
    onEditEntry: (data: EntryFormData) => Promise<void>;
    onDeleteEntry: (entryId: string) => Promise<void>;
    onMoveEntry: (entryId: string, targetGroupId: string) => Promise<void>;
    onMoveEntries: (entryIds: string[], targetGroupId: string) => Promise<void>;
    onRestoreEntry: (entryId: string) => Promise<void>;
    isRecycleBinGroup: (groupId: string) => boolean;
    isEntryInRecycleBin: (entryId: string) => boolean;
    onEmptyRecycleBin: () => Promise<void>;
    lockVault: (id: string) => void;
}

// ...



const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [vaults, setVaults] = useState<Vault[]>([]);
    const [activeVaultId, setActiveVaultId] = useState<string | null>(null);
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);
    const { addToast } = useToast();

    // Helper to flatten groups for searching
    const getAllEntries = useCallback((groups: VaultGroup[]): VaultEntry[] => {
        let entries: VaultEntry[] = [];
        for (const group of groups) {
            entries = [...entries, ...group.entries];
            if (group.subgroups.length > 0) {
                entries = [...entries, ...getAllEntries(group.subgroups)];
            }
        }
        return entries;
    }, []);

    const getGroupEntries = useCallback((groups: VaultGroup[], groupId: string): VaultEntry[] => {
        for (const group of groups) {
            if (group.uuid === groupId) return group.entries;
            const sub = getGroupEntries(group.subgroups, groupId);
            if (sub.length > 0) return sub;
        }
        return [];
    }, []);

    const activeVault = useMemo(() => vaults.find(v => v.id === activeVaultId), [vaults, activeVaultId]);

    const activeEntries = useMemo(() => {
        if (!activeVault) return [];

        if (searchQuery.trim()) {
            // Search mode: flatten entire vault
            const all = getAllEntries(activeVault.groups);
            const q = searchQuery.toLowerCase();
            return all.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.username.toLowerCase().includes(q) ||
                e.url.toLowerCase().includes(q)
            );
        }

        if (!activeGroupId) {
            // Default to first group if nothing selected
            return activeVault.groups[0]?.entries || [];
        }

        // Smart Views
        if (activeGroupId === 'smart-websites') {
            const all = getAllEntries(activeVault.groups);
            return all.filter(e => !!e.url);
        }
        if (activeGroupId === 'smart-2fa') {
            const all = getAllEntries(activeVault.groups);
            return all.filter(e => e.fields.OTP);
        }
        if (activeGroupId === 'smart-notes') {
            const all = getAllEntries(activeVault.groups);
            return all.filter(e => e.fields.Notes);
        }
        if (activeGroupId === 'smart-duplicated') {
            const all = getAllEntries(activeVault.groups);
            // Group by password
            const passwordMap = new Map<string, VaultEntry[]>();
            all.forEach(e => {
                if (e.password) {
                    const existing = passwordMap.get(e.password) || [];
                    passwordMap.set(e.password, [...existing, e]);
                }
            });
            // Filter only those with duplicates
            const duplicates: VaultEntry[] = [];
            passwordMap.forEach((entries) => {
                if (entries.length > 1) {
                    duplicates.push(...entries);
                }
            });
            return duplicates;
        }

        return getGroupEntries(activeVault.groups, activeGroupId);
    }, [activeVault, activeGroupId, searchQuery, getAllEntries, getGroupEntries]);

    const refreshVault = useCallback((vaultId: string) => {
        setVaults(prev => prev.map(v => {
            if (v.id === vaultId) {
                return { ...v, groups: parseKdbxStructure(v.db) };
            }
            return v;
        }));
    }, []);

    // Persist changes to disk
    const saveVault = async (id: string, isAutoSave = false) => {
        const vault = vaults.find(v => v.id === id);
        if (!vault) return;

        try {
            // Only block UI for manual saves
            if (!isAutoSave) setIsUnlocking(true);

            const data = await vault.db.save();

            if (vault.path) {
                // Native Tauri Save
                await writeFile(vault.path, new Uint8Array(data));
                if (!isAutoSave) addToast({ title: "Saved to file", type: "success" });
            } else if (vault.fileHandle) {
                const writable = await vault.fileHandle.createWritable();
                await writable.write(data);
                await writable.close();
                if (!isAutoSave) addToast({ title: "Saved to file", type: "success" });
            } else {
                // Handling for fallback (non-native file system)
                if (!isAutoSave) {
                    // Manual download
                    const blob = new Blob([data], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = vault.filename || 'database.kdbx';
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast({ title: "Vault downloaded", type: "success" });
                } else {
                    // Silent failure for auto-save if no handle
                    console.log("Auto-save skipped (No file handle). Changes are in memory.");
                }
            }
        } catch (e) {
            console.error(e);
            if (!isAutoSave) addToast({ title: "Failed to save vault", type: "error" });
        } finally {
            if (!isAutoSave) setIsUnlocking(false);
        }
    };

    const onAddGroup = async (name: string, parentGroupId?: string, icon?: number, allowAdd?: boolean) => {
        if (!activeVault) return;
        const targetGroup = parentGroupId || activeGroupId || activeVault.groups[0].uuid;
        try {
            addGroupToDb(activeVault.db, targetGroup, name, icon, allowAdd);
            refreshVault(activeVault.id);
            await saveVault(activeVault.id, true);
            addToast({ title: "Group created", type: "success" });
        } catch (e: any) {
            console.error(e);
            addToast({ title: e.message || "Failed to create group", type: "error" });
        }
    };

    const onDeleteGroup = async (groupId: string) => {
        if (!activeVault) return;

        // Helper to find group
        const findGroupById = (groups: VaultGroup[], id: string): VaultGroup | undefined => {
            for (const group of groups) {
                if (group.uuid === id) return group;
                const found = findGroupById(group.subgroups, id);
                if (found) return found;
            }
            return undefined;
        };

        // Helper to count entries recursively
        const countEntriesInGroup = (group: VaultGroup): number => {
            let count = group.entries.length;
            for (const sub of group.subgroups) {
                count += countEntriesInGroup(sub);
            }
            return count;
        };

        const groupToDelete = findGroupById(activeVault.groups, groupId);
        if (groupToDelete) {
            const totalEntries = countEntriesInGroup(groupToDelete);
            if (totalEntries > 0) {
                addToast({
                    title: `Cannot delete`,
                    description: `Group contains ${totalEntries} items`,
                    type: "error"
                });
                return;
            }
        }

        const confirmed = await ask("Are you sure you want to delete this group?", {
            title: 'Delete Group',
            kind: 'warning'
        });

        if (confirmed) {
            try {
                deleteGroupFromDb(activeVault.db, groupId);
                refreshVault(activeVault.id);
                if (activeGroupId === groupId) setActiveGroupId(activeVault.groups[0].uuid);
                await saveVault(activeVault.id, true);
                addToast({ title: "Group deleted", type: "success" });
            } catch (e: any) {
                console.error(e);
                addToast({ title: e.message || "Failed to delete group", type: "error" });
            }
        }
    };

    const isRecycleBinGroup = (groupId: string): boolean => {
        const activeVault = vaults.find(v => v.id === activeVaultId);
        if (!activeVault) return false;
        const root = activeVault.db.getDefaultGroup();
        if (!root) return false;
        const group = findGroup(root, groupId);
        return !!group?.isRecycleBin;
    };

    const isEntryInRecycleBin = (entryId: string): boolean => {
        const activeVault = vaults.find(v => v.id === activeVaultId);
        if (!activeVault) return false;
        const root = activeVault.db.getDefaultGroup();
        if (!root) return false;
        const result = findEntryParent(root, entryId);
        if (!result) return false;
        const { group } = result;
        return !!group?.isRecycleBin;
    };

    const onRestoreEntry = async (entryId: string) => {
        if (!activeVault) return;
        try {
            const { groupName, groupIcon } = restoreEntryFromRecycleBin(activeVault.db, entryId);
            refreshVault(activeVault.id);
            await saveVault(activeVault.id, true);
            addToast({ title: `Restored to ${groupName}`, type: 'success' });
        } catch (e: any) {
            console.error(e);
            addToast({ title: e.message || 'Failed to restore entry', type: 'error' });
        }
    };

    const onAddEntry = async (data: EntryFormData) => {
        if (!activeVault) return;
        const targetGroup = data.groupUuid || activeGroupId;
        if (!targetGroup) return;

        try {
            addEntryToDb(activeVault.db, targetGroup, data);
            refreshVault(activeVault.id);
            await saveVault(activeVault.id, true);
            addToast({ title: "Entry created", type: "success" });
        } catch (e: any) {
            console.error(e);
            addToast({ title: e.message || "Failed to create entry", type: "error" });
        }
    };

    const onEditEntry = async (data: EntryFormData) => {
        if (!activeVault) return;
        try {
            updateEntryInDb(activeVault.db, data);
            refreshVault(activeVault.id);
            await saveVault(activeVault.id, true);
            addToast({ title: "Entry updated", type: "success" });
        } catch (e: any) {
            console.error(e);
            addToast({ title: e.message || "Failed to update entry", type: "error" });
        }
    };

    const onDeleteEntry = async (entryId: string) => {
        if (!activeVault) return;

        // Check if entry is in recycle bin OR if we are currently viewing the recycle bin
        // This handles cases where isEntryInRecycleBin might fail or be slow, but we know we are in the bin
        const currentGroup = getActiveGroup();
        const inRecycleBin = isEntryInRecycleBin(entryId) || (currentGroup?.isRecycleBin === true);

        const title = inRecycleBin ? 'Permanently Delete Entry' : 'Delete Entry';
        const message = inRecycleBin
            ? "Are you sure you want to permanently delete this entry? This cannot be undone."
            : "Move this entry to the Recycle Bin?";

        const confirmed = await ask(message, {
            title: title,
            kind: 'warning'
        });

        if (confirmed) {
            try {
                deleteEntryFromDb(activeVault.db, entryId);
                refreshVault(activeVault.id);
                await saveVault(activeVault.id, true);
                addToast({ title: inRecycleBin ? "Entry permanently deleted" : "Entry moved to Recycle Bin", type: "success" });
            } catch (e: any) {
                console.error(e);
                addToast({ title: e.message || "Failed to delete entry", type: "error" });
            }
        }
    };

    const onMoveEntry = async (entryId: string, targetGroupId: string) => {
        if (!activeVault) return;
        try {
            moveEntryInDb(activeVault.db, entryId, targetGroupId);
            refreshVault(activeVault.id);
            await saveVault(activeVault.id, true);
            addToast({ title: "Entry moved", type: "success" });
        } catch (e: any) {
            console.error(e);
            addToast({ title: e.message || "Failed to move entry", type: "error" });
        }
    };

    const onMoveEntries = async (entryIds: string[], targetGroupId: string) => {
        if (!activeVault) return;
        try {
            let movedCount = 0;
            for (const entryId of entryIds) {
                try {
                    moveEntryInDb(activeVault.db, entryId, targetGroupId);
                    movedCount++;
                } catch (e) {
                    console.warn(`Failed to move entry ${entryId}`, e);
                }
            }

            if (movedCount > 0) {
                refreshVault(activeVault.id);
                await saveVault(activeVault.id, true);
                addToast({ title: `${movedCount} entries moved`, type: "success" });
            }
        } catch (e: any) {
            console.error(e);
            addToast({ title: e.message || "Failed to move entries", type: "error" });
        }
    };
    const addVault = async (fileOrPath: File | FileSystemFileHandle | string, password: string, keyFile?: File) => {
        initializeArgon2();
        setIsUnlocking(true);
        setUnlockError(null);
        try {
            let file: File | undefined;
            let handle: FileSystemFileHandle | undefined;
            let path: string | undefined;
            let arrayBuffer: ArrayBuffer;
            let filename: string;

            if (typeof fileOrPath === 'string') {
                path = fileOrPath;
                // Read file using Tauri fs
                const data = await readFile(path);
                arrayBuffer = data.buffer as ArrayBuffer;
                // Extract filename from path (simple split)
                const parts = path.split(/[/\\]/);
                filename = parts[parts.length - 1];
            } else if ('getFile' in fileOrPath && typeof fileOrPath.getFile === 'function') {
                handle = fileOrPath as FileSystemFileHandle;
                file = await handle.getFile();
                arrayBuffer = await file.arrayBuffer();
                filename = file.name;
            } else {
                file = fileOrPath as File;
                arrayBuffer = await file.arrayBuffer();
                filename = file.name;
            }

            const keyFileBuffer = keyFile ? await keyFile.arrayBuffer() : undefined;

            const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password), keyFileBuffer);

            const db = await kdbxweb.Kdbx.load(arrayBuffer as ArrayBuffer, credentials);

            const parsedStructure = parseKdbxStructure(db);

            const newVault: Vault = {
                id: crypto.randomUUID(),
                name: filename.replace('.kdbx', ''),
                filename: filename,
                db: db,
                groups: parsedStructure,
                fileHandle: handle,
                path: path
            };

            setVaults(prev => [...prev, newVault]);
            setActiveVaultId(newVault.id);
            if (newVault.groups.length > 0) {
                setActiveGroupId(newVault.groups[0].uuid);
            }

            // Save to recent vaults
            saveRecentVault({
                path: path,
                filename: filename,
                lastOpened: Date.now()
            });

            addToast({ title: "Vault unlocked successfully", type: "success" });
        } catch (error: any) {
            console.error("Failed to unlock vault:", error);
            setUnlockError(error.message || "Invalid credentials or corrupted file.");
            throw error;
        } finally {
            setIsUnlocking(false);
        }
    };

    const createVault = async (name: string, password: string, keyFile?: File) => {
        setIsUnlocking(true);
        setUnlockError(null);
        try {
            const keyFileBuffer = keyFile ? await keyFile.arrayBuffer() : undefined;
            const db = createDatabase(name, password, keyFileBuffer);

            let handle: FileSystemFileHandle | undefined;
            let path: string | undefined;
            let saved = false;

            // Try Native Save First
            try {
                const selectedPath = await save({
                    defaultPath: `${name}.kdbx`,
                    filters: [{
                        name: 'KDBX Database',
                        extensions: ['kdbx']
                    }]
                });

                if (selectedPath) {
                    path = selectedPath;
                    const data = await db.save();
                    await writeFile(path, new Uint8Array(data));
                    saved = true;
                }
            } catch (e) {
                console.warn("Native save failed/cancelled, falling back to browser API", e);
            }

            if (!saved) {
                // @ts-ignore 
                if (window.showSaveFilePicker) {
                    try {
                        // @ts-ignore
                        handle = await window.showSaveFilePicker({
                            suggestedName: `${name}.kdbx`,
                            types: [{
                                description: 'KDBX Database',
                                accept: { 'application/x-kdbx': ['.kdbx'] },
                            }],
                        });

                        if (handle) {
                            const writable = await handle.createWritable();
                            const data = await db.save();
                            await writable.write(data);
                            await writable.close();
                            saved = true;
                        }
                    } catch (e) {
                        console.warn("Save cancelled or failed", e);
                    }
                }
            }

            if (!saved && !handle && !path) {
                const data = await db.save();
                const blob = new Blob([data], { type: 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${name}.kdbx`;
                a.click();
                URL.revokeObjectURL(url);
                addToast({ title: "Database created and downloaded", type: "info" });
            } else {
                addToast({ title: "Database created", type: "success" });
            }

            const parsedStructure = parseKdbxStructure(db);
            const newVault: Vault = {
                id: crypto.randomUUID(),
                name: name,
                filename: path ? path.split(/[/\\]/).pop()! : (handle ? handle.name : `${name}.kdbx`),
                db: db,
                groups: parsedStructure,
                fileHandle: handle,
                path: path
            };

            setVaults(prev => [...prev, newVault]);
            setActiveVaultId(newVault.id);
            if (newVault.groups.length > 0) {
                setActiveGroupId(newVault.groups[0].uuid);
            }

        } catch (error: any) {
            setUnlockError(error.message || "Failed to create database");
            throw error;
        } finally {
            setIsUnlocking(false);
        }
    };

    const removeVault = (id: string) => {
        // Check for unsaved if we implemented dirty checking, but for now just remove
        setVaults(prev => prev.filter(v => v.id !== id));
        if (activeVaultId === id) {
            setActiveVaultId(null);
            setActiveGroupId(null);
        }
    };

    const getEntry = useCallback((uuid: string): VaultEntry | undefined => {
        if (!activeVault) return undefined;
        const all = getAllEntries(activeVault.groups);
        return all.find(e => e.uuid === uuid);
    }, [activeVault, getAllEntries]);

    const getActiveGroup = useCallback((): VaultGroup | undefined => {
        if (!activeVault || !activeGroupId) return undefined;

        const findGroupRecursive = (groups: VaultGroup[]): VaultGroup | undefined => {
            for (const group of groups) {
                if (group.uuid === activeGroupId) return group;
                const found = findGroupRecursive(group.subgroups);
                if (found) return found;
            }
            return undefined;
        };

        return findGroupRecursive(activeVault.groups);
    }, [activeVault, activeGroupId]);

    const onRenameGroup = async (groupId: string, newName: string) => {
        return onUpdateGroup(groupId, newName);
    };

    const onUpdateGroup = async (groupId: string, name: string, icon?: number, parentGroupId?: string, allowAdd?: boolean) => {
        if (!activeVault) return;
        try {
            updateGroupInDb(activeVault.db, groupId, name, icon, parentGroupId, allowAdd);
            refreshVault(activeVault.id);
            await saveVault(activeVault.id, true);
            addToast({ title: "Group updated", type: "success" });
        } catch (e: any) {
            console.error(e);
            addToast({ title: e.message || "Failed to update group", type: "error" });
        }
    };

    const onEmptyRecycleBin = async () => {
        if (!activeVault) return;
        const currentGroup = getActiveGroup();
        if (!currentGroup || !currentGroup.isRecycleBin) {
            addToast({ title: "Not in Recycle Bin", type: "error" });
            return;
        }

        const confirmed = await ask(`Permanently delete all ${currentGroup.entries.length} entries from the Recycle Bin? This cannot be undone.`, {
            title: 'Empty Recycle Bin',
            kind: 'warning'
        });

        if (confirmed) {
            try {
                // Delete all entries in the recycle bin
                for (const entry of currentGroup.entries) {
                    deleteEntryFromDb(activeVault.db, entry.uuid);
                }
                refreshVault(activeVault.id);
                await saveVault(activeVault.id, true);
                addToast({ title: "Recycle Bin emptied", type: "success" });
            } catch (e: any) {
                console.error(e);
                addToast({ title: e.message || "Failed to empty Recycle Bin", type: "error" });
            }
        }
    };

    return (
        <VaultContext.Provider value={{
            vaults,
            activeVaultId,
            activeGroupId,
            searchQuery,
            addVault,
            createVault,
            saveVault,
            removeVault,
            setActiveVault: setActiveVaultId,
            setActiveGroup: setActiveGroupId,
            setSearchQuery,
            activeEntries,
            getEntry,
            getActiveGroup,
            refreshVault,
            isUnlocking,
            unlockError,
            clearError: () => setUnlockError(null),
            onAddGroup,
            onRenameGroup,
            onUpdateGroup,
            onDeleteGroup,
            onAddEntry,
            onEditEntry,
            onDeleteEntry,
            onMoveEntry,
            onMoveEntries,
            onRestoreEntry,
            isRecycleBinGroup,
            isEntryInRecycleBin,
            onEmptyRecycleBin,
            lockVault: (id: string) => {
                const vault = vaults.find(v => v.id === id);
                if (vault) {
                    // Emit event to close child windows
                    emit('vault-locked').catch(console.error);

                    // Trigger the unlock modal with current vault info
                    document.dispatchEvent(new CustomEvent('open-unlock-modal', {
                        detail: {
                            path: vault.path,
                            filename: vault.filename,
                            lastOpened: Date.now()
                        }
                    }));
                    // Remove the vault from active state (effectively locking it)
                    removeVault(id);
                }
            }
        }}>
            {children}
        </VaultContext.Provider>
    );
};

export const useVault = () => {
    const context = useContext(VaultContext);
    if (!context) throw new Error("useVault must be used within a VaultProvider");
    return context;
};