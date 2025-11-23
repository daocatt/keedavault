# KeeDaVault

A secure and intelligent password manager.

KeeDaVault is a desktop password manager application that helps you securely store and manage your passwords. It uses the KeePass `kdbx` file format, ensuring compatibility with other KeePass clients.

Built with a modern tech stack, KeeDaVault provides a fast and responsive user experience. It also integrates AI features to help you with your password management.

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