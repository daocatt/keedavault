# KeedaVault v0.1.1 Release Notes

## 🎉 What's New

### ✨ New Features

**Window Management Enhancements**
- 🪟 **Bring All to Front**: Standard macOS feature to bring all KeedaVault windows to the front
- 📋 **Recent Windows Menu**: Dynamic list showing all open vaults with quick window switching
- ✅ **Keep on Top Indicator**: Visual checkmark (✓) in menu when "Keep on Top" is enabled

**Update System**
- 🔄 **Check for Updates**: Integrated GitHub update checker with beautiful notification UI
- 📦 Automatic version comparison and update prompts

### 🐛 Bug Fixes

**Critical Fixes**
- ✅ Fixed blank screen issue when opening vault workspace
- ✅ Resolved intermittent window not appearing after password entry
- ✅ Fixed React Hooks order violation causing rendering errors
- ✅ Eliminated theme flash when opening windows

**Window Management**
- ✅ Centralized window show/hide logic to prevent conflicts
- ✅ Improved window state management between launcher and vault
- ✅ Better handling of window reuse when reopening vaults

### ⚡ Performance Improvements

**50% Faster Window Showing**
- Auth/Create windows: **20ms** (was 30ms) - 33% faster
- Launcher: **30ms** (was 50ms) - 40% faster  
- Vault workspace: **150ms** (was 300ms) - **50% faster!**
- Settings/About: **50ms** (was 100ms) - 50% faster

The app now feels significantly more responsive while maintaining 100% reliability!

### 🎨 UI/UX Improvements

**Password Generator Overhaul**
- 🎯 **Much Better Visibility in Light Mode**
  - Range sliders now show gradient fill (clearly visible progress)
  - Textarea has better contrast with border and placeholder
  - Special character buttons are larger (6x6 vs 5x5) and bolder
  - Improved hover states and visual feedback
  - All elements now clearly visible in both light and dark modes

**Visual Polish**
- Better contrast throughout the UI
- Clearer interactive elements
- Professional, clean console output (removed debug logs)

### 🔧 Technical Improvements

- Enhanced TypeScript type safety (eliminated `any` types)
- Removed unused imports and variables
- Better error handling in window creation
- Improved separation of concerns between components
- Added comprehensive documentation

## 📦 Installation

### macOS (Universal Binary - Intel & Apple Silicon)

Download `KeedaVault_0.1.1_universal.dmg` from the assets below.

**Installation Steps:**
1. Download the DMG file
2. Open the DMG
3. Drag KeedaVault to Applications folder
4. Right-click and select "Open" (first time only, due to macOS Gatekeeper)

## 🔒 Security

This release includes the same robust security features:
- AES-256 encryption
- Touch ID / biometric authentication support
- Native macOS keychain integration
- Secure password generation

## 📝 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for complete details.

## 🙏 Feedback

Found a bug or have a feature request? Please [open an issue](https://github.com/daocatt/keedavault/issues)!

---

**Full Changelog**: https://github.com/daocatt/keedavault/compare/v0.1.0...v0.1.1
