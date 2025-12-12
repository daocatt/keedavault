# 权限配置已更新 ✅

## 修改内容

已在 `src-tauri/tauri.conf.json` 中添加了 `fs:allow-remove` 权限：

```json
{
  "identifier": "fs:allow-remove",
  "allow": [
    { "path": "$HOME/**" },
    { "path": "$DESKTOP/**" },
    { "path": "$DOCUMENT/**" },
    { "path": "$DOWNLOAD/**" },
    { "path": "$APPDATA/**" },
    { "path": "$LOCALDATA/**" }
  ]
}
```

## 🚨 重要：必须重启开发服务器

Tauri 的权限配置只在启动时加载，**必须完全重启**才能生效：

### 步骤 1: 停止当前服务器

```bash
# 在终端按 Ctrl+C 停止
```

### 步骤 2: 清理并重启

```bash
# 清理构建缓存（可选但推荐）
rm -rf src-tauri/target/debug

# 重新启动
npm run dev
```

### 步骤 3: 等待完全启动

等待看到类似这样的输出：
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:1420/
```

### 步骤 4: 测试保存功能

1. 打开数据库
2. 添加或修改一个条目
3. 点击保存
4. 应该看到 **"Saved and verified"** 消息 ✅

## 验证权限是否生效

### 方法 1: 查看控制台日志

打开浏览器开发者工具（F12），应该看到完整的保存流程：

```
Creating backup: /path/to/vault.backup.2025-12-12T18-23-00.kdbx
Backup created successfully
Saving to temporary file: /path/to/vault.kdbx.tmp
Temporary file written
Verifying written data...
Verification: Found X entries in root
Verification passed
Replacing original file: /path/to/vault.kdbx
Original file removed          ← 这一行说明 remove 权限生效了
New file written
Temporary file removed
File replaced successfully
```

### 方法 2: 检查备份文件

导航到数据库文件所在目录，应该能看到：

```
vault.kdbx                              (主文件)
vault.backup.2025-12-12T18-23-00.kdbx  (备份文件)
```

### 方法 3: 测试删除操作

在浏览器控制台运行：

```javascript
import { remove } from '@tauri-apps/plugin-fs';

// 测试删除权限（使用一个测试文件）
const testPath = '/Users/你的用户名/Documents/test-delete.txt';

// 先创建测试文件
await writeFile(testPath, new Uint8Array([1, 2, 3]));

// 尝试删除
try {
  await remove(testPath);
  console.log('✅ Remove permission works!');
} catch (e) {
  console.error('❌ Remove permission failed:', e);
}
```

## 如果仍然失败

### 检查清单

- [ ] 已完全停止开发服务器（Ctrl+C）
- [ ] 已重新运行 `npm run dev`
- [ ] 等待服务器完全启动
- [ ] 刷新浏览器页面（Ctrl+R 或 Cmd+R）

### 终极解决方案：清理所有缓存

如果上述步骤都不行，尝试完全清理：

```bash
# 停止服务器
# Ctrl+C

# 清理所有构建产物
rm -rf src-tauri/target
rm -rf dist
rm -rf node_modules/.vite

# 重新安装依赖（可选）
npm install

# 重新启动
npm run dev
```

### 临时禁用完整性保护

如果问题持续存在，可以临时禁用完整性保护功能，回退到简单保存：

编辑 `context/VaultContext.tsx`，找到 `saveVault` 函数（约第 190 行），注释掉完整性保护代码：

```typescript
if (vault.path) {
    // 临时禁用完整性保护
    const data = await vault.db.save();
    await writeFile(vault.path, new Uint8Array(data));
    if (!isAutoSave) addToast({ title: "Saved to file", type: "success" });
    
    /* 完整性保护代码（暂时注释）
    const { safeSaveDatabase } = await import('../services/databaseIntegrityService');
    const result = await safeSaveDatabase(vault.path, vault.db, {
        createBackup: true,
        maxBackups: 5,
        verifyAfterWrite: true,
        silent: isAutoSave
    });
    // ... 其余代码
    */
}
```

## 权限配置位置总结

Tauri v2 的权限可以在两个地方配置：

### 1. `src-tauri/tauri.conf.json` ✅ (主要)
```json
{
  "app": {
    "security": {
      "capabilities": [
        {
          "permissions": [
            // 权限列表
          ]
        }
      ]
    }
  }
}
```

### 2. `src-tauri/capabilities/*.json` (次要)
```json
{
  "identifier": "migrated",
  "permissions": [
    // 权限列表
  ]
}
```

**注意**：`tauri.conf.json` 中的配置优先级更高。

## 下一步

1. **重启开发服务器**（必须！）
2. **测试保存功能**
3. **查看控制台日志**
4. **如果成功，提交代码**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: add fs:allow-remove permission for database integrity protection"
```

## 需要帮助？

如果重启后仍然失败，请提供：

1. 完整的错误消息
2. 浏览器控制台的所有输出
3. 数据库文件的路径
4. 是否看到 "Original file removed" 日志

这样我可以进一步诊断问题。
