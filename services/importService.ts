import * as kdbxweb from 'kdbxweb';
import { initializeArgon2 } from './kdbxService';
import { EntryFormData } from '../types';

/**
 * Parses a KDBX file buffer into a list of entry data objects.
 * Flattens the group structure.
 */
export const parseKdbxToEntries = async (arrayBuffer: ArrayBuffer, password: string): Promise<EntryFormData[]> => {
    initializeArgon2();
    const credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password));
    try {
        const db = await kdbxweb.Kdbx.load(arrayBuffer, credentials);
        const entries: EntryFormData[] = [];

        // Recursive function to extract entries
        const extractEntries = (group: kdbxweb.KdbxGroup) => {
            // Process entries in this group
            group.entries.forEach(entry => {
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

                let otpUrl = attributes['otp'] || attributes['TOTP'] || attributes['totp'];
                let totpSecret = '';
                if (otpUrl && otpUrl.startsWith('otpauth://')) {
                    try {
                        const url = new URL(otpUrl);
                        totpSecret = url.searchParams.get('secret') || '';
                    } catch (e) {
                        // ignore invalid url
                    }
                }

                entries.push({
                    groupUuid: '', // Will be assigned by importer
                    title: attributes['Title'] || 'Untitled',
                    username: attributes['UserName'] || '',
                    password: passwordText,
                    url: attributes['URL'] || '',
                    notes: attributes['Notes'] || '',
                    totpSecret: totpSecret,
                    email: attributes['Email'] || '',
                    // We could map other fields to customFields if needed
                });
            });

            // Recurse
            group.groups.forEach(g => extractEntries(g));
        };

        const root = db.getDefaultGroup();
        if (root) {
            extractEntries(root);
        }

        return entries;
    } catch (e) {
        console.error("Failed to parse KDBX:", e);
        throw new Error("Failed to unlock or parse KDBX file. Check password.");
    }
};


/**
 * Parses a CSV string into a list of entry data objects.
 * Assumes a header row and standard columns: Title, Username, Password, URL, Notes, OTP.
 * Handles quoted fields.
 */
export const parseCsvToEntries = (csvContent: string): EntryFormData[] => {
    const lines = parseCsvLines(csvContent);
    if (lines.length < 2) return []; // Need at least header + 1 row

    const header = lines[0].map(h => h.toLowerCase().trim());
    const entries: EntryFormData[] = [];

    // Map column indices
    const colMap: Record<string, number> = {};
    header.forEach((h, i) => {
        if (h.includes('title')) colMap['title'] = i;
        else if (h.includes('user')) colMap['username'] = i;
        else if (h.includes('pass')) colMap['password'] = i;
        else if (h.includes('url') || h.includes('website')) colMap['url'] = i;
        else if (h.includes('note')) colMap['notes'] = i;
        else if (h.includes('otp') || h.includes('totp')) colMap['totp'] = i;
    });

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const entry: EntryFormData = {
            groupUuid: '', // To be filled by caller
            title: getValue(row, colMap['title']) || 'Untitled',
            username: getValue(row, colMap['username']) || '',
            password: getValue(row, colMap['password']) || '',
            url: getValue(row, colMap['url']) || '',
            notes: getValue(row, colMap['notes']) || '',
            totpSecret: getValue(row, colMap['totp']) || '',
            email: '' // Default empty
        };
        entries.push(entry);
    }

    return entries;
};

function getValue(row: string[], index: number | undefined): string {
    if (index === undefined || index < 0 || index >= row.length) return '';
    return row[index];
}

/**
 * Simple CSV parser handling quotes and commas within quotes.
 */
function parseCsvLines(csv: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        const nextChar = csv[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(current);
                current = '';
            } else if (char === '\n' || char === '\r') {
                if (current || row.length > 0) {
                    row.push(current);
                    result.push(row);
                    row = [];
                    current = '';
                }
                // Handle \r\n
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                current += char;
            }
        }
    }

    if (current || row.length > 0) {
        row.push(current);
        result.push(row);
    }

    return result;
}

/**
 * Parses a Bitwarden JSON export string into a list of entry data objects.
 */
export const parseBitwardenJsonToEntries = (jsonContent: string): EntryFormData[] => {
    try {
        const data = JSON.parse(jsonContent);
        if (!data.items || !Array.isArray(data.items)) return [];

        const entries: EntryFormData[] = [];

        data.items.forEach((item: any) => {
            // Type 1 is Login
            if (item.type === 1 && item.login) {
                const login = item.login;
                const uris = login.uris || [];
                const url = uris.length > 0 ? uris[0].uri : '';

                entries.push({
                    groupUuid: '', // To be filled by caller
                    title: item.name || 'Untitled',
                    username: login.username || '',
                    password: login.password || '',
                    url: url || '',
                    notes: item.notes || '',
                    totpSecret: login.totp || '',
                    email: '' // Bitwarden doesn't have a specific email field separate from username usually, but sometimes used in custom fields
                });
            } else if (item.type === 2) {
                // Secure Note
                entries.push({
                    groupUuid: '',
                    title: item.name || 'Untitled Note',
                    username: '',
                    password: '',
                    url: '',
                    notes: item.notes || '',
                    totpSecret: '',
                    email: ''
                });
            }
        });

        return entries;
    } catch (e) {
        console.error("Failed to parse Bitwarden JSON:", e);
        return [];
    }
};

/**
 * Parses a LastPass CSV export string into a list of entry data objects.
 * Typical columns: url,username,password,totp,extra,name,grouping,fav
 */
export const parseLastPassCsvToEntries = (csvContent: string): EntryFormData[] => {
    const lines = parseCsvLines(csvContent);
    if (lines.length < 2) return [];

    const header = lines[0].map(h => h.toLowerCase().trim());
    const entries: EntryFormData[] = [];

    const colMap: Record<string, number> = {};
    header.forEach((h, i) => {
        if (h === 'url') colMap['url'] = i;
        else if (h === 'username') colMap['username'] = i;
        else if (h === 'password') colMap['password'] = i;
        else if (h === 'totp') colMap['totp'] = i;
        else if (h === 'extra') colMap['notes'] = i;
        else if (h === 'name') colMap['title'] = i;
        else if (h === 'grouping') colMap['group'] = i;
    });

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        entries.push({
            groupUuid: '', // To be filled by caller
            title: getValue(row, colMap['title']) || 'Untitled',
            username: getValue(row, colMap['username']) || '',
            password: getValue(row, colMap['password']) || '',
            url: getValue(row, colMap['url']) || '',
            notes: getValue(row, colMap['notes']) || '',
            totpSecret: getValue(row, colMap['totp']) || '',
            email: ''
        });
    }

    return entries;
};

/**
 * Parses an Apple/iCloud CSV export string into a list of entry data objects.
 * Typical columns: Title, URL, Username, Password, Notes, OTPAuth
 */
export const parseAppleCsvToEntries = (csvContent: string): EntryFormData[] => {
    const lines = parseCsvLines(csvContent);
    if (lines.length < 2) return [];

    const header = lines[0].map(h => h.toLowerCase().trim());
    const entries: EntryFormData[] = [];

    const colMap: Record<string, number> = {};
    header.forEach((h, i) => {
        if (h === 'title') colMap['title'] = i;
        else if (h === 'url') colMap['url'] = i;
        else if (h === 'username') colMap['username'] = i;
        else if (h === 'password') colMap['password'] = i;
        else if (h === 'notes') colMap['notes'] = i;
        else if (h === 'otpauth') colMap['otpauth'] = i;
    });

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        let totpSecret = '';
        const otpAuthUrl = getValue(row, colMap['otpauth']);
        if (otpAuthUrl && otpAuthUrl.startsWith('otpauth://')) {
            try {
                const url = new URL(otpAuthUrl);
                totpSecret = url.searchParams.get('secret') || '';
            } catch (e) {
                // ignore
            }
        }

        entries.push({
            groupUuid: '', // To be filled by caller
            title: getValue(row, colMap['title']) || 'Untitled',
            username: getValue(row, colMap['username']) || '',
            password: getValue(row, colMap['password']) || '',
            url: getValue(row, colMap['url']) || '',
            notes: getValue(row, colMap['notes']) || '',
            totpSecret: totpSecret,
            email: ''
        });
    }

    return entries;
};

/**
 * Parses a Chrome CSV export string into a list of entry data objects.
 * Typical columns: name, url, username, password, note
 */
export const parseChromeCsvToEntries = (csvContent: string): EntryFormData[] => {
    const lines = parseCsvLines(csvContent);
    if (lines.length < 2) return [];

    const header = lines[0].map(h => h.toLowerCase().trim());
    const entries: EntryFormData[] = [];

    const colMap: Record<string, number> = {};
    header.forEach((h, i) => {
        if (h === 'name') colMap['title'] = i;
        else if (h === 'url') colMap['url'] = i;
        else if (h === 'username') colMap['username'] = i;
        else if (h === 'password') colMap['password'] = i;
        else if (h === 'note') colMap['notes'] = i;
    });

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        entries.push({
            groupUuid: '', // To be filled by caller
            title: getValue(row, colMap['title']) || 'Untitled',
            username: getValue(row, colMap['username']) || '',
            password: getValue(row, colMap['password']) || '',
            url: getValue(row, colMap['url']) || '',
            notes: getValue(row, colMap['notes']) || '',
            totpSecret: '',
            email: ''
        });
    }

    return entries;
};

/**
 * Parses a Firefox CSV export string into a list of entry data objects.
 * Typical columns: "url","username","password",...
 */
export const parseFirefoxCsvToEntries = (csvContent: string): EntryFormData[] => {
    const lines = parseCsvLines(csvContent);
    if (lines.length < 2) return [];

    const header = lines[0].map(h => h.toLowerCase().trim());
    const entries: EntryFormData[] = [];

    const colMap: Record<string, number> = {};
    header.forEach((h, i) => {
        if (h === 'url') colMap['url'] = i;
        else if (h === 'username') colMap['username'] = i;
        else if (h === 'password') colMap['password'] = i;
    });

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const url = getValue(row, colMap['url']) || '';
        let title = 'Untitled';
        if (url) {
            try {
                const urlObj = new URL(url);
                title = urlObj.hostname;
            } catch (e) {
                title = url;
            }
        }

        entries.push({
            groupUuid: '', // To be filled by caller
            title: title,
            username: getValue(row, colMap['username']) || '',
            password: getValue(row, colMap['password']) || '',
            url: url,
            notes: '',
            totpSecret: '',
            email: ''
        });
    }

    return entries;
};
