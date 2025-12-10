# Check for Updates Feature

## Overview

Added a "Check for Updates..." menu item to the macOS App menu that checks for new releases on GitHub and notifies users when updates are available.

## Features

### Menu Integration
- Located in **App menu** under Settings
- Menu path: `App → Check for Updates...`
- Positioned between Settings and Quit

### Update Checking
- Fetches latest release from GitHub API
- Compares current version with latest release
- Skips draft and prerelease versions
- Uses semantic version comparison

### User Interface
- **Update Available**: Shows beautiful modal with:
  - Current version vs. Latest version comparison
  - Release name and notes
  - Release date
  - Download button (opens GitHub release page)
  - "Later" button to dismiss
  
- **Up to Date**: Shows simple alert confirming current version

- **Error Handling**: Shows alert if update check fails

## Implementation Details

### Backend (Rust)

**File**: `src-tauri/src/main.rs`

1. Added "check_updates" menu item to App menu
2. Added event handler that emits "check-updates" event to frontend
3. Updated `rebuild_menu_with_window_menu()` to include the menu item

### Frontend (TypeScript/React)

**File**: `services/updateService.ts`
- `checkForUpdates()`: Fetches latest release from GitHub
- `compareVersions()`: Compares semantic versions
- Returns update status and release information

**File**: `components/UpdateModal.tsx`
- Beautiful modal component to display update information
- Shows version comparison, release notes, and download button
- Opens GitHub release page in browser when download is clicked

**File**: `App.tsx`
- Listens for "check-updates" event from menu
- Calls `checkForUpdates()` service
- Shows UpdateModal if update is available
- Shows alert if already up to date or if error occurs

## Usage

1. **Check for Updates**: Click `App → Check for Updates...`
2. **If Update Available**: Modal appears with release information
3. **Download**: Click "Download" button to open GitHub release page
4. **Later**: Click "Later" to dismiss and check again later

## GitHub API

- **Endpoint**: `https://api.github.com/repos/daocatt/keedavault/releases/latest`
- **Rate Limit**: 60 requests/hour for unauthenticated requests
- **Response**: Latest non-draft, non-prerelease release

## Version Comparison

Semantic versioning (e.g., `0.1.0`, `1.2.3`):
- Compares major, minor, and patch numbers
- Strips 'v' prefix if present
- Returns true if latest > current

## Future Enhancements

Possible improvements:
- Auto-check on app startup (with user preference)
- Download and install updates automatically
- Show changelog/release notes history
- Add "Skip this version" option
- Check for updates periodically in background
- Show notification badge when update available
