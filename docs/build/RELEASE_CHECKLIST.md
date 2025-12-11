# GitHub Release Checklist - v0.1.0

## ✅ Pre-Release Checklist

### 1. Build Configuration
- [x] Bundle identifier updated to `com.bsdev.keedavault`
- [x] Apple Silicon target installed (`aarch64-apple-darwin`)
- [x] Building universal binary (Intel + Apple Silicon)
- [ ] Build completed successfully

### 2. Files to Upload
After build completes, upload these files from `src-tauri/target/release/bundle/`:

- [ ] `dmg/KeedaVault_0.1.0_universal.dmg` - **Main download** (Universal Binary)
- [ ] Optional: `macos/KeedaVault.app.tar.gz` - App bundle archive

### 3. Release Information
- **Version**: v0.1.0
- **Tag**: v0.1.0
- **Title**: KeedaVault v0.1.0 - First Release
- **Developer**: com.bsdev
- **Target**: macOS 10.15+ (Universal Binary)

### 4. Release Notes
- [x] Created `RELEASE_NOTES.md` with:
  - Features list
  - Installation instructions for unsigned app
  - Touch ID setup guide
  - Known issues
  - Roadmap

### 5. Documentation
- [x] Touch ID documentation
- [x] Build instructions
- [x] Daily work log
- [x] Organized docs structure

## 📦 Build Output Verification

After build completes, verify:

```bash
# Check build output
ls -lh src-tauri/target/release/bundle/dmg/

# Verify universal binary
lipo -info src-tauri/target/release/bundle/macos/KeedaVault.app/Contents/MacOS/KeedaVault

# Expected output:
# Architectures in the fat file: ... are: x86_64 arm64
```

## 🚀 GitHub Release Steps

### Step 1: Create Git Tag
```bash
git tag -a v0.1.0 -m "Release v0.1.0 - First public release with Touch ID support"
git push origin v0.1.0
```

### Step 2: Create GitHub Release
1. Go to: https://github.com/YOUR_USERNAME/keedavault/releases/new
2. **Tag**: Select `v0.1.0`
3. **Title**: `KeedaVault v0.1.0 - First Release`
4. **Description**: Copy content from `RELEASE_NOTES.md`
5. **Attach files**:
   - Upload `KeedaVault_0.1.0_universal.dmg`
6. **Mark as**: Latest release
7. Click **Publish release**

### Step 3: Post-Release
- [ ] Test download link
- [ ] Verify DMG opens correctly
- [ ] Test installation on clean Mac (if possible)
- [ ] Update README.md with download badge

## 📝 Release Description Template

```markdown
# 🎉 KeedaVault v0.1.0 - First Release

A secure, modern password manager for macOS with native Touch ID support.

## 📥 Download

**Universal Binary** (Intel & Apple Silicon):
- [KeedaVault_0.1.0_universal.dmg](link-will-be-auto-generated)

**Requirements**: macOS 10.15 (Catalina) or later

## 🔐 Installation

⚠️ **Important**: This app is unsigned. On first launch:
1. Right-click the app → Select "Open"
2. Click "Open" in the security dialog

Or remove quarantine:
```bash
xattr -cr /Applications/KeedaVault.app
```

## ✨ Features

- 🔐 Touch ID integration for quick unlock
- 💾 KeePass .kdbx database support
- 🎨 Modern UI with dark mode
- 🚀 Universal binary (optimized for all Macs)
- 🔒 Secure password storage in macOS Keychain

## 📚 Documentation

- [Touch ID Setup](https://github.com/YOUR_USERNAME/keedavault/blob/main/docs/touchid/TOUCHID_PATH_ENCODING_FIX.md)
- [Build Guide](https://github.com/YOUR_USERNAME/keedavault/blob/main/docs/BUILD_MACOS.md)

## 🐛 Known Issues

- First launch requires right-click → Open (unsigned app)
- May need to grant Keychain access on first Touch ID use

## 🙏 Acknowledgments

Built with Tauri, React, and ❤️

---

**Full changelog**: See [RELEASE_NOTES.md](link)
```

## 🔍 Testing Checklist

Before publishing, test on a clean Mac (if possible):
- [ ] Download DMG
- [ ] Install app
- [ ] Create new database
- [ ] Enable Touch ID
- [ ] Test Touch ID unlock
- [ ] Test password management features

## 📊 Build Information

- **Build Command**: `npm run tauri build -- --target universal-apple-darwin`
- **Bundle ID**: `com.bsdev.keedavault`
- **Version**: 0.1.0
- **Architectures**: x86_64, arm64 (Universal)
- **Min macOS**: 10.15 (Catalina)

## 🎯 Next Steps After Release

1. Monitor GitHub Issues for bug reports
2. Collect user feedback
3. Plan v0.2.0 features
4. Consider code signing for future releases (optional)

---

**Status**: ⏳ Waiting for build to complete...
