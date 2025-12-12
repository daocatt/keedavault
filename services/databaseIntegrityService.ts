import { readFile, writeFile, exists, remove, mkdir } from '@tauri-apps/plugin-fs';
import { appDataDir } from '@tauri-apps/api/path';
import * as kdbxweb from 'kdbxweb';
import { initializeArgon2, isInCloudStorage } from './kdbxService';

/**
 * 数据完整性保护服务
 * 
 * 功能：
 * 1. 写入前自动备份
 * 2. 写入后验证
 * 3. 验证失败自动回滚
 * 4. 完整性检查
 */

export interface SaveOptions {
    /** 是否创建备份 */
    createBackup?: boolean;
    /** 备份保留数量 */
    maxBackups?: number;
    /** 是否验证写入 */
    verifyAfterWrite?: boolean;
    /** 静默模式（不显示 toast） */
    silent?: boolean;
}

export interface SaveResult {
    success: boolean;
    verified: boolean;
    backupPath?: string;
    error?: string;
}

/**
 * Generate a simple hash from file path for backup identification
 * Browser-compatible version (no Buffer dependency)
 */
function hashPath(filePath: string): string {
    // Normalize path
    const normalized = filePath.replace(/\\/g, '/');

    // Simple hash using character codes
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to hex string and take first 16 characters
    return Math.abs(hash).toString(36).substring(0, 16).padEnd(16, '0');
}

/**
 * Get app data directory for backups
 */
async function getAppDataBackupDir(): Promise<string> {
    const appData = await appDataDir();
    // Ensure proper path separator
    const backupDir = appData.endsWith('/') || appData.endsWith('\\')
        ? `${appData}backups`
        : `${appData}/backups`;

    console.log(`[Backup] App data directory: ${appData}`);
    console.log(`[Backup] Backup directory: ${backupDir}`);

    // Ensure directory exists
    try {
        const { exists: dirExists } = await import('@tauri-apps/plugin-fs');
        const exists = await dirExists(backupDir);

        if (!exists) {
            console.log(`[Backup] Creating backup directory: ${backupDir}`);
            await mkdir(backupDir, { recursive: true });
            console.log(`[Backup] Backup directory created successfully`);
        } else {
            console.log(`[Backup] Backup directory already exists`);
        }
    } catch (e) {
        console.error(`[Backup] Error creating backup directory:`, e);
        // Try to create anyway
        try {
            await mkdir(backupDir, { recursive: true });
        } catch (mkdirError) {
            console.error(`[Backup] Failed to create backup directory:`, mkdirError);
            throw new Error(`Cannot create backup directory: ${backupDir}`);
        }
    }

    return backupDir;
}

/**
 * Generate backup file path
 * For cloud storage: use app data directory
 * For local storage: use same directory as database
 */
async function getBackupPath(originalPath: string, timestamp?: number): Promise<string> {
    const ts = timestamp || Date.now();
    const date = new Date(ts);
    const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, -5); // 2025-12-12T10-30-45

    // Check if database is in cloud storage
    if (isInCloudStorage(originalPath)) {
        // Use app data directory for cloud-stored databases
        const backupDir = await getAppDataBackupDir();
        const dbHash = hashPath(originalPath);
        return `${backupDir}/${dbHash}.backup.${dateStr}.kdbx`;
    } else {
        // Use same directory for local databases
        const lastSlash = Math.max(originalPath.lastIndexOf('/'), originalPath.lastIndexOf('\\'));
        const dir = originalPath.substring(0, lastSlash);
        const filename = originalPath.substring(lastSlash + 1);
        const nameWithoutExt = filename.replace('.kdbx', '');

        return `${dir}/${nameWithoutExt}.backup.${dateStr}.kdbx`;
    }
}

/**
 * 获取临时文件路径
 */
function getTempPath(originalPath: string): string {
    return `${originalPath}.tmp`;
}

/**
 * Clean up old backup files
 */
async function cleanupOldBackups(originalPath: string, maxBackups: number = 2): Promise<void> {
    try {
        const { readDir } = await import('@tauri-apps/plugin-fs');

        let dir: string;
        let backupPattern: string;

        // Check if database is in cloud storage
        if (isInCloudStorage(originalPath)) {
            // Use app data directory
            dir = await getAppDataBackupDir();
            const dbHash = hashPath(originalPath);
            backupPattern = `${dbHash}.backup.`;

            console.log(`[Backup Cleanup] Cloud storage detected`);
            console.log(`[Backup Cleanup] Using app data directory: ${dir}`);
        } else {
            // Use same directory as database
            const lastSlash = Math.max(originalPath.lastIndexOf('/'), originalPath.lastIndexOf('\\'));
            dir = originalPath.substring(0, lastSlash);
            const filename = originalPath.substring(lastSlash + 1);
            const nameWithoutExt = filename.replace('.kdbx', '');
            backupPattern = `${nameWithoutExt}.backup.`;

            console.log(`[Backup Cleanup] Local storage detected`);
            console.log(`[Backup Cleanup] Using same directory: ${dir}`);
        }

        console.log(`[Backup Cleanup] Starting cleanup`);
        console.log(`[Backup Cleanup] Max backups: ${maxBackups}`);

        // Read directory
        const entries = await readDir(dir);
        console.log(`[Backup Cleanup] Found ${entries.length} total files in directory`);

        // Filter backup files
        console.log(`[Backup Cleanup] Looking for pattern: ${backupPattern}*.kdbx`);
        const backupFiles: Array<{ path: string; name: string; timestamp: number }> = [];

        for (const entry of entries) {
            if (entry.name && entry.name.startsWith(backupPattern) && entry.name.endsWith('.kdbx')) {
                console.log(`[Backup Cleanup] Found backup file: ${entry.name}`);

                // Extract timestamp
                const timestampStr = entry.name
                    .replace(backupPattern, '')
                    .replace('.kdbx', '');

                console.log(`[Backup Cleanup] Extracted timestamp string: ${timestampStr}`);

                try {
                    // 解析时间戳 (格式: 2025-12-12T18-23-00)
                    // 转换为标准 ISO 格式: 2025-12-12T18:23:00
                    const isoStr = timestampStr
                        .replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})$/, '$1-$2-$3T$4:$5:$6');

                    console.log(`[Backup Cleanup] Converted to ISO: ${isoStr}`);

                    const timestamp = new Date(isoStr).getTime();

                    if (isNaN(timestamp)) {
                        console.warn(`[Backup Cleanup] Invalid timestamp for ${entry.name}: ${timestampStr} -> ${isoStr}`);
                        continue;
                    }

                    console.log(`[Backup Cleanup] Parsed timestamp: ${timestamp} (${new Date(timestamp).toLocaleString()})`);

                    backupFiles.push({
                        path: `${dir}/${entry.name}`,
                        name: entry.name,
                        timestamp: timestamp
                    });
                } catch (e) {
                    console.warn(`[Backup Cleanup] Failed to parse timestamp for ${entry.name}:`, e);
                }
            }
        }

        // 按时间戳排序（最新的在前）
        backupFiles.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`[Backup Cleanup] Found ${backupFiles.length} backup files total`);
        backupFiles.forEach((f, i) => {
            console.log(`[Backup Cleanup]   ${i + 1}. ${f.name} (${new Date(f.timestamp).toLocaleString()})`);
        });

        // 删除超过限制的旧备份
        if (backupFiles.length > maxBackups) {
            const filesToDelete = backupFiles.slice(maxBackups);
            console.log(`[Backup Cleanup] Will delete ${filesToDelete.length} old backups (keeping ${maxBackups})`);

            for (const file of filesToDelete) {
                try {
                    console.log(`[Backup Cleanup] Deleting: ${file.name}`);
                    await remove(file.path);
                    console.log(`[Backup Cleanup] ✅ Deleted: ${file.name}`);
                } catch (e) {
                    console.error(`[Backup Cleanup] ❌ Failed to delete ${file.name}:`, e);
                }
            }
        } else {
            console.log(`[Backup Cleanup] No cleanup needed (${backupFiles.length} <= ${maxBackups})`);
        }
    } catch (e) {
        console.warn('Failed to cleanup old backups:', e);
    }
}

/**
 * 验证 KDBX 文件完整性
 */
async function verifyKdbxFile(
    filePath: string,
    credentials: kdbxweb.Credentials
): Promise<{ valid: boolean; error?: string }> {
    try {
        initializeArgon2();

        // 读取文件
        const data = await readFile(filePath);
        const arrayBuffer = data.buffer as ArrayBuffer;

        // 尝试加载数据库
        const db = await kdbxweb.Kdbx.load(arrayBuffer, credentials);

        // 基本完整性检查
        if (!db) {
            return { valid: false, error: 'Database is null' };
        }

        const root = db.getDefaultGroup();
        if (!root) {
            return { valid: false, error: 'No root group found' };
        }

        // 验证可以访问条目
        try {
            const entries = root.entries;
            console.log(`Verification: Found ${entries.length} entries in root`);
        } catch (e) {
            return { valid: false, error: 'Cannot access entries' };
        }

        return { valid: true };
    } catch (e: any) {
        return {
            valid: false,
            error: e.message || 'Unknown verification error'
        };
    }
}

/**
 * 安全保存 KDBX 数据库
 * 
 * 流程：
 * 1. 创建备份（如果启用）
 * 2. 写入到临时文件
 * 3. 验证临时文件
 * 4. 如果验证通过，替换原文件
 * 5. 如果验证失败，恢复备份
 */
export async function safeSaveDatabase(
    path: string,
    db: kdbxweb.Kdbx,
    options: SaveOptions = {}
): Promise<SaveResult> {
    const {
        createBackup = true,
        maxBackups = 2,
        verifyAfterWrite = true,
        silent = false
    } = options;

    let backupPath: string | undefined;
    const tempPath = getTempPath(path);

    try {
        // 步骤 1: 创建备份（如果原文件存在）
        if (createBackup && await exists(path)) {
            backupPath = await getBackupPath(path);
            console.log(`Creating backup: ${backupPath}`);

            try {
                const originalData = await readFile(path);
                await writeFile(backupPath, originalData);
                console.log('Backup created successfully');

                // 清理旧备份
                await cleanupOldBackups(path, maxBackups);
            } catch (backupError) {
                console.error('Failed to create backup:', backupError);
                // 备份失败不应阻止保存，但应该警告用户
                if (!silent) {
                    console.warn('Proceeding without backup due to error');
                }
            }
        }

        // 步骤 2: 保存到临时文件
        console.log(`Saving to temporary file: ${tempPath}`);
        const data = await db.save();
        await writeFile(tempPath, new Uint8Array(data));
        console.log('Temporary file written');

        // 步骤 3: 验证临时文件（如果启用）
        let verified = false;
        if (verifyAfterWrite) {
            console.log('Verifying written data...');

            if (!db.credentials) {
                throw new Error('Database credentials not available for verification');
            }

            const verification = await verifyKdbxFile(tempPath, db.credentials);

            if (!verification.valid) {
                throw new Error(`Verification failed: ${verification.error}`);
            }

            verified = true;
            console.log('Verification passed');
        }

        // 步骤 4: 替换原文件
        console.log(`Replacing original file: ${path}`);

        // 如果原文件存在，先删除
        if (await exists(path)) {
            await remove(path);
            console.log('Original file removed');
        }

        // 复制临时文件到原文件位置
        const tempData = await readFile(tempPath);
        await writeFile(path, tempData);
        console.log('New file written');

        // 删除临时文件
        await remove(tempPath);
        console.log('Temporary file removed');
        console.log('File replaced successfully');

        return {
            success: true,
            verified,
            backupPath
        };

    } catch (error: any) {
        console.error('Save failed:', error);

        // 步骤 5: 错误处理和回滚
        try {
            // 清理临时文件
            if (await exists(tempPath)) {
                await remove(tempPath);
                console.log('Temporary file cleaned up');
            }

            // 如果有备份且原文件损坏，尝试恢复
            if (backupPath && await exists(backupPath)) {
                const fileExists = await exists(path);

                if (!fileExists) {
                    // 原文件不存在，从备份恢复
                    console.log('Restoring from backup...');
                    const backupData = await readFile(backupPath);
                    await writeFile(path, backupData);
                    console.log('Restored from backup');
                } else {
                    // 原文件存在，验证是否损坏
                    if (db.credentials) {
                        const verification = await verifyKdbxFile(path, db.credentials);
                        if (!verification.valid) {
                            console.log('Original file corrupted, restoring from backup...');
                            const backupData = await readFile(backupPath);
                            await writeFile(path, backupData);
                            console.log('Restored from backup');
                        }
                    }
                }
            }
        } catch (recoveryError) {
            console.error('Recovery failed:', recoveryError);
        }

        return {
            success: false,
            verified: false,
            backupPath,
            error: error.message || 'Unknown error'
        };
    }
}

/**
 * 手动验证数据库文件
 */
export async function verifyDatabaseFile(
    path: string,
    credentials: kdbxweb.Credentials
): Promise<{ valid: boolean; error?: string; details?: any }> {
    try {
        const result = await verifyKdbxFile(path, credentials);

        if (result.valid) {
            // 获取更多详细信息
            const data = await readFile(path);
            const arrayBuffer = data.buffer as ArrayBuffer;
            const db = await kdbxweb.Kdbx.load(arrayBuffer, credentials);

            const root = db.getDefaultGroup();
            let totalEntries = 0;
            let totalGroups = 0;

            const countRecursive = (group: kdbxweb.KdbxGroup) => {
                totalGroups++;
                totalEntries += group.entries.length;
                group.groups.forEach(g => countRecursive(g));
            };

            if (root) {
                countRecursive(root);
            }

            return {
                valid: true,
                details: {
                    totalGroups,
                    totalEntries,
                    databaseName: db.meta.name,
                    lastModified: db.meta.settingsChanged
                }
            };
        }

        return result;
    } catch (e: any) {
        return {
            valid: false,
            error: e.message || 'Verification failed'
        };
    }
}

/**
 * 恢复备份文件
 */
export async function restoreFromBackup(
    originalPath: string,
    backupPath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!await exists(backupPath)) {
            return {
                success: false,
                error: 'Backup file not found'
            };
        }

        const backupData = await readFile(backupPath);
        await writeFile(originalPath, backupData);

        return { success: true };
    } catch (e: any) {
        return {
            success: false,
            error: e.message || 'Restore failed'
        };
    }
}

/**
 * 列出可用的备份文件
 */
export async function listBackups(originalPath: string): Promise<string[]> {
    try {
        const { readDir } = await import('@tauri-apps/plugin-fs');

        const lastSlash = Math.max(originalPath.lastIndexOf('/'), originalPath.lastIndexOf('\\'));
        const dir = originalPath.substring(0, lastSlash);
        const filename = originalPath.substring(lastSlash + 1);
        const nameWithoutExt = filename.replace('.kdbx', '');

        // 读取目录
        const entries = await readDir(dir);

        // 筛选出备份文件
        const backupPattern = `${nameWithoutExt}.backup.`;
        const backupFiles: Array<{ path: string; timestamp: number }> = [];

        for (const entry of entries) {
            if (entry.name && entry.name.startsWith(backupPattern) && entry.name.endsWith('.kdbx')) {
                const timestampStr = entry.name
                    .replace(backupPattern, '')
                    .replace('.kdbx', '');

                try {
                    // 解析时间戳 (格式: 2025-12-12T18-23-00)
                    const isoStr = timestampStr
                        .replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})$/, '$1-$2-$3T$4:$5:$6');

                    const timestamp = new Date(isoStr).getTime();

                    if (isNaN(timestamp)) {
                        console.warn(`Invalid timestamp for ${entry.name}`);
                        continue;
                    }

                    backupFiles.push({
                        path: `${dir}/${entry.name}`,
                        timestamp: timestamp
                    });
                } catch (e) {
                    console.warn(`Failed to parse timestamp for ${entry.name}:`, e);
                }
            }
        }

        // 按时间戳排序（最新的在前）
        backupFiles.sort((a, b) => b.timestamp - a.timestamp);

        return backupFiles.map(f => f.path);
    } catch (e) {
        console.error('Failed to list backups:', e);
        return [];
    }
}
