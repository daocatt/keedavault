# Release v0.2.1: Multi-Platform Build

## 📦 What's New

This is a **build infrastructure update** with no new features.

### Changes

- ✅ **Multi-platform builds** via GitHub Actions
- ✅ **Windows support** - Now available for Windows 10/11
- ✅ **Linux support** - Debian/Ubuntu packages and AppImage
- ✅ **Automated releases** - Consistent builds across all platforms

### Available Downloads

**macOS**
- `KeedaVault_0.2.1_aarch64.dmg` - Apple Silicon (M1/M2/M3)
- `KeedaVault_0.2.1_x64.dmg` - Intel Macs

**Windows**
- `KeedaVault_0.2.1_x64-setup.exe` - Installer
- `KeedaVault_0.2.1_x64.msi` - MSI Installer

**Linux**
- `keedavault_0.2.1_amd64.deb` - Debian/Ubuntu
- `keedavault_0.2.1_amd64.AppImage` - Universal Linux

### Features (from v0.2.0)

All features from v0.2.0 are included:
- ✅ Touch ID without macOS password prompt
- ✅ Modern SecItemAdd API with SecAccessControl
- ✅ Seamless biometric authentication

### Technical Details

- Built using GitHub Actions for consistency
- All platforms built from the same source code
- Automated release process

### Requirements

- **macOS**: 12.0 (Monterey) or later
- **Windows**: Windows 10/11 (64-bit)
- **Linux**: Ubuntu 20.04+ or compatible

---

**Full Changelog**: https://github.com/daocatt/keedavault/compare/v0.2.0...v0.2.1
