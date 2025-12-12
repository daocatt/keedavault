# 数据库完整性保护 - 故障排查指南

## 🔍 常见错误及解决方案

### 错误 1: "Failed to save vault"

**可能原因：**

1. **文件权限问题**
   ```bash
   # 检查文件权限
   ls -la /path/to/vault.kdbx
   
   # 如果需要，修改权限
   chmod 644 /path/to/vault.kdbx
   ```

2. **磁盘空间不足**
   ```bash
   # 检查磁盘空间
   df -h
   ```

3. **文件被其他程序占用**
   - 关闭其他可能打开该文件的程序
   - 重启应用

4. **路径包含特殊字符**
   - 确保路径不包含特殊字符
   - 使用英文路径

### 错误 2: "Verification failed"

**可能原因：**

1. **凭证不可用**
   - 检查 `db.credentials` 是否存在
   - 确保密码正确保存在内存中

2. **Argon2 未初始化**
   - 确保在验证前调用了 `initializeArgon2()`

3. **文件损坏**
   - 尝试从备份恢复

### 错误 3: "Database credentials not available for verification"

**解决方案：**

确保在加载数据库时设置凭证：

```typescript
// 在 VaultContext.tsx 的 addVault 函数中
const db = await kdbxweb.Kdbx.load(arrayBuffer, credentials);
db.credentials = credentials;  // ✅ 确保设置凭证
```

## 🛠️ 调试步骤

### 步骤 1: 检查控制台日志

打开浏览器开发者工具（F12），查看控制台输出：

```
Creating backup: /path/to/vault.backup.2025-12-12T18-00-00.kdbx
Backup created successfully
Saving to temporary file: /path/to/vault.kdbx.tmp
Temporary file written
Verifying written data...
Verification: Found X entries in root
Verification passed
Replacing original file: /path/to/vault.kdbx
Original file removed
New file written
Temporary file removed
File replaced successfully
```

### 步骤 2: 禁用验证测试

临时禁用验证以确定问题所在：

```typescript
// 在 VaultContext.tsx 中
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    maxBackups: 5,
    verifyAfterWrite: false,  // ⚠️ 临时禁用验证
    silent: isAutoSave
});
```

如果禁用验证后可以保存，说明问题在验证环节。

### 步骤 3: 检查文件系统权限

```typescript
// 添加调试代码
console.log('Vault path:', vault.path);
console.log('Has credentials:', !!vault.db.credentials);

try {
    const testExists = await exists(vault.path);
    console.log('File exists:', testExists);
} catch (e) {
    console.error('Cannot check file existence:', e);
}
```

### 步骤 4: 手动测试保存

```typescript
// 在浏览器控制台中运行
import { writeFile } from '@tauri-apps/plugin-fs';

const testData = new Uint8Array([1, 2, 3, 4, 5]);
const testPath = '/path/to/test.txt';

try {
    await writeFile(testPath, testData);
    console.log('Write test successful');
} catch (e) {
    console.error('Write test failed:', e);
}
```

## 🔧 临时解决方案

### 方案 1: 回退到简单保存

如果完整性保护导致问题，可以临时回退：

```typescript
// 在 VaultContext.tsx 中
if (vault.path) {
    // 简单保存（无保护）
    const data = await vault.db.save();
    await writeFile(vault.path, new Uint8Array(data));
    
    if (!isAutoSave) {
        addToast({ title: "Saved to file", type: "success" });
    }
}
```

### 方案 2: 只启用备份，禁用验证

```typescript
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,       // ✅ 保留备份
    verifyAfterWrite: false,  // ❌ 禁用验证
    silent: isAutoSave
});
```

### 方案 3: 使用异步验证

```typescript
// 保存后异步验证，不阻塞保存流程
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    verifyAfterWrite: false,  // 先不验证
    silent: isAutoSave
});

// 异步验证
if (result.success) {
    verifyDatabaseFile(vault.path, vault.db.credentials)
        .then(verification => {
            if (!verification.valid) {
                console.warn('Post-save verification failed:', verification.error);
            }
        })
        .catch(console.error);
}
```

## 📝 收集诊断信息

请提供以下信息以便进一步诊断：

1. **完整的错误消息**
   - 浏览器控制台的完整错误堆栈

2. **操作系统信息**
   ```bash
   # macOS
   sw_vers
   
   # 文件系统类型
   diskutil info / | grep "File System"
   ```

3. **文件路径**
   - 数据库文件的完整路径
   - 路径中是否包含特殊字符或空格

4. **控制台日志**
   - 保存操作前后的所有日志输出

5. **数据库信息**
   - 数据库文件大小
   - 是否使用密钥文件

## 🚀 快速修复

### 修复 1: 确保凭证可用

```typescript
// 在 VaultContext.tsx 的 addVault 函数中（第 465 行）
const db = await kdbxweb.Kdbx.load(arrayBuffer as ArrayBuffer, credentials);
db.credentials = credentials;  // ✅ 添加这一行

// 在 createVault 函数中（第 562 行）
const db = createDatabase(name, password, keyFileBuffer);
db.credentials = new kdbxweb.Credentials(
    kdbxweb.ProtectedValue.fromString(password), 
    keyFileBuffer
);  // ✅ 添加这一行
```

### 修复 2: 添加错误处理

```typescript
// 在 VaultContext.tsx 的 saveVault 函数中
try {
    const result = await safeSaveDatabase(vault.path, vault.db, {
        createBackup: true,
        maxBackups: 5,
        verifyAfterWrite: true,
        silent: isAutoSave
    });
    
    if (!result.success) {
        console.error('Save failed:', result.error);
        throw new Error(result.error || 'Failed to save database');
    }
    
    // ... 成功处理
} catch (e: any) {
    console.error('Save error details:', {
        message: e.message,
        stack: e.stack,
        vaultPath: vault.path,
        hasCredentials: !!vault.db.credentials
    });
    
    if (!isAutoSave) {
        addToast({ 
            title: "Failed to save vault", 
            description: e.message,
            type: "error" 
        });
    }
}
```

### 修复 3: 添加重试机制

```typescript
async function saveWithRetry(vault: Vault, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await safeSaveDatabase(vault.path, vault.db, {
                createBackup: i === 0,  // 只在第一次尝试时创建备份
                verifyAfterWrite: true,
                silent: i < maxRetries - 1
            });
            
            if (result.success) {
                return result;
            }
        } catch (e) {
            if (i === maxRetries - 1) {
                throw e;  // 最后一次重试失败，抛出错误
            }
            console.warn(`Save attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000));  // 等待 1 秒
        }
    }
}
```

## 📞 获取帮助

如果问题仍然存在，请：

1. **收集诊断信息**（见上文）
2. **创建最小复现案例**
3. **提供详细的错误日志**

## ✅ 验证修复

修复后，测试以下场景：

- [ ] 创建新条目并保存
- [ ] 编辑现有条目并保存
- [ ] 删除条目并保存
- [ ] 修改组并保存
- [ ] 自动保存（如果启用）
- [ ] 手动保存
- [ ] 关闭并重新打开数据库

每个场景都应该：
- ✅ 保存成功
- ✅ 创建备份
- ✅ 验证通过
- ✅ 数据正确保存
