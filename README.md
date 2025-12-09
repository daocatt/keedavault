# KeedaVault

[![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/keedavault)](https://github.com/YOUR_USERNAME/keedavault/releases)
[![License](https://img.shields.io/github/license/YOUR_USERNAME/keedavault)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-10.15+-blue)](https://github.com/YOUR_USERNAME/keedavault/releases)

A secure, modern password manager for macOS with native Touch ID support.

## 📥 Download

**Latest Release**: [v0.1.0](https://github.com/YOUR_USERNAME/keedavault/releases/latest)

- **Universal Binary** (Intel & Apple Silicon): `KeedaVault_0.1.0_universal.dmg`
- **Requirements**: macOS 10.15 (Catalina) or later

📖 **[Installation Guide](INSTALLATION_CN.md)** | 🔐 **[Touch ID Setup](docs/touchid/TOUCHID_PATH_ENCODING_FIX.md)**

## ✨ Features

### 🔐 Security First
- **Touch ID Integration** - Quick unlock with biometric authentication
- **Native macOS Keychain** - Secure password storage using Security Framework
- **KeePass Compatible** - Full support for .kdbx database format
- **AES Encryption** - Industry-standard encryption

### 💻 Modern Experience
- **Clean UI** - Intuitive interface with dark mode support
- **Drag & Drop** - Organize entries and groups effortlessly
- **Smart Search** - Quickly find what you need
- **Password Generator** - Create strong, unique passwords

### 🚀 Performance
- **Native Speed** - Built with Rust and Tauri
- **Universal Binary** - Optimized for both Intel and Apple Silicon
- **Low Memory** - Efficient resource usage

Built with a modern tech stack, KeedaVault provides a fast and responsive user experience.

## Getting Started

### Prerequisites

- Node.js
- Rust

### Local Development

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/keedavault.git
    cd keedavault
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the app in development mode:
    ```bash
    npm run dev
    ```
    This will start the Vite development server for the frontend and the Tauri application.

## Build

To build the application for your platform, run the following command:

```bash
npm run tauri build
```

The build artifacts will be located in `src-tauri/target/release/`.

## Tech Stack

-   **Frontend**:
    -   React
    -   TypeScript
    -   Vite
    -   Tailwind CSS
-   **Backend**:
    -   Rust
    -   Tauri
-   **Password Management**:
    -   kdbxweb
-   **AI Features**:
    -   Google Gemini

## Developers

This project is developed and maintained by a team of AI assistants:

-   **gemini3**: Lead Developer
-   **Claude Sonnet4.5**: Lead Bugfixer and Developer
-   **gemini2.5pro**: Developer

Special thanks to Claude Sonnet4.5 for their excellent bug-fixing skills.
