# 数据库加密参数显示调试指南

## 🔍 问题

Settings → Security → Database Encryption 部分只显示了：
- Encryption Algorithm
- Key Derivation Function

但没有显示：
- Iterations
- Memory  
- Parallelism

## 🧪 调试步骤

### 步骤 1: 确保有数据库打开

1. 打开一个数据库（如 kpxc-test01.kdbx）
2. 输入密码解锁
3. 确认数据库已打开（能看到条目列表）

### 步骤 2: 打开 Settings

1. 点击右上角的 ⚙️ 图标
2. 切换到 **Security** 标签
3. 滚动到 **Database Encryption** 部分

### 步骤 3: 打开浏览器控制台

1. 按 **F12** 或 **Cmd+Option+I** (Mac)
2. 切换到 **Console** 标签
3. 清空控制台（点击 🚫 图标）

### 步骤 4: 重新打开 Settings

1. 关闭 Settings 窗口
2. 重新打开 Settings
3. 切换到 Security 标签
4. 查看控制台输出

### 步骤 5: 查找日志

在控制台搜索（Ctrl+F 或 Cmd+F）：
```
[Database Encryption]
```

应该看到类似这样的日志：
```
[Database Encryption] KDF Parameters: Map {...}
[Database Encryption] All keys: Array [...]
[Database Encryption] KDF UUID: ...
[Database Encryption] KDF UUID type: ...
[Database Encryption] KDF UUID string: ...
[Database Encryption] Normalized UUID: ...
[Database Encryption] KDF Name: ...
```

## 📋 收集信息

请提供以下信息：

### 1. 控制台日志

复制所有 `[Database Encryption]` 开头的日志。

### 2. Settings 界面显示

告诉我 Database Encryption 部分显示了什么：
- Encryption Algorithm: ?
- Key Derivation Function: ?
- 其他参数: 有/无

### 3. 数据库信息

- 数据库文件名: kpxc-test01.kdbx
- 是否已解锁: 是/否
- 能否看到条目: 是/否

## 🔧 可能的原因

### 原因 1: 代码未重新加载

**解决**: 
```bash
# 完全重启开发服务器
# Ctrl+C 停止
npm run tauri dev
```

### 原因 2: 没有数据库打开

**解决**: 
- 确保打开了一个数据库
- 确保数据库已解锁
- 在 VaultWorkspace 界面（能看到条目列表）

### 原因 3: useVault 返回空数组

**检查**: 
在控制台输入：
```javascript
// 这会显示当前的 vault 状态
console.log('Vaults:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);
```

### 原因 4: KDF 名称识别失败

**症状**: 
- 显示了 Encryption Algorithm
- 显示了 Key Derivation Function
- 但 KDF Name 不是 "Argon2d" 或 "Argon2id"

**解决**: 
需要查看实际的 UUID 来调整匹配逻辑

## 🎯 快速测试

### 在浏览器控制台运行：

```javascript
// 测试 1: 检查是否有 vault
const vaults = /* 需要从 React DevTools 获取 */;
console.log('Vaults count:', vaults?.length);

// 测试 2: 检查 KDF 参数
if (vaults && vaults[0]) {
    const db = vaults[0].db;
    const kdfParams = db.header.kdfParameters;
    console.log('KDF Params:', kdfParams);
    console.log('All keys:', Array.from(kdfParams.keys()));
    
    // 测试 3: 检查 UUID
    const uuid = kdfParams.get('$UUID');
    console.log('UUID:', uuid);
    console.log('UUID string:', String(uuid));
    console.log('UUID normalized:', String(uuid).toUpperCase().replace(/-/g, ''));
}
```

## 📝 临时解决方案

如果调试困难，可以先用 KeePassXC 查看参数：

1. 用 KeePassXC 打开 kpxc-test01.kdbx
2. Database → Database Settings
3. Security 标签
4. 查看 "Key derivation function" 部分

这样至少能知道实际的参数值。

## ✅ 成功的标志

当一切正常时，应该看到：

### 控制台日志
```
[Database Encryption] KDF Parameters: Map(4) {...}
[Database Encryption] All keys: ["$UUID", "I", "M", "P"]
[Database Encryption] KDF UUID: [object Uint8Array]
[Database Encryption] KDF UUID type: object
[Database Encryption] KDF UUID string: ef636ddf-8c29-444b-91f7-a9a403e30a0c
[Database Encryption] Normalized UUID: EF636DDF8C29444B91F7A9A403E30A0C
[Database Encryption] KDF Name: Argon2d
[Database Encryption] I param: 10
[Database Encryption] M param: 67108864
[Database Encryption] P param: 2
[Database Encryption] Final values: {iterations: 10, memory: 67108864, parallelism: 2}
```

### Settings 界面
```
Database Encryption
├─ Encryption Algorithm:     ChaCha20
├─ Key Derivation Function:  Argon2d
├─ Iterations:                10
├─ Memory:                    64 MB
└─ Parallelism:               2
```

## 🆘 如果还是不行

请提供：
1. 完整的控制台日志（截图或文本）
2. Settings 界面截图
3. 使用的数据库文件信息

这样我可以更准确地诊断问题。
