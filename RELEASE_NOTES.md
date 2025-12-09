# KeedaVault v0.1.0

## 🎉 First Release

KeedaVault is a secure, modern password manager built with Tauri and React, featuring native macOS Touch ID support.

## ✨ Features

### 🔐 Security
- **Touch ID Integration** - Quick unlock with biometric authentication
- **Native macOS Keychain** - Secure password storage using Security Framework
- **KeePass Compatible** - Full support for .kdbx database format
- **AES Encryption** - Industry-standard encryption for your passwords

### 💻 User Experience
- **Modern UI** - Clean, intuitive interface with dark mode support
- **Drag & Drop** - Organize entries and groups effortlessly
- **Search & Filter** - Quickly find what you need
- **Entry Management** - Create, edit, and organize password entries
- **Group Organization** - Hierarchical folder structure

### 🚀 Performance
- **Native Performance** - Built with Rust and Tauri for speed
- **Universal Binary** - Optimized for both Intel and Apple Silicon Macs
- **Low Memory Footprint** - Efficient resource usage

## 📥 Installation

### macOS Requirements
- **Minimum**: macOS 10.15 (Catalina) or later
- **Recommended**: macOS 11 (Big Sur) or later for best Touch ID experience
- **Architecture**: Universal (Intel & Apple Silicon)

### Download

Download the appropriate file for your Mac:

- **Universal Binary (Recommended)**: `KeedaVault_0.1.0_universal.dmg`
  - Works on both Intel and Apple Silicon Macs
  - Single download for all modern Macs

### First Time Installation

Since this app is not signed with an Apple Developer certificate, you'll need to:

1. **Download** the DMG file
2. **Open** the DMG and drag KeedaVault to Applications
3. **Right-click** on KeedaVault in Applications
4. **Select "Open"** from the context menu
5. **Click "Open"** in the security dialog

After the first launch, you can open it normally from Launchpad or Applications.

### Alternative: Remove Quarantine Attribute

If you're comfortable with the terminal:

```bash
xattr -cr /Applications/KeedaVault.app
```

Then you can open the app normally.

## 🔧 Setup

### First Launch

1. **Create a new database** or **open an existing .kdbx file**
2. **Set a master password** (required)
3. **Optional**: Add a key file for additional security

### Enable Touch ID

1. Open **Settings** (⌘,)
2. Navigate to **Security** section
3. Enable **"Quick Unlock (Touch ID)"**
4. Unlock your database once with your password
5. Next time, you can use Touch ID! 👆

## 📝 What's New in v0.1.0

### Touch ID Support
- ✅ Native macOS Touch ID integration
- ✅ Secure password storage in Keychain
- ✅ Base64 path encoding for reliable keychain lookups
- ✅ Works on both Intel and Apple Silicon

### Core Features
- ✅ KeePass .kdbx database support
- ✅ Entry and group management
- ✅ Drag & drop organization
- ✅ Search and filtering
- ✅ Password generator
- ✅ Dark mode support
- ✅ Import/Export functionality

### Performance
- ✅ Universal binary for optimal performance
- ✅ Native Rust backend
- ✅ Efficient memory usage

## 🐛 Known Issues

- First launch requires right-click → Open due to lack of code signing
- Some users may need to grant Keychain access on first Touch ID use

## 🔮 Roadmap

- [ ] Windows and Linux support
- [ ] Browser extension integration
- [ ] Cloud sync options
- [ ] Additional biometric methods
- [ ] Advanced password policies

## 📚 Documentation

- [Touch ID Setup Guide](https://github.com/yourusername/keedavault/blob/main/docs/touchid/TOUCHID_PATH_ENCODING_FIX.md)
- [Build Instructions](https://github.com/yourusername/keedavault/blob/main/docs/BUILD_MACOS.md)

## 🙏 Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Desktop app framework
- [React](https://react.dev/) - UI framework
- [kdbxweb](https://github.com/keeweb/kdbxweb) - KeePass database library

## 📄 License

[Your License Here]

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Note**: This is an unsigned application. macOS will show a security warning on first launch. This is normal for apps distributed outside the App Store. Follow the installation instructions above to safely open the app.
