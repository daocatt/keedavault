# 备份清理调试指南

## 当前问题

备份文件 `vault-test4.backup.2025-12-12T10-34-06.kdbx` 没有被自动清理。

## 调试步骤

### 步骤 1: 重启开发服务器

**必须重启**以加载新的日志代码和权限：

```bash
# Ctrl+C 停止
npm run dev
```

### 步骤 2: 打开浏览器控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 清空控制台（右键 → Clear console）

### 步骤 3: 触发保存操作

1. 打开数据库 `vault-test4.kdbx`
2. 添加或修改一个条目
3. 点击保存

### 步骤 4: 查看详细日志

现在你应该看到非常详细的日志输出：

```
[Backup Cleanup] Starting cleanup
[Backup Cleanup] Directory: /path/to/database
[Backup Cleanup] Database name: vault-test4
[Backup Cleanup] Max backups: 5
[Backup Cleanup] Found X total files in directory
[Backup Cleanup] Looking for pattern: vault-test4.backup.*.kdbx
[Backup Cleanup] Found backup file: vault-test4.backup.2025-12-12T10-34-06.kdbx
[Backup Cleanup] Extracted timestamp string: 2025-12-12T10-34-06
[Backup Cleanup] Converted to ISO: 2025-12-12T10:34:06
[Backup Cleanup] Parsed timestamp: 1733970846000 (12/12/2025, 10:34:06 AM)
[Backup Cleanup] Found 1 backup files total
[Backup Cleanup]   1. vault-test4.backup.2025-12-12T10-34-06.kdbx (12/12/2025, 10:34:06 AM)
[Backup Cleanup] No cleanup needed (1 <= 5)
```

## 分析日志

### 场景 1: 备份数量不足

如果看到：
```
[Backup Cleanup] No cleanup needed (1 <= 5)
```

**原因**：只有 1 个备份，未超过限制（5 个）

**解决方案**：连续保存 6 次以上，触发清理

### 场景 2: 找不到备份文件

如果看到：
```
[Backup Cleanup] Found 0 total files in directory
```

**原因**：
- 目录读取失败
- 权限不足

**解决方案**：
1. 检查权限配置
2. 确认已重启服务器

### 场景 3: 文件名模式不匹配

如果看到：
```
[Backup Cleanup] Found 10 total files in directory
[Backup Cleanup] Looking for pattern: vault-test4.backup.*.kdbx
[Backup Cleanup] Found 0 backup files total
```

**原因**：文件名模式不匹配

**检查**：
- 数据库文件名：`vault-test4.kdbx`
- 备份文件名：`vault-test4.backup.2025-12-12T10-34-06.kdbx`
- 模式：`vault-test4.backup.*.kdbx` ✅

### 场景 4: 时间戳解析失败

如果看到：
```
[Backup Cleanup] Invalid timestamp for ...
```

**原因**：时间戳格式不正确

**检查**：
- 正确格式：`2025-12-12T10-34-06`
- 转换后：`2025-12-12T10:34:06`

### 场景 5: 删除失败

如果看到：
```
[Backup Cleanup] ❌ Failed to delete vault-test4.backup.xxx.kdbx: ...
```

**原因**：
- 权限不足
- 文件被占用

**解决方案**：
1. 检查 `fs:allow-remove` 权限
2. 关闭其他可能打开文件的程序

## 手动测试清理

### 创建多个备份

连续保存 6-7 次：

1. 修改条目 → 保存（第 1 次）
2. 修改条目 → 保存（第 2 次）
3. 修改条目 → 保存（第 3 次）
4. 修改条目 → 保存（第 4 次）
5. 修改条目 → 保存（第 5 次）
6. 修改条目 → 保存（第 6 次）← 应该触发清理

### 预期结果

第 6 次保存时，应该看到：

```
[Backup Cleanup] Found 6 backup files total
[Backup Cleanup]   1. vault-test4.backup.2025-12-12T18-35-00.kdbx (...)
[Backup Cleanup]   2. vault-test4.backup.2025-12-12T18-34-00.kdbx (...)
[Backup Cleanup]   3. vault-test4.backup.2025-12-12T18-33-00.kdbx (...)
[Backup Cleanup]   4. vault-test4.backup.2025-12-12T18-32-00.kdbx (...)
[Backup Cleanup]   5. vault-test4.backup.2025-12-12T18-31-00.kdbx (...)
[Backup Cleanup]   6. vault-test4.backup.2025-12-12T10-34-06.kdbx (...)
[Backup Cleanup] Will delete 1 old backups (keeping 5)
[Backup Cleanup] Deleting: vault-test4.backup.2025-12-12T10-34-06.kdbx
[Backup Cleanup] ✅ Deleted: vault-test4.backup.2025-12-12T10-34-06.kdbx
```

## 验证清理成功

### 方法 1: 查看文件系统

```bash
ls -lht /path/to/database/vault-test4.backup.*.kdbx
```

应该只看到 5 个最新的备份文件。

### 方法 2: 查看日志

确认看到 `✅ Deleted:` 消息。

## 常见问题

### Q: 为什么只有 1 个备份文件？

A: 可能是：
1. 这是第一次保存
2. 之前的备份被手动删除了
3. 数据库文件名改变了

### Q: 如何强制清理？

A: 修改 `maxBackups` 为更小的值：

```typescript
// 在 VaultContext.tsx 中
maxBackups: 1  // 只保留 1 个备份
```

### Q: 清理失败怎么办？

A: 手动删除旧备份：

```bash
# 列出所有备份
ls -lt vault-test4.backup.*.kdbx

# 删除最旧的
rm vault-test4.backup.2025-12-12T10-34-06.kdbx
```

## 下一步

1. **重启开发服务器**
2. **打开浏览器控制台**
3. **保存数据库**
4. **复制完整的日志输出**
5. **告诉我看到了什么**

这样我可以帮你精确诊断问题！
