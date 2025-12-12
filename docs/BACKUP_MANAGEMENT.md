# 备份文件管理策略

## 📋 概述

KeedaVault 的数据完整性保护机制会在每次保存时自动创建备份文件。为了防止备份文件占用过多磁盘空间，系统实现了自动清理机制。

## 🔄 备份策略

### 自动备份

每次保存数据库时，系统会：

1. **创建带时间戳的备份**
   ```
   原文件: vault.kdbx
   备份文件: vault.backup.2025-12-12T18-26-00.kdbx
   ```

2. **自动清理旧备份**
   - 默认保留最近 **5 个**备份
   - 自动删除超过限制的旧备份
   - 按时间戳排序，保留最新的

### 备份文件命名规则

```
<数据库名>.backup.<时间戳>.kdbx

示例：
vault.backup.2025-12-12T18-26-00.kdbx
vault.backup.2025-12-12T17-30-00.kdbx
vault.backup.2025-12-12T16-45-00.kdbx
```

时间戳格式：`YYYY-MM-DDTHH-MM-SS`

## ⚙️ 配置选项

### 修改保留数量

在 `VaultContext.tsx` 中修改 `maxBackups` 参数：

```typescript
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    maxBackups: 10,  // 修改这里：保留 10 个备份
    verifyAfterWrite: true,
    silent: isAutoSave
});
```

**推荐值：**
- **5 个**（默认）- 平衡磁盘空间和安全性
- **10 个** - 更多历史版本，适合重要数据
- **3 个** - 节省磁盘空间
- **1 个** - 最小备份，仅保留上一个版本

### 完全禁用备份（不推荐）

```typescript
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: false,  // ⚠️ 禁用备份
    verifyAfterWrite: true,
    silent: isAutoSave
});
```

⚠️ **警告**：禁用备份会失去数据保护，不推荐！

## 📊 磁盘空间占用

### 估算

假设你的数据库文件大小为 **1 MB**：

| 保留备份数 | 磁盘占用 | 说明 |
|-----------|---------|------|
| 1 个 | ~2 MB | 原文件 + 1 个备份 |
| 5 个（默认）| ~6 MB | 原文件 + 5 个备份 |
| 10 个 | ~11 MB | 原文件 + 10 个备份 |

对于大多数用户，5 个备份（~6 MB）是可以接受的。

### 实时监控

查看备份文件占用的空间：

```bash
# macOS/Linux
ls -lh /path/to/database/directory/*.backup.*.kdbx

# 查看总大小
du -sh /path/to/database/directory/*.backup.*.kdbx
```

## 🗑️ 手动清理备份

### 方法 1：通过 UI（推荐）

使用 `DatabaseIntegrityModal` 组件：

1. 打开数据库属性或设置
2. 点击"完整性检查"
3. 查看备份列表
4. 选择要删除的备份

### 方法 2：通过文件管理器

1. 导航到数据库文件所在目录
2. 查找 `.backup.` 文件
3. 手动删除不需要的备份

```bash
# 示例：删除所有备份文件（谨慎！）
rm /path/to/vault.backup.*.kdbx
```

### 方法 3：使用脚本

创建清理脚本 `cleanup-backups.sh`：

```bash
#!/bin/bash

# 配置
DB_DIR="/path/to/database/directory"
DB_NAME="vault"
KEEP_COUNT=5

# 查找并删除旧备份
cd "$DB_DIR"
ls -t ${DB_NAME}.backup.*.kdbx | tail -n +$((KEEP_COUNT + 1)) | xargs rm -f

echo "Cleanup complete. Kept $KEEP_COUNT most recent backups."
```

使用：
```bash
chmod +x cleanup-backups.sh
./cleanup-backups.sh
```

## 🔍 查看备份列表

### 通过代码

```typescript
import { listBackups } from '../services/databaseIntegrityService';

const backups = await listBackups('/path/to/vault.kdbx');
console.log('Available backups:', backups);

// 输出示例：
// [
//   '/path/to/vault.backup.2025-12-12T18-26-00.kdbx',
//   '/path/to/vault.backup.2025-12-12T17-30-00.kdbx',
//   '/path/to/vault.backup.2025-12-12T16-45-00.kdbx'
// ]
```

### 通过终端

```bash
# 列出所有备份文件
ls -lht /path/to/database/*.backup.*.kdbx

# 只显示文件名和时间
ls -t /path/to/database/*.backup.*.kdbx
```

## 🔄 恢复备份

### 方法 1：通过 UI

1. 打开 `DatabaseIntegrityModal`
2. 查看备份列表
3. 点击"恢复"按钮
4. 确认恢复操作

### 方法 2：手动恢复

```bash
# 1. 备份当前文件（以防万一）
cp vault.kdbx vault.kdbx.current

# 2. 从备份恢复
cp vault.backup.2025-12-12T18-26-00.kdbx vault.kdbx

# 3. 在 KeedaVault 中重新打开数据库
```

### 方法 3：使用代码

```typescript
import { restoreFromBackup } from '../services/databaseIntegrityService';

const result = await restoreFromBackup(
    '/path/to/vault.kdbx',
    '/path/to/vault.backup.2025-12-12T18-26-00.kdbx'
);

if (result.success) {
    console.log('Backup restored successfully');
} else {
    console.error('Restore failed:', result.error);
}
```

## 📅 备份保留策略建议

### 个人用户

```typescript
maxBackups: 5  // 默认值
```

- 保留最近 5 次保存的版本
- 适合日常使用
- 磁盘占用适中

### 团队/企业用户

```typescript
maxBackups: 10
```

- 保留更多历史版本
- 便于追溯和审计
- 需要更多磁盘空间

### 频繁修改的数据库

```typescript
maxBackups: 3
```

- 减少磁盘占用
- 仍保留基本保护
- 适合频繁保存的场景

### 关键数据库

```typescript
maxBackups: 20
```

- 最大程度的历史保护
- 配合外部备份使用
- 定期归档到云存储

## 🔐 备份安全性

### 加密

- ✅ 备份文件使用**相同的加密**
- ✅ 需要**相同的密码**才能打开
- ✅ 与原文件具有**相同的安全级别**

### 权限

- ✅ 备份文件继承原文件的权限
- ✅ 只有文件所有者可以访问
- ✅ 不包含额外的元数据

### 存储位置

- 📁 备份文件存储在**原文件相同目录**
- 💡 建议定期将备份复制到其他位置：
  - 外部硬盘
  - 云存储（加密后）
  - NAS 设备

## 🚀 高级功能

### 自定义备份位置（未来功能）

```typescript
// 计划中的功能
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    backupDirectory: '/path/to/backup/directory',  // 自定义备份目录
    maxBackups: 5
});
```

### 压缩备份（未来功能）

```typescript
// 计划中的功能
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    compressBackup: true,  // 压缩备份文件
    maxBackups: 10
});
```

### 云同步（未来功能）

```typescript
// 计划中的功能
const result = await safeSaveDatabase(vault.path, vault.db, {
    createBackup: true,
    syncToCloud: true,  // 自动同步到云存储
    cloudProvider: 'icloud'  // iCloud, Dropbox, Google Drive
});
```

## 📝 最佳实践

### 1. 定期检查备份

每周检查一次备份文件：

```bash
ls -lht /path/to/database/*.backup.*.kdbx | head -5
```

### 2. 定期测试恢复

每月测试一次备份恢复流程，确保备份可用。

### 3. 外部备份

除了自动备份，定期创建外部备份：

```bash
# 每周备份到外部硬盘
cp vault.kdbx /Volumes/Backup/vault-$(date +%Y-%m-%d).kdbx
```

### 4. 监控磁盘空间

如果磁盘空间紧张，减少 `maxBackups` 值。

### 5. 重要操作前手动备份

在进行重要操作前（如批量删除、导入数据），手动创建备份：

```bash
cp vault.kdbx vault.kdbx.before-import
```

## 🐛 故障排查

### 备份文件没有自动清理

**可能原因：**
1. 权限不足
2. 目录读取失败

**解决方案：**
```bash
# 检查权限
ls -la /path/to/database/

# 手动清理
ls -t vault.backup.*.kdbx | tail -n +6 | xargs rm -f
```

### 备份文件占用太多空间

**解决方案：**
1. 减少 `maxBackups` 值
2. 手动删除旧备份
3. 压缩数据库文件

### 无法恢复备份

**可能原因：**
1. 备份文件损坏
2. 密码错误

**解决方案：**
1. 尝试其他备份文件
2. 使用文件恢复工具

## 📊 监控和日志

查看备份操作的日志：

```typescript
// 浏览器控制台
console.log('Backup operations:');

// 应该看到：
// Creating backup: /path/to/vault.backup.2025-12-12T18-26-00.kdbx
// Backup created successfully
// Cleaning up backups in /path/to/database for vault
// Found 6 backup files
// Deleting 1 old backups
// Deleted old backup: vault.backup.2025-12-11T10-00-00.kdbx
```

## 总结

✅ **自动备份** - 每次保存自动创建  
✅ **自动清理** - 保留最近 5 个（可配置）  
✅ **安全加密** - 与原文件相同的加密  
✅ **易于恢复** - 通过 UI 或手动恢复  
✅ **磁盘友好** - 自动删除旧备份  

现在你的数据库有了完整的保护机制！🎉
