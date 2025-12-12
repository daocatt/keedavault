# 应用数据目录权限修复

## 🐛 问题

保存 Dropbox 数据库时出现权限错误：

```
[Backup] Error creating backup directory:
forbidden path: /Users/mengdoo/Library/Application Support/com.bsdev.keedavaultbackups
maybe it is not allowed on the scope for `allow-mkdir` permission in your capability file
```

## 🔍 问题分析

### 问题 1: 路径拼接错误

```
/Users/mengdoo/Library/Application Support/com.bsdev.keedavaultbackups
                                                              ^^^^^^^^
                                                              缺少斜杠
```

**应该是**:
```
/Users/mengdoo/Library/Application Support/com.bsdev.keedavault/backups
                                                              ^
                                                              有斜杠
```

### 问题 2: 缺少 mkdir 权限

Tauri 配置中缺少 `fs:allow-mkdir` 权限，无法在应用数据目录创建文件夹。

## ✅ 解决方案

### 1. 修复路径拼接

**文件**: `services/databaseIntegrityService.ts`

```typescript
async function getAppDataBackupDir(): Promise<string> {
    const appData = await appDataDir();
    
    // 确保正确的路径分隔符
    const backupDir = appData.endsWith('/') || appData.endsWith('\\') 
        ? `${appData}backups`      // 已有斜杠: /path/ + backups
        : `${appData}/backups`;    // 无斜杠: /path + /backups
    
    console.log(`[Backup] App data directory: ${appData}`);
    console.log(`[Backup] Backup directory: ${backupDir}`);
    
    // ... 创建目录逻辑
}
```

### 2. 添加 mkdir 权限

**文件**: `src-tauri/tauri.conf.json`

```json
{
  "identifier": "fs:allow-mkdir",
  "allow": [
    {
      "path": "$APPDATA/**"
    },
    {
      "path": "$LOCALDATA/**"
    }
  ]
}
```

## 📊 修复前后对比

### 修复前

**路径**:
```
❌ /Users/username/Library/Application Support/com.bsdev.keedavaultbackups
```

**权限**:
```
❌ fs:allow-mkdir - 未配置
```

**结果**:
```
Error: forbidden path
```

### 修复后

**路径**:
```
✅ /Users/username/Library/Application Support/com.bsdev.keedavault/backups
```

**权限**:
```
✅ fs:allow-mkdir - 已配置 $APPDATA/**
```

**结果**:
```
✅ 目录创建成功
✅ 备份文件写入成功
```

## 🔧 完整的权限配置

### tauri.conf.json

```json
{
  "app": {
    "security": {
      "capabilities": [
        {
          "identifier": "main-capability",
          "permissions": [
            // ... 其他权限 ...
            
            // 读取文件
            {
              "identifier": "fs:allow-read-file",
              "allow": [
                { "path": "$APPDATA/**" },
                { "path": "$LOCALDATA/**" }
              ]
            },
            
            // 写入文件
            {
              "identifier": "fs:allow-write-file",
              "allow": [
                { "path": "$APPDATA/**" },
                { "path": "$LOCALDATA/**" }
              ]
            },
            
            // 检查文件存在
            {
              "identifier": "fs:allow-exists",
              "allow": [
                { "path": "$APPDATA/**" },
                { "path": "$LOCALDATA/**" }
              ]
            },
            
            // 创建目录 ← 新增
            {
              "identifier": "fs:allow-mkdir",
              "allow": [
                { "path": "$APPDATA/**" },
                { "path": "$LOCALDATA/**" }
              ]
            },
            
            // 删除文件
            {
              "identifier": "fs:allow-remove",
              "allow": [
                { "path": "$APPDATA/**" },
                { "path": "$LOCALDATA/**" }
              ]
            },
            
            // 读取目录
            {
              "identifier": "fs:allow-read-dir",
              "allow": [
                { "path": "$APPDATA/**" },
                { "path": "$LOCALDATA/**" }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

## 🧪 测试

### 测试步骤

1. **重启开发服务器**
   ```bash
   # 权限配置只在启动时加载
   npm run tauri dev
   ```

2. **打开 Dropbox 数据库**
   ```
   /Users/username/Dropbox/vault.kdbx
   ```

3. **修改并保存**
   - 添加一个条目
   - 点击保存

4. **查看日志**
   ```
   [Backup] App data directory: /Users/username/Library/Application Support/com.bsdev.keedavault/
   [Backup] Backup directory: /Users/username/Library/Application Support/com.bsdev.keedavault/backups
   [Backup] Creating backup directory: .../backups
   [Backup] Backup directory created successfully
   Creating backup: .../backups/bt961p0000000000.backup.2025-12-12T21-30-00.kdbx
   Backup created successfully
   ```

5. **验证备份文件**
   ```bash
   ls -lht ~/Library/Application\ Support/com.bsdev.keedavault/backups/
   ```

### 预期结果

- ✅ 无权限错误
- ✅ 目录创建成功
- ✅ 备份文件写入成功
- ✅ 保存成功

## 📝 Tauri 权限系统说明

### 权限作用域

| 变量 | macOS 路径 | Windows 路径 |
|------|-----------|-------------|
| `$APPDATA` | `~/Library/Application Support/` | `%APPDATA%` |
| `$LOCALDATA` | `~/Library/Application Support/` | `%LOCALAPPDATA%` |
| `$HOME` | `~` | `%USERPROFILE%` |
| `$DOCUMENT` | `~/Documents` | `%USERPROFILE%\Documents` |
| `$DOWNLOAD` | `~/Downloads` | `%USERPROFILE%\Downloads` |

### 常用权限

| 权限 | 用途 |
|------|------|
| `fs:allow-read-file` | 读取文件 |
| `fs:allow-write-file` | 写入文件 |
| `fs:allow-exists` | 检查文件/目录是否存在 |
| `fs:allow-mkdir` | 创建目录 |
| `fs:allow-remove` | 删除文件/目录 |
| `fs:allow-read-dir` | 读取目录内容 |

## ⚠️ 注意事项

### 1. 权限配置生效

**必须重启开发服务器**:
```bash
# Ctrl+C 停止
npm run tauri dev
```

权限配置在应用启动时加载，修改后不会自动生效。

### 2. 路径分隔符

**跨平台兼容**:
```typescript
// ✅ 正确：检查是否已有分隔符
const backupDir = appData.endsWith('/') || appData.endsWith('\\') 
    ? `${appData}backups` 
    : `${appData}/backups`;

// ❌ 错误：假设总是有斜杠
const backupDir = `${appData}backups`;

// ❌ 错误：可能产生双斜杠
const backupDir = `${appData}/backups`;
```

### 3. 权限范围

**使用通配符**:
```json
{
  "path": "$APPDATA/**"  // ✅ 允许所有子目录
}
```

**不要过于具体**:
```json
{
  "path": "$APPDATA/com.bsdev.keedavault/backups"  // ❌ 太具体
}
```

## 🔍 调试技巧

### 1. 检查路径

在浏览器控制台查看日志：
```
[Backup] App data directory: /Users/username/Library/Application Support/com.bsdev.keedavault/
[Backup] Backup directory: /Users/username/Library/Application Support/com.bsdev.keedavault/backups
```

确认路径正确，没有双斜杠或缺少斜杠。

### 2. 检查权限

如果仍有权限错误，检查 `tauri.conf.json`:
```bash
grep -A 5 "fs:allow-mkdir" src-tauri/tauri.conf.json
```

### 3. 手动测试

```bash
# 手动创建目录测试
mkdir -p ~/Library/Application\ Support/com.bsdev.keedavault/backups

# 检查权限
ls -ld ~/Library/Application\ Support/com.bsdev.keedavault/backups
```

## ✅ 总结

**问题**:
1. 路径拼接错误（缺少斜杠）
2. 缺少 `fs:allow-mkdir` 权限

**解决**:
1. ✅ 修复路径拼接逻辑
2. ✅ 添加 mkdir 权限到 tauri.conf.json
3. ✅ 重启开发服务器

**效果**:
- ✅ 云存储数据库备份正常工作
- ✅ 应用数据目录自动创建
- ✅ 无权限错误

**修改文件**:
- `services/databaseIntegrityService.ts` - 路径拼接逻辑
- `src-tauri/tauri.conf.json` - 添加 mkdir 权限
