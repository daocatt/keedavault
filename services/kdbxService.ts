import kdbxweb from 'kdbxweb';
import * as hashwasmModule from 'hash-wasm';
import { VaultGroup, VaultEntry, EntryFormData } from '../types';

// --- Argon2 Polyfill Setup ---
const getArgon2 = () => {
    // @ts-ignore
    if (typeof hashwasmModule.argon2 === 'function') return hashwasmModule.argon2;
    // @ts-ignore
    if (hashwasmModule.default && typeof hashwasmModule.default.argon2 === 'function') return hashwasmModule.default.argon2;
    // @ts-ignore
    if (window.hashwasm && typeof window.hashwasm.argon2 === 'function') return window.hashwasm.argon2;
    return null;
};

const argon2Impl = getArgon2();

if (!argon2Impl) {
    console.warn("Argon2 implementation not found. KDBX4 files using Argon2 will fail to open.");
} else {
    kdbxweb.CryptoEngine.setArgon2Impl(async (password: any, salt: any, memory: any, iterations: any, length: any, parallelism: any, type: any, version: any) => {
        if (!argon2Impl) throw new Error("Argon2 algorithm is not available.");

        let typeStr: 'Argon2d' | 'Argon2id' | 'Argon2i' = 'Argon2d';
        if (type === 1) typeStr = 'Argon2id';
        if (type === 2) typeStr = 'Argon2i';

        const passwordArr = new Uint8Array(password);
        const saltArr = new Uint8Array(salt);

        try {
            const result = await argon2Impl({
                password: passwordArr,
                salt: saltArr,
                parallelism: Math.round(parallelism),
                iterations: Math.round(iterations),
                memorySize: Math.round(memory),
                hashLength: Math.round(length),
                outputType: 'Binary',
                type: typeStr,
                version: version || 0x13
            });
            return result.slice(0).buffer;
        } catch (e) {
            console.error("Argon2 KDF failed:", e);
            throw new Error("Failed to derive master key using Argon2.");
        }
    });
}

// --- Helper: Robust UUID Comparison ---
const uuidsEqual = (a: any, b: any): boolean => {
    if (!a || !b) return false;

    const idA = a instanceof kdbxweb.KdbxUuid ? a.id : (a.id || a.toString());
    const idB = b instanceof kdbxweb.KdbxUuid ? b.id : (b.id || b.toString());

    return idA === idB;
};

// --- Database Creation ---

export const createDatabase = (name: string, password: string, keyFile?: ArrayBuffer): kdbxweb.Kdbx => {
    const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password), keyFile);
    const db = kdbxweb.Kdbx.create(credentials, name);
    db.header.setKdf(kdbxweb.Consts.KdfId.Aes);

    // Create standard default groups
    const root = db.getDefaultGroup();
    if (root) {
        db.createGroup(root, 'General');
        db.createGroup(root, 'Windows');
        db.createGroup(root, 'Network');
        db.createGroup(root, 'Internet');
        db.createGroup(root, 'eMail');
        db.createGroup(root, 'Homebanking');
    }

    return db;
};

// --- CRUD Operations ---

// Helper: Generate otpauth URL
const generateOtpUrl = (secret: string, label: string, issuer: string = 'KeedaVault'): string | undefined => {
    const clean = secret.replace(/\s/g, '').toUpperCase();
    if (!clean) return undefined;
    // Simple validation for Base32
    if (!/^[A-Z2-7=]+$/.test(clean)) return undefined;
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${clean}&issuer=${encodeURIComponent(issuer)}`;
};

const findGroup = (group: kdbxweb.KdbxGroup, uuid: string): kdbxweb.KdbxGroup | null => {
    if (uuidsEqual(group.uuid, uuid)) return group;

    for (const g of group.groups) {
        const found = findGroup(g, uuid);
        if (found) return found;
    }
    return null;
};

const findEntryParent = (group: kdbxweb.KdbxGroup, entryUuid: string): { group: kdbxweb.KdbxGroup, entry: kdbxweb.KdbxEntry } | null => {
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
        // @ts-ignore - kdbxweb uses iconId property
        newGroup.iconId = icon;
    }
    if (allowAdd !== undefined) {
        // @ts-ignore - customData is available on Group
        newGroup.customData.set('keedavault_allow_add', allowAdd.toString());
    }

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
        // @ts-ignore - kdbxweb uses iconId property
        group.iconId = icon;
    }

    if (allowAdd !== undefined) {
        // @ts-ignore
        group.customData.set('keedavault_allow_add', allowAdd.toString());
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

    if (data.email) {
        entry.fields.set('Email', data.email);
    }

    if (data.totpSecret) {
        const otpUrl = generateOtpUrl(data.totpSecret, data.title);
        if (otpUrl) {
            entry.fields.set('otp', kdbxweb.ProtectedValue.fromString(otpUrl));
        }
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

    entry.fields.set('Title', data.title);
    entry.fields.set('UserName', data.username);
    entry.fields.set('Password', kdbxweb.ProtectedValue.fromString(data.password));
    entry.fields.set('URL', data.url);
    entry.fields.set('Notes', data.notes);

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

    entry.times.update();
    return entry;
}

export const deleteEntryFromDb = (db: kdbxweb.Kdbx, entryUuid: string) => {
    const root = db.getDefaultGroup();
    if (!root) throw new Error("Root group not found");

    const result = findEntryParent(root, entryUuid);
    if (!result) throw new Error("Entry not found");

    const { group, entry } = result;
    const index = group.entries.indexOf(entry);
    if (index > -1) {
        group.entries.splice(index, 1);
    }
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
            // @ts-ignore - kdbxweb uses iconId property
            icon: group.iconId || 0,
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

const parseEntry = (entry: kdbxweb.KdbxEntry): VaultEntry => {
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
        otpUrl: otpUrl
    };
};