# Touch ID Keyring 问题诊断

## 问题总结

Touch ID 功能无法工作，因为 `keyring` 库无法从 macOS Keychain 读取已保存的密码。

## 症状

1. ✅ 密码**保存成功**
2. ❌ 检查密码时**找不到**
3. ❌ Touch ID 按钮不显示

## 日志证据

```
[Secure Storage] Storing password for path: /Users/mengdoo/Downloads/vault-test4.kdbx
[Secure Storage] Using service name: keedavault-biometric
[Secure Storage] Password stored successfully ✅

[Secure Storage] Checking if password exists for path: /Users/mengdoo/Downloads/vault-test4.kdbx
[Secure Storage] Using service name: keedavault-biometric
[Secure Storage] Entry created, attempting to get password...
[Secure Storage] Password DOES NOT EXIST ❌
[Secure Storage] Error: No matching entry found in secure storage
[Secure Storage] Error type: NoEntry
```

## 分析

- Service name: `keedavault-biometric` ✅ 一致
- Path: `/Users/mengdoo/Downloads/vault-test4.kdbx` ✅ 一致
- 保存操作: 成功 ✅
- 读取操作: 失败 ❌ `NoEntry` 错误

## 可能的原因

### 1. keyring 库版本问题
当前使用 `keyring = "3"`，这个版本在 macOS 上可能有 bug。

### 2. macOS Keychain 访问权限
应用可能没有正确的权限读取 Keychain。

### 3. keyring 库的 macOS 后端问题
keyring 库在 macOS 上使用 Security Framework，可能存在实现问题。

## 验证步骤

### 检查 Keychain Access
1. 打开 "钥匙串访问" (Keychain Access)
2. 选择 "login" 钥匙串
3. 搜索 "keedavault-biometric"
4. 查看是否有条目

**如果有条目**：说明保存成功，但读取失败（keyring 库问题）
**如果没有条目**：说明保存也失败了（权限问题）

## 临时解决方案

### 方案 1：升级 keyring 库
```toml
# Cargo.toml
keyring = "3.6"  # 使用最新版本
```

### 方案 2：使用 macOS Security Framework 直接实现
不使用 keyring 库，直接调用 macOS 的 Security Framework API。

### 方案 3：使用 tauri-plugin-keyring
使用 Tauri 官方的 keyring 插件（如果有）。

### 方案 4：禁用 Touch ID（临时）
在设置中禁用 Touch ID，使用传统的密码输入。

## 下一步调试

### 1. 检查 Keychain Access
请告诉我 Keychain Access 中是否有 "keedavault-biometric" 条目。

### 2. 尝试手动读取
在终端运行：
```bash
security find-generic-password -s "keedavault-biometric" -a "/Users/mengdoo/Downloads/vault-test4.kdbx"
```

如果成功，说明密码确实保存了，keyring 库有问题。

### 3. 检查应用权限
系统设置 → 隐私与安全性 → 完全磁盘访问权限
确保应用有必要的权限。

## 推荐的修复方案

由于这是 keyring 库的问题，我建议：

1. **短期**：禁用 Touch ID 功能，使用密码输入
2. **中期**：升级 keyring 库到最新版本
3. **长期**：实现自己的 macOS Keychain 封装，不依赖 keyring 库

## 相关文件

- `src-tauri/Cargo.toml` - keyring 依赖
- `src-tauri/src/secure_storage.rs` - Keychain 操作
- `services/biometricService.ts` - 前端接口
- `components/VaultAuthForm.tsx` - Touch ID UI

## 已知问题

keyring 库在 macOS 上的问题：
- https://github.com/hwchen/keyring-rs/issues
- 可能与 macOS 版本、Keychain 配置有关

## 测试环境

- macOS 版本：?
- keyring 版本：3
- Tauri 版本：2
