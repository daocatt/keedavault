# Changelog

All notable changes to KeedaVault will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-12-11

### Added
- **Window Menu - Bring All to Front**: Standard macOS feature to bring all app windows to front
- **Window Menu - Recent Windows**: Dynamic list of open vaults with quick window switching
- **Check for Updates**: GitHub integration with beautiful update notification UI
- **Keep on Top Checkmark**: Visual feedback (✓) in menu when "Keep on Top" is enabled

### Fixed
- **Vault Workspace Display**: Fixed blank screen issue when opening vaults
- **Window Showing**: Resolved intermittent window not appearing after unlock
- **React Hooks Order**: Fixed hooks violation that caused rendering errors
- **Window Management**: Centralized window show/hide logic to prevent conflicts
- **Flash Issue**: Eliminated theme flash when opening windows

### Improved
- **Performance**: Optimized window showing delays (50% faster for vault workspace)
  - Auth/Create: 20ms (was 30ms)
  - Launcher: 30ms (was 50ms)
  - Vault: 150ms (was 300ms)
- **Password Generator UI**: Significantly improved visibility in light mode
  - Better contrast for range sliders with gradient fill
  - Clearer textarea with border and placeholder
  - Larger, bolder special character buttons (easier to see and click)
  - Improved hover states and visual feedback
- **TypeScript Type Safety**: Eliminated unnecessary `any` types in components
- **Console Output**: Removed debug logs for cleaner, professional output

### Technical
- Added `IsMenuItem` trait import for menu checkmark functionality
- Removed unused imports and variables (cleaner codebase)
- Improved error handling in window creation
- Better separation of concerns between components

## [0.1.0] - 2025-12-10

### Added
- Initial release
- KeePass database support (KDBX format)
- Touch ID / biometric authentication
- Password generator with multiple modes
- Drag and drop entry management
- Smart views (Websites, 2FA, Notes, Duplicates, Weak passwords)
- Dark mode support
- Native macOS integration
