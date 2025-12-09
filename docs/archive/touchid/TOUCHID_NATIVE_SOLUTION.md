# Touch ID 问题总结和解决方案

## 🐛 问题

Touch ID 功能无法工作 - 密码无法保存到 macOS Keychain。

## 🔍 诊断过程

### 1. 初步症状
- Touch ID 按钮不显示
- `hasSavedPassword` 始终返回 `false`

### 2. 调试发现
通过详细的日志，发现：
- 保存密码：`[Secure Storage] Password stored successfully` ✅
- 检查密码：`[Secure Storage] Password DOES NOT EXIST` ❌

### 3. 验证 Keychain
运行命令：
```bash
security find-generic-password -s "keedavault-biometric" -a "/Users/mengdoo/Downloads/vault-test4.kdbx"
```

结果：
```
security: SecKeychainSearchCopyNext: The specified item could not be found in the keychain.
```

**结论**：密码根本没有保存到 Keychain！

## 🎯 根本原因

**keyring 库在 macOS 上有 bug**

- 使用的版本：`keyring v3.6.3`（最新版）
- `entry.set_password()` 返回 `Ok(())`，但实际上没有保存
- 这是 keyring 库在 macOS 上的已知问题

## ✅ 解决方案

### 实现原生 macOS Keychain 支持

创建了 `native_keychain.rs`，直接使用 macOS Security Framework API，完全绕过 keyring 库。

#### 新文件
- `src-tauri/src/native_keychain.rs` - 原生 Keychain 实现

#### 新命令
- `secure_store_password_native` - 保存密码
- `secure_get_password_native` - 获取密码
- `secure_delete_password_native` - 删除密码
- `secure_has_password_native` - 检查密码是否存在

#### 实现细节
使用 macOS Security Framework 的 C API：
- `SecKeychainAddGenericPassword` - 添加密码
- `SecKeychainFindGenericPassword` - 查找密码
- `SecKeychainItemDelete` - 删除密码
- `SecKeychainItemFreeContent` - 释放内存

## 📋 下一步

### 1. 更新前端代码
修改 `services/biometricService.ts` 使用新的原生命令：
```typescript
// 旧的（使用 keyring 库）
await invoke('secure_store_password', { vaultPath, password });

// 新的（使用原生 API）
await invoke('secure_store_password_native', { vaultPath, password });
```

### 2. 测试
1. 重启开发服务器
2. 打开数据库并解锁
3. 检查终端日志：`[Native Keychain] Password stored successfully`
4. 验证 Keychain：
   ```bash
   security find-generic-password -s "keedavault-biometric" -a "/path/to/database.kdbx"
   ```
5. 重新打开数据库
6. Touch ID 按钮应该显示！

### 3. 清理
测试成功后，可以：
- 移除 `keyring` 依赖（`Cargo.toml`）
- 移除 `secure_storage.rs`（旧实现）
- 只保留 `native_keychain.rs`

## 🔧 技术细节

### macOS Security Framework
```rust
extern "C" {
    fn SecKeychainAddGenericPassword(
        keychain: *const c_void,          // NULL = default keychain
        service_name_length: u32,
        service_name: *const c_char,      // "keedavault-biometric"
        account_name_length: u32,
        account_name: *const c_char,      // "/path/to/database.kdbx"
        password_length: u32,
        password_data: *const c_void,     // actual password
        item_ref: *mut *const c_void,     // output: item reference
    ) -> i32;
}
```

### 错误代码
- `0` (`ERR_SEC_SUCCESS`) - 成功
- `-25300` (`ERR_SEC_ITEM_NOT_FOUND`) - 未找到
- `-25299` (`ERR_SEC_DUPLICATE_ITEM`) - 重复项

### 保存策略
1. 先尝试查找现有项
2. 如果存在，删除它
3. 添加新项

这确保了密码总是最新的。

## 📚 相关资源

- [Apple Security Framework Documentation](https://developer.apple.com/documentation/security)
- [keyring-rs GitHub Issues](https://github.com/hwchen/keyring-rs/issues)
- macOS Keychain Services Reference

## ⚠️ 注意事项

### 安全性
- 密码存储在用户的 login keychain
- 受 macOS 系统级加密保护
- 需要 Touch ID/密码验证才能访问

### 兼容性
- 仅支持 macOS
- 其他平台需要不同的实现

### 权限
应用需要：
- Keychain 访问权限（自动授予）
- Touch ID 权限（通过 LocalAuthentication framework）

## 🎉 预期结果

实现后：
1. ✅ 密码成功保存到 Keychain
2. ✅ 可以从 Keychain 读取密码
3. ✅ Touch ID 按钮显示
4. ✅ Touch ID 解锁工作正常

## 文件清单

### 新增
- `src-tauri/src/native_keychain.rs`

### 修改
- `src-tauri/src/main.rs` - 注册新命令
- `services/biometricService.ts` - 使用新命令（待完成）

### 待移除（测试成功后）
- `src-tauri/src/secure_storage.rs`
- `Cargo.toml` 中的 `keyring = "3.6.3"`
