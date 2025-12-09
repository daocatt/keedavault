# KeedaVault 安装指南

## 📥 下载

从 [GitHub Releases](https://github.com/YOUR_USERNAME/keedavault/releases) 下载最新版本：

- **KeedaVault_0.1.0_universal.dmg** - 通用版本（推荐）
  - 支持 Intel 和 Apple Silicon Mac
  - 单个文件适用于所有现代 Mac

## 💻 系统要求

- **最低版本**: macOS 10.15 (Catalina)
- **推荐版本**: macOS 11 (Big Sur) 或更高版本
- **架构**: Intel (x86_64) 或 Apple Silicon (M1/M2/M3)

## 🔧 安装步骤

### 方法 1: 标准安装（推荐）

1. **下载** DMG 文件
2. **双击** 打开 DMG
3. **拖动** KeedaVault 到 Applications 文件夹
4. **右键点击** Applications 中的 KeedaVault
5. **选择"打开"**
6. **点击"打开"** 确认安全对话框

![安装步骤](https://via.placeholder.com/600x400?text=Installation+Steps)

### 方法 2: 使用终端（高级用户）

如果你熟悉终端命令：

```bash
# 移除隔离属性
xattr -cr /Applications/KeedaVault.app

# 然后正常打开应用
open /Applications/KeedaVault.app
```

## ⚠️ 安全提示

### 为什么需要右键打开？

KeedaVault 是一个**未签名的应用**，因为：
- 不需要 Apple Developer 账号（$99/年）
- 通过 GitHub 自行分发
- 完全开源，代码可审查

macOS 会在首次打开时显示安全警告，这是正常的。

### 如何验证应用安全？

1. **检查源代码**: 所有代码都在 GitHub 上公开
2. **查看构建过程**: 查看 `docs/BUILD_MACOS.md`
3. **自己构建**: 可以从源代码自行编译

## 🔐 首次使用

### 1. 创建或打开数据库

启动 KeedaVault 后：
- **新建数据库**: 点击 "Create New Vault"
- **打开现有数据库**: 点击 "Open Vault" 选择 .kdbx 文件

### 2. 启用 Touch ID（可选）

1. 打开 **设置** (⌘,)
2. 进入 **Security** 部分
3. 启用 **"Quick Unlock (Touch ID)"**
4. 用密码解锁数据库一次
5. 下次就可以使用 Touch ID 了！👆

## 🐛 常见问题

### Q: 无法打开应用，提示"已损坏"

**A**: 这是 macOS 的安全机制。解决方法：

```bash
xattr -cr /Applications/KeedaVault.app
```

### Q: Touch ID 按钮不显示

**A**: 确保：
1. 在设置中启用了 Touch ID
2. 用密码解锁过一次数据库
3. 你的 Mac 支持 Touch ID

详见：[Touch ID 调试指南](docs/touchid/TOUCHID_PATH_ENCODING_FIX.md)

### Q: 如何卸载？

**A**: 直接将应用拖到废纸篓即可。

如需完全清理：
```bash
# 删除应用
rm -rf /Applications/KeedaVault.app

# 删除设置（可选）
rm -rf ~/Library/Application\ Support/com.bsdev.keedavault

# 删除 Keychain 条目（可选）
# 打开 Keychain Access，搜索 "keedavault-biometric" 并删除
```

## 🔄 更新

当新版本发布时：
1. 下载新的 DMG
2. 替换 Applications 中的旧版本
3. 首次打开新版本时重复"右键→打开"步骤

## 📚 更多帮助

- [完整文档](docs/README.md)
- [Touch ID 设置](docs/touchid/TOUCHID_PATH_ENCODING_FIX.md)
- [构建指南](docs/BUILD_MACOS.md)
- [GitHub Issues](https://github.com/YOUR_USERNAME/keedavault/issues)

## 🙏 支持

如果遇到问题：
1. 查看 [常见问题](#常见问题)
2. 搜索 [GitHub Issues](https://github.com/YOUR_USERNAME/keedavault/issues)
3. 提交新的 Issue

---

**开发者**: com.bsdev  
**许可证**: [Your License]  
**版本**: 0.1.0
