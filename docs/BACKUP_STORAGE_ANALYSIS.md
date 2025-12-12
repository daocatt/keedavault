# 备份文件存储方案分析

## 📋 当前方案 vs 应用内存储

### 当前方案：与数据库同目录

**位置**:
```
/Users/username/Documents/
├── vault.kdbx                              (原文件)
├── vault.backup.2025-12-12T19-00-00.kdbx  (备份1)
└── vault.backup.2025-12-12T18-55-00.kdbx  (备份2)
```

**优点** ✅:
1. **用户可见** - 用户可以直接在文件管理器中看到备份
2. **易于访问** - 可以直接复制、移动或删除备份
3. **跨应用兼容** - 其他 KeePass 应用也能识别和使用
4. **备份随数据库移动** - 移动数据库时，备份也一起移动
5. **无权限问题** - 与数据库文件有相同的访问权限
6. **易于手动恢复** - 直接重命名备份文件即可恢复

**缺点** ❌:
1. **文件夹混乱** - 多个备份文件可能让文件夹看起来杂乱
2. **用户可能误删** - 用户可能不小心删除备份文件
3. **占用用户空间** - 直接占用用户文档目录空间

---

### 应用内存储方案

**位置**:
```
macOS:
~/Library/Application Support/com.bsdev.keedavault/backups/
├── vault-abc123.backup.2025-12-12T19-00-00.kdbx
└── vault-abc123.backup.2025-12-12T18-55-00.kdbx

Windows:
C:\Users\username\AppData\Roaming\com.bsdev.keedavault\backups\

Linux:
~/.local/share/com.bsdev.keedavault/backups/
```

**优点** ✅:
1. **文件夹整洁** - 用户文档目录保持干净
2. **集中管理** - 所有数据库的备份集中在一个位置
3. **不易误删** - 用户不太可能意外删除应用数据
4. **统一清理** - 可以一次性清理所有备份
5. **更好的组织** - 可以按数据库分组管理备份

**缺点** ❌:
1. **用户不可见** - 普通用户很难找到备份位置
2. **恢复复杂** - 需要通过应用 UI 才能恢复
3. **跨应用不兼容** - 其他 KeePass 应用找不到这些备份
4. **备份分离** - 移动数据库时，备份不会跟随
5. **权限复杂** - 需要额外的文件系统权限配置
6. **占用系统空间** - 占用应用数据目录空间

---

## 🎯 推荐方案：混合方案

### 方案 A：默认同目录 + 可选应用内

**实现**:
```typescript
interface BackupSettings {
    enabled: boolean;
    location: 'same-directory' | 'app-data';  // 用户可选
    maxBackups: number;
}
```

**配置界面**:
```
┌─ Data Protection ────────────────────────┐
│                                           │
│  💾 Auto Backup                      [ON] │
│  Automatically create backups before      │
│  saving (keeps 2 most recent backups)     │
│                                           │
│  📁 Backup Location:                      │
│     ○ Same as database (recommended)      │
│     ○ Application data folder             │
│                                           │
└───────────────────────────────────────────┘
```

**优点**:
- ✅ 灵活性最高
- ✅ 满足不同用户需求
- ✅ 默认方案最简单（同目录）
- ✅ 高级用户可选应用内存储

---

### 方案 B：智能备份位置

**逻辑**:
```typescript
function getBackupLocation(dbPath: string): string {
    // 如果数据库在用户文档目录
    if (isInDocumentsFolder(dbPath)) {
        return 'same-directory';  // 同目录
    }
    
    // 如果数据库在临时位置或系统目录
    if (isInTempOrSystemFolder(dbPath)) {
        return 'app-data';  // 应用数据目录
    }
    
    // 默认同目录
    return 'same-directory';
}
```

**优点**:
- ✅ 自动选择最佳位置
- ✅ 无需用户配置
- ✅ 智能处理特殊情况

---

## 💡 我的建议

### 保持当前方案（同目录存储）

**理由**:

1. **符合 KeePass 生态习惯**
   - KeePassXC、KeePass 等都使用同目录备份
   - 用户期望备份在数据库旁边

2. **简单直观**
   - 用户可以直接看到备份
   - 手动恢复非常简单

3. **跨应用兼容**
   - 其他 KeePass 应用可以识别
   - 备份文件可以在不同应用间共享

4. **备份随数据库移动**
   - 移动数据库到 U 盘时，备份也跟随
   - 适合便携使用场景

5. **实现简单**
   - 当前实现已经很完善
   - 无需额外的权限配置

### 可选的改进

如果用户觉得文件夹混乱，可以：

#### 改进 1：使用子文件夹

```
/Users/username/Documents/
├── vault.kdbx
└── .vault.backups/  (隐藏文件夹)
    ├── vault.backup.2025-12-12T19-00-00.kdbx
    └── vault.backup.2025-12-12T18-55-00.kdbx
```

**优点**:
- ✅ 文件夹整洁
- ✅ 备份仍在同一位置
- ✅ 隐藏文件夹不影响视觉

**实现**:
```typescript
function getBackupPath(originalPath: string): string {
    const dir = path.dirname(originalPath);
    const filename = path.basename(originalPath);
    const backupDir = path.join(dir, `.${filename}.backups`);
    
    // 创建备份目录
    await mkdir(backupDir, { recursive: true });
    
    return path.join(backupDir, `${filename}.backup.${timestamp}.kdbx`);
}
```

#### 改进 2：添加 .gitignore 风格的隐藏

```
vault.kdbx
.vault.backup.2025-12-12T19-00-00.kdbx  (隐藏文件)
.vault.backup.2025-12-12T18-55-00.kdbx  (隐藏文件)
```

**优点**:
- ✅ 在文件管理器中默认隐藏
- ✅ 仍在同一目录
- ✅ 高级用户可以显示隐藏文件查看

**实现**:
```typescript
function getBackupPath(originalPath: string): string {
    const dir = path.dirname(originalPath);
    const filename = path.basename(originalPath);
    
    // 在文件名前加点，使其成为隐藏文件
    return path.join(dir, `.${filename}.backup.${timestamp}.kdbx`);
}
```

---

## 🔍 应用内存储的实现参考

如果真的要实现应用内存储，这是实现方式：

### 1. 获取应用数据目录

```typescript
import { appDataDir } from '@tauri-apps/api/path';

async function getBackupDirectory(): Promise<string> {
    const appData = await appDataDir();
    const backupDir = path.join(appData, 'backups');
    
    // 确保目录存在
    await mkdir(backupDir, { recursive: true });
    
    return backupDir;
}
```

### 2. 生成备份文件名

```typescript
async function getAppDataBackupPath(originalPath: string): Promise<string> {
    const backupDir = await getBackupDirectory();
    
    // 使用数据库路径的哈希作为标识
    const dbHash = hashPath(originalPath);
    const timestamp = formatTimestamp(new Date());
    
    return path.join(
        backupDir,
        `${dbHash}.backup.${timestamp}.kdbx`
    );
}

function hashPath(path: string): string {
    // 简单的哈希，实际可以用 crypto
    return Buffer.from(path).toString('base64')
        .replace(/[/+=]/g, '')
        .substring(0, 16);
}
```

### 3. 备份元数据

```typescript
// 保存备份元数据，方便查找
interface BackupMetadata {
    originalPath: string;
    backupPath: string;
    timestamp: Date;
    size: number;
}

async function saveBackupMetadata(metadata: BackupMetadata) {
    const metadataPath = path.join(
        await getBackupDirectory(),
        'metadata.json'
    );
    
    const existing = await loadMetadata();
    existing.push(metadata);
    
    await writeFile(metadataPath, JSON.stringify(existing, null, 2));
}
```

### 4. 列出备份

```typescript
async function listBackupsForDatabase(dbPath: string): Promise<BackupMetadata[]> {
    const metadata = await loadMetadata();
    return metadata.filter(m => m.originalPath === dbPath);
}
```

### 5. 清理备份

```typescript
async function cleanupAppDataBackups(dbPath: string, maxBackups: number) {
    const backups = await listBackupsForDatabase(dbPath);
    
    // 按时间排序
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // 删除超过限制的备份
    const toDelete = backups.slice(maxBackups);
    for (const backup of toDelete) {
        await remove(backup.backupPath);
    }
    
    // 更新元数据
    await updateMetadata(backups.slice(0, maxBackups));
}
```

---

## 📊 方案对比总结

| 特性 | 同目录 | 应用内 | 子文件夹 | 隐藏文件 |
|------|--------|--------|---------|---------|
| 用户可见 | ✅ | ❌ | ⚠️ | ⚠️ |
| 文件夹整洁 | ❌ | ✅ | ✅ | ✅ |
| 易于恢复 | ✅ | ❌ | ✅ | ✅ |
| 跨应用兼容 | ✅ | ❌ | ✅ | ✅ |
| 实现复杂度 | ✅ 简单 | ❌ 复杂 | ⚠️ 中等 | ✅ 简单 |
| 权限问题 | ✅ 无 | ⚠️ 需要 | ✅ 无 | ✅ 无 |

---

## 🎯 最终建议

### 短期（当前版本）

**保持同目录存储**，因为：
- ✅ 符合 KeePass 生态
- ✅ 实现简单稳定
- ✅ 用户习惯

### 中期（下一版本）

**添加隐藏文件选项**：
```typescript
// 在设置中添加
hideBackupFiles: boolean;  // 默认 false
```

如果启用，备份文件名前加点：
```
.vault.backup.2025-12-12T19-00-00.kdbx
```

### 长期（未来版本）

**提供多种备份位置选项**：
1. 同目录（默认）
2. 同目录子文件夹
3. 应用数据目录
4. 自定义位置

让用户根据需求选择。

---

## ✅ 结论

**建议保持当前的同目录存储方案**，原因：

1. 符合 KeePass 生态标准
2. 用户体验最好
3. 实现最简单
4. 跨应用兼容性最佳

如果需要改进，优先考虑：
- 使用隐藏文件（加点前缀）
- 或使用子文件夹

**不建议**使用应用内存储，除非：
- 用户明确要求
- 提供为可选功能
- 有完善的 UI 支持备份管理
