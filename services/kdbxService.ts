import * as kdbxweb from 'kdbxweb';
import { argon2d, argon2i, argon2id } from 'hash-wasm';
import { VaultGroup, VaultEntry, EntryFormData } from '../types';

// --- Argon2 Polyfill Setup ---
let argon2Initialized = false;

export const initializeArgon2 = () => {
    if (argon2Initialized || !kdbxweb?.CryptoEngine) return;

    kdbxweb.CryptoEngine.setArgon2Impl(async (password: any, salt: any, memory: any, iterations: any, length: any, parallelism: any, type: any, version: any) => {
        const passwordArr = new Uint8Array(password);
        const saltArr = new Uint8Array(salt);

        const params = {
            password: passwordArr,
            salt: saltArr,
            parallelism: Math.round(parallelism),
            iterations: Math.round(iterations),
            memorySize: Math.round(memory),
            hashLength: Math.round(length),
            outputType: 'binary' as const,
            version: version || 0x13
        };

        try {
            let result: Uint8Array;
            if (type === 1) {
                result = await argon2id(params);
            } else if (type === 2) {
                result = await argon2i(params);
            } else {
                result = await argon2d(params);
            }
            return result.slice(0).buffer;
        } catch (e) {
            console.error("Argon2 KDF failed:", e);
            throw new Error("Failed to derive master key using Argon2.");
        }
    });

    argon2Initialized = true;
};

// --- Helper: Robust UUID Comparison ---
const uuidsEqual = (a: any, b: any): boolean => {
    if (!a || !b) return false;

    const idA = a instanceof kdbxweb.KdbxUuid ? a.id : (a.id || a.toString());
    const idB = b instanceof kdbxweb.KdbxUuid ? b.id : (b.id || b.toString());

    return idA === idB;
};

// --- Database Creation ---

export const createDatabase = (name: string, password: string, keyFile?: ArrayBuffer): kdbxweb.Kdbx => {
    initializeArgon2();
    const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password), keyFile);
    const db = kdbxweb.Kdbx.create(credentials, name);
    db.header.setKdf(kdbxweb.Consts.KdfId.Argon2);
    // @ts-ignore
    db.header.cipherUuid = kdbxweb.Consts.CipherId.ChaCha20;

    // Create standard default groups
    const root = db.getDefaultGroup();
    if (root) {
        const g1 = db.createGroup(root, 'General');
        g1.enableSearching = true;
        const g2 = db.createGroup(root, 'Windows');
        g2.enableSearching = true;
        const g3 = db.createGroup(root, 'Network');
        g3.enableSearching = true;
        const g4 = db.createGroup(root, 'Internet');
        g4.enableSearching = true;
        const g5 = db.createGroup(root, 'eMail');
        g5.enableSearching = true;
        const g6 = db.createGroup(root, 'Homebanking');
        g6.enableSearching = true;
    }

    return db;
};

// --- CRUD Operations ---

/**
 * Detect if a file path is in cloud storage
 * Cloud storage includes: iCloud Drive, Dropbox, Google Drive, OneDrive
 */
export const isInCloudStorage = (filePath: string): boolean => {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Cloud storage path patterns
    const cloudPatterns = [
        // macOS
        '/Library/Mobile Documents/com~apple~CloudDocs',  // iCloud Drive
        '/Dropbox/',
        '/Google Drive/',
        '/OneDrive/',

        // Windows
        '/OneDrive/',
        '/Dropbox/',
        '/Google Drive/',

        // Linux
        '/Dropbox/',
        '/gdrive/',
    ];

    return cloudPatterns.some(pattern => normalizedPath.includes(pattern));
};

// Helper: Generate otpauth URL
const generateOtpUrl = (secret: string, label: string, issuer: string = 'KeedaVault'): string | undefined => {
    const clean = secret.replace(/\s/g, '').toUpperCase();
    if (!clean) return undefined;
    // Simple validation for Base32
    if (!/^[A-Z2-7=]+$/.test(clean)) return undefined;
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${clean}&issuer=${encodeURIComponent(issuer)}`;
};

/**
 * Fix AutoType fields for KeePassXC compatibility
 * KeePassXC requires explicit boolean value for AutoType.enabled
 * This function ensures all entries have valid AutoType settings
 */
const fixAutoTypeFields = (group: kdbxweb.KdbxGroup): void => {
    // Fix entries in current group
    for (const entry of group.entries) {
        if (!entry.autoType || entry.autoType.enabled === null || entry.autoType.enabled === undefined) {
            entry.autoType = {
                enabled: true,
                obfuscation: 0,
                items: []
            };
        }
    }

    // Recursively fix entries in subgroups
    for (const subgroup of group.groups) {
        fixAutoTypeFields(subgroup);
    }
};

/**
 * Apply compatibility fixes to database after loading
 * This ensures the database can be saved in a format compatible with KeePassXC
 */
export const applyCompatibilityFixes = (db: kdbxweb.Kdbx): void => {
    const root = db.getDefaultGroup();
    if (root) {
        fixAutoTypeFields(root);
    }
};

export const findGroup = (group: kdbxweb.KdbxGroup, uuid: string): kdbxweb.KdbxGroup | null => {
    if (uuidsEqual(group.uuid, uuid)) return group;

    for (const g of group.groups) {
        const found = findGroup(g, uuid);
        if (found) return found;
    }
    return null;
};

export const findEntryParent = (group: kdbxweb.KdbxGroup, entryUuid: string): { group: kdbxweb.KdbxGroup, entry: kdbxweb.KdbxEntry } | null => {
    for (const entry of group.entries) {
        if (uuidsEqual(entry.uuid, entryUuid)) {
            return { group, entry };
        }
    }
    for (const g of group.groups) {
        const found = findEntryParent(g, entryUuid);
        if (found) return found;
    }
    return null;
};

export const addGroupToDb = (db: kdbxweb.Kdbx, parentGroupUuid: string, name: string, icon?: number, allowAdd?: boolean) => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const parent = findGroup(root, parentGroupUuid);
    if (!parent) {
        console.error("Parent group not found in DB structure", root);
        throw new Error("Parent group not found");
    }

    const newGroup = db.createGroup(parent, name);
    if (icon !== undefined) {
        // @ts-ignore - kdbxweb icon property
        newGroup.icon = icon;
    }
    if (allowAdd !== undefined) {
        // @ts-ignore - customData may need initialization
        if (!newGroup.customData) {
            newGroup.customData = new Map();
        }
        // kdbxweb expects a KdbxCustomDataItem object
        newGroup.customData.set('keedavault_allow_add', { value: allowAdd.toString() });
    }

    newGroup.times.update();
    return newGroup;
};

export const renameGroupInDb = (db: kdbxweb.Kdbx, groupUuid: string, newName: string) => {
    updateGroupInDb(db, groupUuid, newName);
};

export const updateGroupInDb = (db: kdbxweb.Kdbx, groupUuid: string, newName: string, icon?: number, parentGroupUuid?: string, allowAdd?: boolean) => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const group = findGroup(root, groupUuid);
    if (!group) throw new Error("Group not found");

    group.name = newName;
    if (icon !== undefined) {
        // @ts-ignore - kdbxweb icon property
        group.icon = icon;
    }

    if (allowAdd !== undefined) {
        // @ts-ignore - customData may need initialization
        if (!group.customData) {
            group.customData = new Map();
        }
        // kdbxweb expects a KdbxCustomDataItem object
        group.customData.set('keedavault_allow_add', { value: allowAdd.toString() });
    }

    // Handle Move
    if (parentGroupUuid) {
        // Find current parent
        const currentParent = findParentGroup(root, groupUuid);
        if (currentParent && !uuidsEqual(currentParent.uuid, parentGroupUuid)) {
            const newParent = findGroup(root, parentGroupUuid);
            if (newParent) {
                // Check for circular dependency (cannot move to self or child)
                if (uuidsEqual(newParent.uuid, group.uuid) || isChildOf(newParent, group)) {
                    throw new Error("Cannot move group into itself or its children");
                }

                const index = currentParent.groups.indexOf(group);
                if (index > -1) currentParent.groups.splice(index, 1);
                newParent.groups.push(group);
            }
        }
    }

    group.times.update();
};

const findParentGroup = (current: kdbxweb.KdbxGroup, targetUuid: string): kdbxweb.KdbxGroup | null => {
    for (const g of current.groups) {
        if (uuidsEqual(g.uuid, targetUuid)) return current;
        const found = findParentGroup(g, targetUuid);
        if (found) return found;
    }
    return null;
};

const isChildOf = (potentialChild: kdbxweb.KdbxGroup, parent: kdbxweb.KdbxGroup): boolean => {
    for (const g of parent.groups) {
        if (uuidsEqual(g.uuid, potentialChild.uuid)) return true;
        if (isChildOf(potentialChild, g)) return true;
    }
    return false;
};

export const deleteGroupFromDb = (db: kdbxweb.Kdbx, groupUuid: string) => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    if (uuidsEqual(root.uuid, groupUuid)) throw new Error("Cannot delete root group");

    const findParent = (current: kdbxweb.KdbxGroup): kdbxweb.KdbxGroup | null => {
        for (const g of current.groups) {
            if (uuidsEqual(g.uuid, groupUuid)) return current;
            const found = findParent(g);
            if (found) return found;
        }
        return null;
    };

    const parent = findParent(root);
    if (!parent) throw new Error("Group not found");

    const groupToDelete = parent.groups.find((g: any) => uuidsEqual(g.uuid, groupUuid));
    if (groupToDelete) {
        const index = parent.groups.indexOf(groupToDelete);
        if (index > -1) parent.groups.splice(index, 1);
    }
};

export const addEntryToDb = (db: kdbxweb.Kdbx, groupUuid: string, data: EntryFormData) => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const group = findGroup(root, groupUuid);
    if (!group) throw new Error("Target group not found");

    const entry = db.createEntry(group);
    entry.fields.set('Title', data.title);
    entry.fields.set('UserName', data.username);
    entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(data.password));
    entry.fields.set('URL', data.url);
    entry.fields.set('Notes', data.notes);
    if (data.icon !== undefined) {
        entry.icon = data.icon;
    }

    // Set AutoType to ensure KeePassXC compatibility
    // KeePassXC requires explicit boolean value for enabled field
    entry.autoType = {
        enabled: true,
        obfuscation: 0,
        items: []
    };

    if (data.email) {
        entry.fields.set('Email', data.email);
    }

    if (data.totpSecret) {
        const otpUrl = generateOtpUrl(data.totpSecret, data.title);
        if (otpUrl) {
            entry.fields.set('otp', kdbxweb.ProtectedValue.fromString(otpUrl));
        }
    }

    if (data.expiryTime) {
        entry.times.expiryTime = data.expiryTime;
        entry.times.expires = true;
    } else {
        entry.times.expires = false;
    }

    // Handle Custom Fields
    if (data.customFields) {
        Object.entries(data.customFields).forEach(([key, value]) => {
            if (key && value) {
                entry.fields.set(key, value);
            }
        });
    }

    // Handle Attachments
    if (data.attachments) {
        data.attachments.forEach(att => {
            entry.binaries.set(att.name, kdbxweb.ProtectedValue.fromBinary(att.data));
        });
    }

    entry.times.update();
    return entry;
};

export const updateEntryInDb = (db: kdbxweb.Kdbx, data: EntryFormData) => {
    if (!data.uuid) throw new Error("Entry UUID required for update");
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const result = findEntryParent(root, data.uuid);
    if (!result) throw new Error("Entry not found");
    const { group, entry } = result;

    // Move group if needed
    if (!uuidsEqual(group.uuid, data.groupUuid)) {
        const newGroup = findGroup(root, data.groupUuid);
        if (newGroup) {
            const index = group.entries.indexOf(entry);
            if (index > -1) group.entries.splice(index, 1);
            newGroup.entries.push(entry);
        }
    }

    // Save current state to history before modification
    entry.pushHistory();

    entry.fields.set('Title', data.title);
    entry.fields.set('UserName', data.username);
    entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(data.password));
    entry.fields.set('URL', data.url);
    entry.fields.set('Notes', data.notes);
    if (data.icon !== undefined) {
        entry.icon = data.icon;
    }

    if (data.email) {
        entry.fields.set('Email', data.email);
    } else {
        entry.fields.set('Email', '');
    }

    if (data.totpSecret) {
        const otpUrl = generateOtpUrl(data.totpSecret, data.title);
        if (otpUrl) {
            entry.fields.set('otp', kdbxweb.ProtectedValue.fromString(otpUrl));
        }
    }

    if (data.expiryTime) {
        entry.times.expiryTime = data.expiryTime;
        entry.times.expires = true;
    } else {
        entry.times.expires = false;
    }

    // Handle Custom Fields
    // First, remove any existing custom fields that are not in the new data
    // We protect standard fields from being removed here
    const standardFields = ['Title', 'UserName', 'Password', 'URL', 'Notes', 'otp', 'Email'];
    const currentKeys = Array.from(entry.fields.keys());

    currentKeys.forEach(key => {
        if (!standardFields.includes(key)) {
            // If it's not a standard field, check if it exists in the new customFields
            // If data.customFields is undefined or the key is missing, remove it
            if (!data.customFields || !Object.prototype.hasOwnProperty.call(data.customFields, key)) {
                entry.fields.delete(key);
            }
        }
    });

    // Now set/update all provided custom fields
    if (data.customFields) {
        Object.entries(data.customFields).forEach(([key, value]) => {
            if (key && value) {
                entry.fields.set(key, value);
            }
        });
    }

    // Handle Attachments
    if (data.attachments) {
        entry.binaries.clear();
        data.attachments.forEach(att => {
            entry.binaries.set(att.name, kdbxweb.ProtectedValue.fromBinary(att.data));
        });
    }

    entry.times.update();
    return entry;
}

export const deleteEntryFromDb = (db: kdbxweb.Kdbx, entryUuid: string) => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const result = findEntryParent(root, entryUuid);
    if (!result) throw new Error("Entry not found");

    const { group, entry } = result;

    // Check if the entry is already in the Recycle Bin
    const recycleBinUuid = db.meta.recycleBinEnabled ? db.meta.recycleBinUuid : null;
    const isInRecycleBin = recycleBinUuid && uuidsEqual(group.uuid, recycleBinUuid);

    if (isInRecycleBin) {
        // Permanently delete if already in Recycle Bin
        const index = group.entries.indexOf(entry);
        if (index > -1) {
            group.entries.splice(index, 1);
        }
    } else {
        // Move to Recycle Bin
        let recycleBin: kdbxweb.KdbxGroup | null = null;

        if (recycleBinUuid) {
            recycleBin = findGroup(root, recycleBinUuid.id);
        }

        // Create Recycle Bin if it doesn't exist
        if (!recycleBin) {
            db.createRecycleBin();
            // After creating, retrieve it from metadata
            if (db.meta.recycleBinUuid) {
                recycleBin = findGroup(root, db.meta.recycleBinUuid.id);
            }
        }

        if (recycleBin) {
            // Save original group UUID
            entry.fields.set('KeedaVault_OriginalGroup', group.uuid.id);

            // Remove from current group
            const index = group.entries.indexOf(entry);
            if (index > -1) {
                group.entries.splice(index, 1);
            }

            // Add to Recycle Bin
            recycleBin.entries.push(entry);
            entry.times.update();
        }
    }
};

export const restoreEntryFromRecycleBin = (db: kdbxweb.Kdbx, entryUuid: string): { groupName: string, groupIcon: number } => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const result = findEntryParent(root, entryUuid);
    if (!result) throw new Error("Entry not found");
    const { group: currentGroup, entry } = result;

    const originalGroupId = entry.fields.get('KeedaVault_OriginalGroup');
    let targetGroup: kdbxweb.KdbxGroup | null = null;

    if (originalGroupId && typeof originalGroupId === 'string') {
        targetGroup = findGroup(root, originalGroupId);
    }

    // Fallback to root if original group not found
    if (!targetGroup) {
        targetGroup = root;
    }

    // Move entry
    const index = currentGroup.entries.indexOf(entry);
    if (index > -1) {
        currentGroup.entries.splice(index, 1);
    }
    targetGroup.entries.push(entry);

    // Clean up custom field
    if (entry.fields.has('KeedaVault_OriginalGroup')) {
        entry.fields.delete('KeedaVault_OriginalGroup');
    }

    entry.times.update();

    return { groupName: targetGroup.name || 'Root', groupIcon: targetGroup.icon || 48 };
};

export const getOriginalGroupInfo = (db: kdbxweb.Kdbx, entryUuid: string): { name: string, icon: number } | null => {
    const root = db.getDefaultGroup();
    if (!root) return null;

    const result = findEntryParent(root, entryUuid);
    if (!result) return null;
    const { entry } = result;

    const originalGroupId = entry.fields.get('KeedaVault_OriginalGroup');
    if (originalGroupId && typeof originalGroupId === 'string') {
        const group = findGroup(root, originalGroupId);
        if (group) {
            return { name: group.name || 'Root', icon: group.icon || 48 };
        }
    }
    // Default to root if not found but we want to show something? 
    // Or return null to imply "Unknown" or "Root"
    return { name: root.name || 'Root', icon: root.icon || 48 };
};

export const moveEntryInDb = (db: kdbxweb.Kdbx, entryUuid: string, targetGroupUuid: string) => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const result = findEntryParent(root, entryUuid);
    if (!result) throw new Error("Entry not found");
    const { group: currentGroup, entry } = result;

    // If already in target group, do nothing
    if (uuidsEqual(currentGroup.uuid, targetGroupUuid)) return;

    const targetGroup = findGroup(root, targetGroupUuid);
    if (!targetGroup) throw new Error("Target group not found");

    // Remove from current
    const index = currentGroup.entries.indexOf(entry);
    if (index > -1) {
        currentGroup.entries.splice(index, 1);
    }

    // Add to target
    targetGroup.entries.push(entry);
    entry.times.update();
};

// --- Parsing ---

export const parseKdbxStructure = (db: kdbxweb.Kdbx): VaultGroup[] => {
    const root = db.getDefaultGroup();
    if (!root) return [];

    // Identify Recycle Bin
    const recycleBinUuid = db.meta.recycleBinEnabled ? db.meta.recycleBinUuid : null;

    const parseGroup = (group: kdbxweb.KdbxGroup): VaultGroup => {
        const isRecycleBin = recycleBinUuid ? uuidsEqual(group.uuid, recycleBinUuid) : false;

        return {
            uuid: group.uuid.id,
            name: group.name || 'Unnamed Group',
            // @ts-ignore - kdbxweb icon property
            icon: group.icon || 0,
            entries: group.entries.map((entry: any) => parseEntry(entry)),
            // Recursively parse subgroups, THEN sort them to put Recycle Bin last
            subgroups: group.groups
                .map((g: any) => parseGroup(g))
                .sort((a: any, b: any) => {
                    if (a.isRecycleBin) return 1; // Move Recycle Bin to end
                    if (b.isRecycleBin) return -1;
                    return 0;
                }),
            isRecycleBin
        };
    };

    return [parseGroup(root)];
};

const parseEntry = (entry: kdbxweb.KdbxEntry, includeHistory: boolean = true): VaultEntry => {
    const fields = entry.fields;
    const attributes: Record<string, string> = {};

    fields.forEach((value: any, key: any) => {
        if (value instanceof kdbxweb.ProtectedValue) {
            attributes[key] = value.getText();
        } else if (typeof value === 'string') {
            attributes[key] = value;
        }
    });

    const passwordVal = fields.get('Password');
    let passwordText = '';
    if (passwordVal instanceof kdbxweb.ProtectedValue) {
        passwordText = passwordVal.getText();
    } else if (typeof passwordVal === 'string') {
        passwordText = passwordVal;
    }

    let otpUrl = attributes['otp'] || attributes['TOTP'] || attributes['totp'] || attributes['TOTP Settings'];
    if (!otpUrl && attributes['otpauth']) otpUrl = attributes['otpauth'];

    if (otpUrl && !otpUrl.startsWith('otpauth://')) {
        const cleanSecret = otpUrl.replace(/\s/g, '');
        if (cleanSecret.length > 0) {
            const label = encodeURIComponent(attributes['Title'] || 'Account');
            const issuer = encodeURIComponent('KeedaVault');
            otpUrl = `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${issuer}`;
        }
    }

    const attachments: { name: string; data: ArrayBuffer }[] = [];
    if (entry.binaries) {
        entry.binaries.forEach((val: any, key: any) => {
            let data: ArrayBuffer;
            if (val instanceof kdbxweb.ProtectedValue) {
                const binary = val.getBinary();
                data = binary.buffer as ArrayBuffer;
            } else {
                data = val;
            }
            attachments.push({ name: key, data });
        });
    }

    const history: VaultEntry[] = [];
    if (includeHistory && entry.history) {
        entry.history.forEach((histEntry: kdbxweb.KdbxEntry) => {
            history.push(parseEntry(histEntry, false));
        });
    }

    return {
        uuid: entry.uuid.id,
        title: attributes['Title'] || 'Untitled',
        username: attributes['UserName'] || '',
        password: passwordText,
        url: attributes['URL'] || '',
        notes: attributes['Notes'] || '',
        icon: entry.icon || 0,
        fields: attributes,
        tags: entry.tags,
        creationTime: entry.times.creationTime as Date,
        lastModTime: entry.times.lastModTime as Date,
        otpUrl: otpUrl,
        expiryTime: entry.times.expires ? (entry.times.expiryTime as Date) : undefined,
        attachments,
        history
    };
};