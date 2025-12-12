# 云存储智能备份实现

## ✅ 已实现功能

### 🎯 智能检测云存储

自动检测数据库是否在云存储中，并选择最佳备份位置。

### 📁 备份位置策略

#### **本地文件** (如 `/Users/username/Documents/`)
```
vault.kdbx
vault.backup.2025-12-12T19-00-00.kdbx  ← 同目录
vault.backup.2025-12-12T18-55-00.kdbx
```

#### **云存储文件** (如 `iCloud Drive/`, `Dropbox/`)
```
iCloud Drive/Documents/
└── vault.kdbx  ← 只有主文件同步 ✅

~/Library/Application Support/com.bsdev.keedavault/backups/
├── abc123def456.backup.2025-12-12T19-00-00.kdbx  ← 备份在本地
└── abc123def456.backup.2025-12-12T18-55-00.kdbx  ← 不会同步 ✅
```

## 🔧 技术实现

### 1. 云存储检测

**文件**: `services/kdbxService.ts`

```typescript
export const isInCloudStorage = (filePath: string): boolean => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
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
```

### 2. 智能备份路径生成

**文件**: `services/databaseIntegrityService.ts`

```typescript
async function getBackupPath(originalPath: string): Promise<string> {
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);

    if (isInCloudStorage(originalPath)) {
        // 云存储：使用应用数据目录
        const backupDir = await getAppDataBackupDir();
        const dbHash = hashPath(originalPath);
        return `${backupDir}/${dbHash}.backup.${dateStr}.kdbx`;
    } else {
        // 本地存储：使用同目录
        const dir = path.dirname(originalPath);
        const filename = path.basename(originalPath, '.kdbx');
        return `${dir}/${filename}.backup.${dateStr}.kdbx`;
    }
}
```

### 3. 应用数据目录管理

```typescript
async function getAppDataBackupDir(): Promise<string> {
    const appData = await appDataDir();
    const backupDir = `${appData}/backups`;
    
    // 确保目录存在
    await mkdir(backupDir, { recursive: true });
    
    return backupDir;
}
```

### 4. 路径哈希

```typescript
function hashPath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    return Buffer.from(normalized)
        .toString('base64')
        .replace(/[/+=]/g, '')
        .substring(0, 16);
}
```

### 5. 智能清理

```typescript
async function cleanupOldBackups(originalPath: string, maxBackups: number) {
    let dir: string;
    let backupPattern: string;

    if (isInCloudStorage(originalPath)) {
        // 云存储：清理应用数据目录
        dir = await getAppDataBackupDir();
        backupPattern = `${hashPath(originalPath)}.backup.`;
    } else {
        // 本地存储：清理同目录
        dir = path.dirname(originalPath);
        backupPattern = `${path.basename(originalPath, '.kdbx')}.backup.`;
    }

    // 读取目录，筛选备份文件，删除旧备份
    // ...
}
```

## 📊 支持的云存储服务

| 服务 | macOS | Windows | Linux |
|------|-------|---------|-------|
| iCloud Drive | ✅ | ❌ | ❌ |
| Dropbox | ✅ | ✅ | ✅ |
| Google Drive | ✅ | ✅ | ❌ |
| OneDrive | ✅ | ✅ | ❌ |

## 🎯 优势

### 1. **避免同步冲突** ✅
```
云端只同步主文件
备份文件在本地，不会产生冲突
```

### 2. **节省带宽** ✅
```
每次保存:
- 主文件 (1 MB) → 同步
- 备份文件 (0 MB) → 不同步 ✅

节省: 50% 同步流量
```

### 3. **多设备独立** ✅
```
Mac: 有自己的备份
iPhone: 有自己的备份
不会互相干扰
```

### 4. **无缝体验** ✅
```
用户无需配置
自动检测
自动选择最佳策略
```

## 🧪 测试场景

### 场景 1: 本地文件

```bash
# 数据库位置
/Users/username/Documents/vault.kdbx

# 备份位置
/Users/username/Documents/vault.backup.2025-12-12T19-00-00.kdbx
/Users/username/Documents/vault.backup.2025-12-12T18-55-00.kdbx
```

**验证**:
- ✅ 备份在同目录
- ✅ 文件名可读
- ✅ 易于手动恢复

### 场景 2: iCloud Drive

```bash
# 数据库位置
/Users/username/Library/Mobile Documents/com~apple~CloudDocs/vault.kdbx

# 备份位置
/Users/username/Library/Application Support/com.bsdev.keedavault/backups/
├── abc123def456.backup.2025-12-12T19-00-00.kdbx
└── abc123def456.backup.2025-12-12T18-55-00.kdbx
```

**验证**:
- ✅ 备份在应用数据目录
- ✅ 不会触发 iCloud 同步
- ✅ 节省云存储空间

### 场景 3: Dropbox

```bash
# 数据库位置
/Users/username/Dropbox/KeePass/vault.kdbx

# 备份位置
/Users/username/Library/Application Support/com.bsdev.keedavault/backups/
├── def456abc123.backup.2025-12-12T19-00-00.kdbx
└── def456abc123.backup.2025-12-12T18-55-00.kdbx
```

**验证**:
- ✅ 备份在应用数据目录
- ✅ 不会触发 Dropbox 同步
- ✅ 避免同步冲突

## 📝 日志示例

### 本地文件

```
[Backup Cleanup] Local storage detected
[Backup Cleanup] Using same directory: /Users/username/Documents
[Backup Cleanup] Looking for pattern: vault.backup.*.kdbx
[Backup Cleanup] Found 2 backup files total
```

### 云存储文件

```
[Backup Cleanup] Cloud storage detected
[Backup Cleanup] Using app data directory: /Users/username/Library/Application Support/com.bsdev.keedavault/backups
[Backup Cleanup] Looking for pattern: abc123def456.backup.*.kdbx
[Backup Cleanup] Found 2 backup files total
```

## 🔍 备份文件命名

### 本地文件
```
vault.backup.2025-12-12T19-00-00.kdbx
└─┬─┘ └──────┬──────┘ └────┬────┘
  │          │              │
  │          │              └─ 扩展名
  │          └─ 时间戳 (ISO 格式)
  └─ 原文件名
```

### 云存储文件
```
abc123def456.backup.2025-12-12T19-00-00.kdbx
└────┬─────┘ └──────┬──────┘ └────┬────┘
     │              │              │
     │              │              └─ 扩展名
     │              └─ 时间戳 (ISO 格式)
     └─ 路径哈希 (16 字符)
```

## 🛠️ 维护和调试

### 查看备份位置

```bash
# 本地文件备份
ls -lht /path/to/database/*.backup.*.kdbx

# 云存储文件备份
ls -lht ~/Library/Application\ Support/com.bsdev.keedavault/backups/*.backup.*.kdbx
```

### 手动清理备份

```bash
# 清理应用数据目录的所有备份
rm -rf ~/Library/Application\ Support/com.bsdev.keedavault/backups/*
```

### 查看备份大小

```bash
# 应用数据目录备份总大小
du -sh ~/Library/Application\ Support/com.bsdev.keedavault/backups/
```

## ⚠️ 注意事项

### 1. 备份不会在设备间同步

**云存储文件的备份在每个设备上独立管理**:
- Mac 有自己的备份
- iPhone 有自己的备份
- 不会互相同步

### 2. 恢复备份

**本地文件**: 直接重命名备份文件即可

**云存储文件**: 需要通过应用 UI 恢复（未来功能）

### 3. 迁移数据库

**从云存储移到本地**:
- 备份会留在应用数据目录
- 新备份会在本地创建

**从本地移到云存储**:
- 旧备份留在原位置
- 新备份会在应用数据目录创建

## 🚀 未来改进

### 1. UI 显示备份位置

在设置中显示当前备份位置：
```
📁 Backup Location:
   Local files: Same directory
   Cloud files: Application data
   
   Current database: iCloud Drive
   Backups stored in: Application data
```

### 2. 备份管理界面

添加备份管理 UI：
- 列出所有备份
- 查看备份详情
- 恢复备份
- 删除备份

### 3. 手动选择策略

允许用户覆盖自动检测：
```
○ Auto (recommended)
○ Always same directory
○ Always application data
```

## ✅ 总结

**实现了**:
- ✅ 自动检测云存储
- ✅ 智能选择备份位置
- ✅ 避免同步冲突
- ✅ 节省带宽和存储
- ✅ 无缝用户体验

**效果**:
- 🌥️ 云存储文件：备份在应用数据目录
- 💾 本地文件：备份在同目录
- 🔄 自动切换，无需配置
- 🎯 最佳实践
