import { VaultEntry, VaultGroup } from '../types';
import * as kdbxweb from 'kdbxweb';

/**
 * Flattens the vault groups to get all entries
 */
export const getAllEntriesFromGroups = (groups: VaultGroup[]): VaultEntry[] => {
    let entries: VaultEntry[] = [];
    for (const group of groups) {
        entries = [...entries, ...group.entries];
        if (group.subgroups.length > 0) {
            entries = [...entries, ...getAllEntriesFromGroups(group.subgroups)];
        }
    }
    return entries;
};

/**
 * Converts entries to CSV format
 */
export const entriesToCsv = (entries: VaultEntry[]): string => {
    // Standard columns
    const columns = ['Title', 'Username', 'Password', 'URL', 'Notes', 'OTP'];

    // Create header row
    const header = columns.join(',');

    // Create data rows
    const rows = entries.map(e => {
        return [
            e.title,
            e.username,
            e.password || '',
            e.url,
            e.notes,
            e.otpUrl || ''
        ].map(field => {
            // Escape quotes and wrap in quotes if necessary
            const str = String(field || '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',');
    });

    return [header, ...rows].join('\n');
};

/**
 * Creates a new KDBX database containing only the provided entries
 * Uses the provided credentials for the new database
 */
export const createKdbxFromEntries = async (
    entries: VaultEntry[],
    credentials: kdbxweb.Credentials,
    dbName: string
): Promise<ArrayBuffer> => {
    // Create new DB
    const newDb = kdbxweb.Kdbx.create(credentials, dbName);

    // Create a default group for the exported entries
    const defaultGroup = newDb.createGroup(newDb.getDefaultGroup(), 'Exported Entries');

    for (const entry of entries) {
        const newEntry = newDb.createEntry(defaultGroup);

        // Map fields
        newEntry.fields.set('Title', entry.title);
        newEntry.fields.set('UserName', entry.username);
        newEntry.fields.set('Password', kdbxweb.ProtectedValue.fromString(entry.password || ''));
        newEntry.fields.set('URL', entry.url);
        newEntry.fields.set('Notes', entry.notes);

        // OTP if present
        if (entry.otpUrl) {
            newEntry.fields.set('OTP', kdbxweb.ProtectedValue.fromString(entry.otpUrl));
        }

        // Custom fields
        if (entry.fields) {
            Object.entries(entry.fields).forEach(([key, value]) => {
                if (!['Title', 'UserName', 'Password', 'URL', 'Notes', 'OTP'].includes(key)) {
                    newEntry.fields.set(key, value);
                }
            });
        }

        // Timestamps
        if (entry.creationTime) newEntry.times.creationTime = entry.creationTime;
        if (entry.lastModTime) newEntry.times.lastModTime = entry.lastModTime;
    }

    return await newDb.save();
};
