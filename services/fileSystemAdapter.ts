/**
 * File System Adapter
 * Provides a unified interface for file operations across browser and Tauri environments
 */

import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';

export interface FileHandle {
    name: string;
    path?: string; // Tauri path
    webHandle?: FileSystemFileHandle; // Browser handle
}

export interface FileContent {
    data: ArrayBuffer;
    name: string;
}

class FileSystemAdapter {
    private isTauri: boolean;

    constructor() {
        // @ts-ignore
        this.isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
    }

    /**
     * Check if running in Tauri environment
     */
    public isTauriEnvironment(): boolean {
        return this.isTauri;
    }

    /**
     * Open a file picker and return file handle
     */
    public async openFile(filters?: { name: string; extensions: string[] }[]): Promise<FileHandle | null> {
        if (this.isTauri) {
            try {
                const selected = await open({
                    multiple: false,
                    filters: filters || [
                        { name: 'KDBX Database', extensions: ['kdbx', 'kdb'] }
                    ]
                });

                if (!selected || Array.isArray(selected)) {
                    return null;
                }

                return {
                    name: selected.split('/').pop() || selected.split('\\').pop() || 'unknown',
                    path: selected
                };
            } catch (err) {
                console.error('Tauri file open failed:', err);
                return null;
            }
        } else {
            // Browser environment
            // @ts-ignore
            if (typeof window.showOpenFilePicker === 'function') {
                try {
                    // @ts-ignore
                    const [handle] = await window.showOpenFilePicker({
                        types: [{
                            description: 'KDBX Database',
                            accept: { 'application/x-kdbx': ['.kdbx', '.kdb'] }
                        }],
                        multiple: false
                    });

                    return {
                        name: handle.name,
                        webHandle: handle
                    };
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        return null;
                    }
                    console.error('Browser file picker failed:', err);
                    throw err;
                }
            } else {
                // Fallback for older browsers
                throw new Error('File picker not supported in this browser');
            }
        }
    }

    /**
     * Read file content from handle
     */
    public async readFile(handle: FileHandle): Promise<ArrayBuffer> {
        if (this.isTauri && handle.path) {
            try {
                const contents = await readFile(handle.path);
                return contents.buffer as ArrayBuffer;
            } catch (err) {
                console.error('Tauri file read failed:', err);
                throw new Error('Failed to read file');
            }
        } else if (handle.webHandle) {
            try {
                const file = await handle.webHandle.getFile();
                return await file.arrayBuffer();
            } catch (err) {
                console.error('Browser file read failed:', err);
                throw new Error('Failed to read file');
            }
        } else {
            throw new Error('Invalid file handle');
        }
    }

    /**
     * Write file content to handle
     */
    public async writeFile(handle: FileHandle, data: ArrayBuffer): Promise<void> {
        if (this.isTauri && handle.path) {
            try {
                await writeFile(handle.path, new Uint8Array(data));
            } catch (err) {
                console.error('Tauri file write failed:', err);
                throw new Error('Failed to write file');
            }
        } else if (handle.webHandle) {
            try {
                // @ts-ignore
                const writable = await handle.webHandle.createWritable();
                await writable.write(data);
                await writable.close();
            } catch (err) {
                console.error('Browser file write failed:', err);
                throw new Error('Failed to write file');
            }
        } else {
            throw new Error('Invalid file handle');
        }
    }

    /**
     * Save file dialog
     */
    public async saveFileAs(defaultName: string, data: ArrayBuffer): Promise<FileHandle | null> {
        if (this.isTauri) {
            try {
                const selected = await save({
                    defaultPath: defaultName,
                    filters: [
                        { name: 'KDBX Database', extensions: ['kdbx'] }
                    ]
                });

                if (!selected) {
                    return null;
                }

                await writeFile(selected, new Uint8Array(data));

                return {
                    name: selected.split('/').pop() || selected.split('\\').pop() || defaultName,
                    path: selected
                };
            } catch (err) {
                console.error('Tauri save failed:', err);
                throw new Error('Failed to save file');
            }
        } else {
            // Browser environment
            // @ts-ignore
            if (typeof window.showSaveFilePicker === 'function') {
                try {
                    // @ts-ignore
                    const handle = await window.showSaveFilePicker({
                        suggestedName: defaultName,
                        types: [{
                            description: 'KDBX Database',
                            accept: { 'application/x-kdbx': ['.kdbx'] }
                        }]
                    });

                    // @ts-ignore
                    const writable = await handle.createWritable();
                    await writable.write(data);
                    await writable.close();

                    return {
                        name: handle.name,
                        webHandle: handle
                    };
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        return null;
                    }
                    console.error('Browser save picker failed:', err);
                    throw err;
                }
            } else {
                // Fallback: download file
                const blob = new Blob([data], { type: 'application/x-kdbx' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = defaultName;
                a.click();
                URL.revokeObjectURL(url);

                return {
                    name: defaultName
                };
            }
        }
    }

    /**
     * Read file from File object (for fallback input)
     */
    public async readFileFromInput(file: File): Promise<FileContent> {
        const data = await file.arrayBuffer();
        return {
            data,
            name: file.name
        };
    }
}

// Export singleton instance
export const fileSystem = new FileSystemAdapter();
