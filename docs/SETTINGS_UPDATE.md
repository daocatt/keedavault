# 设置页面更新

## 📋 更新内容

### 1. Lock on Inactivity - 新增 30 秒选项

**位置**: Security → Auto-Lock → Lock on Inactivity

**更新前**:
- Never, 1 minute, 5 minutes, 10 minutes, 30 minutes, 60 minutes

**更新后**:
- Never, **30 seconds**, 1 minute, 5 minutes, 10 minutes, 30 minutes, 60 minutes

**显示逻辑**:
```typescript
n === 0 ? 'Never' : n < 60 ? `${n} seconds` : `${n / 60} minutes`
```

### 2. Lock in Background - 优化时间显示

**位置**: Security → Auto-Lock → Lock in Background

**更新前**:
- Never, Immediately, 10 seconds, 30 seconds, 60 seconds, 300 seconds

**更新后**:
- Never, Immediately, 10s, 30s, 1m, 5m, **50m** (3000 秒)

**显示逻辑**:
```typescript
n === 0 ? 'Never' 
: n === 1 ? 'Immediately' 
: n >= 60 ? `${Math.floor(n / 60)}m ${n % 60 > 0 ? n % 60 + 's' : ''}`.trim() 
: `${n}s`
```

**示例**:
- 60 秒 → `1m`
- 90 秒 → `1m 30s`
- 300 秒 → `5m`
- 3000 秒 → `50m`

### 3. Auto Backup - 新增自动备份开关

**位置**: Security → Data Protection (新分组)

**功能**:
- ✅ 默认开启
- ✅ 自动创建备份（保存前）
- ✅ 保留最近 5 个备份
- ✅ 自动清理旧备份

**描述文本**:
> Automatically create backups before saving (keeps 5 most recent backups)

**UI 效果**:
```
┌─ Data Protection ────────────────────────────┐
│                                               │
│  💾 Auto Backup                          [ON] │
│  Automatically create backups before          │
│  saving (keeps 5 most recent backups)         │
│                                               │
└───────────────────────────────────────────────┘
```

## 🔧 技术实现

### 1. UI Settings 类型定义

**文件**: `services/uiSettingsService.ts`

```typescript
security?: {
    // ... 其他字段
    autoBackup: boolean; // Auto backup before saving
};
```

### 2. 默认值

```typescript
security: {
    // ... 其他字段
    autoBackup: true, // 默认开启
}
```

### 3. 保存逻辑集成

**文件**: `context/VaultContext.tsx`

```typescript
const saveVault = async (id: string, isAutoSave = false) => {
    // ...
    
    // 获取自动备份设置
    const settings = await getUISettings();
    const autoBackupEnabled = settings.security?.autoBackup ?? true;
    
    const result = await safeSaveDatabase(vault.path, vault.db, {
        createBackup: autoBackupEnabled, // 使用设置值
        maxBackups: 5,
        verifyAfterWrite: true,
        silent: isAutoSave
    });
    
    // ...
};
```

## 📊 设置页面结构

### Security 标签页

```
Security
├─ Clipboard Security
│  ├─ Clear Clipboard After (时间选择器)
│  └─ Clear on Lock (开关)
│
├─ Auto-Lock
│  ├─ Lock on Inactivity (下拉菜单) ← 新增 30s
│  ├─ Lock in Background (下拉菜单) ← 优化显示
│  ├─ Lock on Window Close (开关)
│  ├─ Lock on Database Switch (开关)
│  └─ Lock on System Sleep (开关)
│
├─ Data Protection ← 新分组
│  └─ Auto Backup (开关) ← 新增
│
└─ Advanced
   ├─ Quick Unlock (Touch ID) (开关)
   └─ Remember Key Files (开关 - 禁用)
```

## 🎨 UI 改进

### 1. 时间显示优化

**之前**:
- 60 seconds
- 300 seconds
- 3000 seconds

**现在**:
- 1m
- 5m
- 50m

### 2. 新分组

添加了 "Data Protection" 分组，将备份相关设置独立出来，使设置更清晰。

### 3. 描述文本

为 Auto Backup 添加了详细的描述，说明：
- 自动创建备份
- 保留 5 个最近备份
- 在保存前执行

## 🔄 用户体验

### 开启自动备份（默认）

```
保存数据库
    ↓
创建备份: vault.backup.2025-12-12T18-40-00.kdbx
    ↓
清理旧备份（如果超过 5 个）
    ↓
保存到临时文件
    ↓
验证文件完整性
    ↓
替换原文件
    ↓
✅ Saved and verified (Backup created)
```

### 关闭自动备份

```
保存数据库
    ↓
保存到临时文件
    ↓
验证文件完整性
    ↓
替换原文件
    ↓
✅ Saved and verified
```

## 📝 使用说明

### 修改 Lock on Inactivity

1. 打开 Settings
2. 切换到 Security 标签
3. 找到 "Lock on Inactivity"
4. 选择 "30 seconds" 或其他选项

### 修改 Lock in Background

1. 打开 Settings
2. 切换到 Security 标签
3. 找到 "Lock in Background"
4. 选择时间（显示为 10s, 1m, 5m, 50m 等）

### 开启/关闭自动备份

1. 打开 Settings
2. 切换到 Security 标签
3. 找到 "Data Protection" 分组
4. 切换 "Auto Backup" 开关

**注意**:
- 关闭自动备份后，仍会进行文件验证
- 建议保持开启以保护数据安全

## 🧪 测试

### 测试 30 秒锁定

1. 设置 Lock on Inactivity 为 30 seconds
2. 打开数据库
3. 等待 30 秒不操作
4. 数据库应该自动锁定

### 测试 Lock in Background

1. 设置 Lock in Background 为 1m
2. 打开数据库
3. 切换到其他应用
4. 等待 1 分钟
5. 切回应用，数据库应该已锁定

### 测试自动备份

1. 开启 Auto Backup
2. 修改条目并保存
3. 检查文件目录，应该有备份文件
4. 关闭 Auto Backup
5. 再次保存
6. 不应该创建新备份

## 📚 相关文档

- `docs/DATABASE_INTEGRITY.md` - 数据完整性保护机制
- `docs/BACKUP_MANAGEMENT.md` - 备份管理策略
- `docs/BACKUP_CLEANUP_TROUBLESHOOTING.md` - 备份清理故障排查

## ✅ 总结

**已完成**:
- ✅ Lock on Inactivity 新增 30 秒选项
- ✅ Lock in Background 优化时间显示（10s, 1m, 5m, 50m）
- ✅ 新增 Auto Backup 开关（默认开启）
- ✅ 添加详细描述（保留 5 个备份）
- ✅ 集成到保存逻辑
- ✅ 新增 Data Protection 分组

**用户受益**:
- 🎯 更灵活的锁定选项（30 秒）
- 📊 更清晰的时间显示
- 🛡️ 可控的备份策略
- 💾 节省磁盘空间（可选择关闭备份）
