# Touch ID 路径编码修复

## 问题描述

在之前的实现中，Touch ID 功能存在以下问题：
- 密码可以正常保存
- 但二次打开数据库时，Touch ID 按钮不显示
- 原因是路径的解析和读取不一致

## 根本原因

macOS Keychain 使用 `account` 参数（在我们的代码中是 `vault_path`）作为唯一标识符来存储和检索密码。如果保存时使用的路径和检索时使用的路径**不完全一致**，就无法找到对应的密码。

可能导致不一致的情况：
1. 路径中包含引号（`"/Users/user/test.kdbx"` vs `/Users/user/test.kdbx`）
2. 路径中包含空格或特殊字符
3. 相对路径 vs 绝对路径
4. 路径分隔符不一致（`/` vs `\`）

## 解决方案：路径 Base64 编码

### 实现方式

在 `services/biometricService.ts` 中添加了 `encodeVaultPath()` 函数：

```typescript
function encodeVaultPath(vaultPath: string): string {
    // 1. 移除首尾的引号（如果存在）
    let normalizedPath = vaultPath.trim();
    if (normalizedPath.startsWith('"') && normalizedPath.endsWith('"')) {
        normalizedPath = normalizedPath.slice(1, -1);
    }
    
    // 2. 编码为 Base64
    const encoded = btoa(normalizedPath);
    console.log(`[BiometricService] Path encoding: "${vaultPath}" → "${encoded}"`);
    return encoded;
}
```

### 优势

✅ **避免特殊字符问题**：Base64 只包含字母、数字和少量符号  
✅ **保证一致性**：相同的路径总是生成相同的 Base64 字符串  
✅ **自动处理引号**：在编码前自动移除引号  
✅ **简化代码**：不需要在多处进行路径标准化  

### 修改的文件

1. **`services/biometricService.ts`**
   - 添加 `encodeVaultPath()` 函数
   - 在所有 keychain 操作前对路径进行编码：
     - `storePassword()`
     - `getPassword()`
     - `removePassword()`
     - `hasStoredPassword()`

2. **`components/VaultAuthForm.tsx`**
   - 移除了冗余的路径标准化代码
   - 现在直接使用原始路径，由 `biometricService` 统一处理

## 测试步骤

### 1. 清除旧的 Keychain 数据

如果你之前保存过密码，需要先清除：

```bash
# 打开 Keychain Access 应用
open "/Applications/Utilities/Keychain Access.app"

# 搜索 "keedavault-biometric"
# 删除所有相关的条目
```

或者在浏览器控制台运行：

```javascript
const { invoke } = window.__TAURI__.core;
const path = '/Users/mengdoo/Documents/test.kdbx'; // 替换为你的路径
await invoke('secure_delete_password', { vaultPath: path });
```

### 2. 测试保存和检索

1. **启用 Touch ID**
   - 打开 Settings
   - 启用 "Quick Unlock (Touch ID)"

2. **首次解锁**
   - 打开数据库
   - 输入密码
   - 点击 "Unlock Vault"
   - 查看控制台输出：
     ```
     [BiometricService] Path encoding: "/Users/user/test.kdbx" → "L1VzZXJzL3VzZXIvdGVzdC5rZGJ4"
     🔐 Saving password to Keychain for path: /Users/user/test.kdbx
     [Secure Storage] Storing password for path: L1VzZXJzL3VzZXIvdGVzdC5rZGJ4
     ✅ Password saved successfully!
     ```

3. **二次打开**
   - 关闭数据库
   - 重新打开数据库
   - 查看控制台输出：
     ```
     [BiometricService] Path encoding: "/Users/user/test.kdbx" → "L1VzZXJzL3VzZXIvdGVzdC5rZGJ4"
     Touch ID Debug - Has saved password for /Users/user/test.kdbx : true
     Touch ID Debug - Button will show: true
     ```
   - **应该看到 Touch ID 按钮**

4. **使用 Touch ID 解锁**
   - 点击 "Unlock with Touch ID"
   - 验证指纹
   - 应该成功解锁

## 验证编码一致性

在浏览器控制台运行：

```javascript
// 测试不同格式的路径是否生成相同的编码
const path1 = '/Users/user/test.kdbx';
const path2 = '"/Users/user/test.kdbx"';  // 带引号

console.log('Path 1:', path1);
console.log('Encoded 1:', btoa(path1));

const normalized = path2.slice(1, -1);  // 移除引号
console.log('Path 2:', path2);
console.log('Normalized 2:', normalized);
console.log('Encoded 2:', btoa(normalized));

console.log('Match:', btoa(path1) === btoa(normalized));  // 应该是 true
```

## 调试日志

现在所有的 keychain 操作都会输出编码信息：

```
[BiometricService] Path encoding: "原始路径" → "Base64编码"
```

这样可以很容易地验证：
1. 保存时使用的编码
2. 检索时使用的编码
3. 两者是否一致

## 注意事项

⚠️ **重要**：这个修改会导致之前保存的密码无法访问，因为：
- 旧版本：使用原始路径作为 account
- 新版本：使用 Base64 编码的路径作为 account

**解决方法**：
1. 删除旧的 Keychain 条目
2. 重新用密码解锁一次
3. 密码会用新的编码格式保存

## 未来改进

如果需要支持从旧版本迁移，可以：
1. 先尝试用编码路径检索
2. 如果失败，尝试用原始路径检索
3. 如果用原始路径找到了，自动迁移到编码格式

```typescript
async hasStoredPassword(vaultPath: string): Promise<boolean> {
    const encodedPath = encodeVaultPath(vaultPath);
    
    // 先尝试新格式
    let has = await invoke<boolean>('secure_has_password', { vaultPath: encodedPath });
    
    // 如果没找到，尝试旧格式（兼容性）
    if (!has) {
        has = await invoke<boolean>('secure_has_password', { vaultPath });
        if (has) {
            // 迁移到新格式
            const password = await invoke<string>('secure_get_password', { vaultPath });
            await invoke('secure_store_password', { vaultPath: encodedPath, password });
            await invoke('secure_delete_password', { vaultPath });
        }
    }
    
    return has;
}
```
