# 快速修复：禁用验证功能

如果你遇到 "Failed to save vault" 错误，可以临时禁用验证功能：

## 方法 1：完全禁用完整性保护（最简单）

编辑 `context/VaultContext.tsx`，找到 `saveVault` 函数（约第 190 行），将其替换为：

```typescript
const saveVault = async (id: string, isAutoSave = false) => {
    const vault = vaults.find(v => v.id === id);
    if (!vault) return;

    try {
        // Only block UI for manual saves
        if (!isAutoSave) setIsUnlocking(true);

        const data = await vault.db.save();

        if (vault.path) {
            // 简单保存（临时禁用完整性保护）
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
```

## 方法 2：只禁用验证，保留备份

编辑 `context/VaultContext.tsx`，找到 `safeSaveDatabase` 调用（约第 203 行），修改为：

```typescript
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    maxBackups: 5,
    verifyAfterWrite: false,  // ⚠️ 禁用验证
    silent: isAutoSave
});
```

## 方法 3：添加详细日志

在 `safeSaveDatabase` 调用前后添加日志：

```typescript
console.log('=== SAVE START ===');
console.log('Vault path:', vault.path);
console.log('Has credentials:', !!vault.db.credentials);
console.log('Database name:', vault.name);

const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    maxBackups: 5,
    verifyAfterWrite: true,
    silent: isAutoSave
});

console.log('=== SAVE RESULT ===');
console.log('Success:', result.success);
console.log('Verified:', result.verified);
console.log('Backup:', result.backupPath);
console.log('Error:', result.error);
```

## 测试步骤

1. 应用上述修改之一
2. 重启开发服务器：`npm run dev`
3. 打开应用并尝试保存
4. 查看浏览器控制台的输出

## 如果仍然失败

请提供以下信息：

1. 浏览器控制台的完整错误信息
2. 数据库文件路径
3. 操作系统版本
4. 是否使用密钥文件

然后我们可以进一步诊断问题。
