# Multi-Platform Build with GitHub Actions

## Overview

This workflow automatically builds KeedaVault for **macOS**, **Windows**, and **Linux** using GitHub Actions.

## Supported Platforms

- ✅ **macOS (Apple Silicon)** - M1/M2/M3 Macs
- ✅ **macOS (Intel)** - Intel Macs
- ✅ **Windows (x64)** - Windows 10/11
- ✅ **Linux (x64)** - Ubuntu/Debian-based distributions

## How to Use

### Automatic Release on Tag

1. **Create and push a tag**:
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0"
   git push origin v0.2.0
   ```

2. **GitHub Actions will automatically**:
   - Build for all 4 platforms
   - Create a draft release
   - Upload all build artifacts

3. **Review and publish**:
   - Go to GitHub Releases
   - Review the draft release
   - Edit release notes if needed
   - Click "Publish release"

### Manual Trigger

You can also trigger builds manually:

1. Go to: `https://github.com/daocatt/keedavault/actions`
2. Click "Release" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## Build Artifacts

After the workflow completes, you'll have:

### macOS
- `KeedaVault_0.2.0_aarch64.dmg` - Apple Silicon (7.1 MB)
- `KeedaVault_0.2.0_x64.dmg` - Intel (7.3 MB)

### Windows
- `KeedaVault_0.2.0_x64-setup.exe` - Installer
- `KeedaVault_0.2.0_x64.msi` - MSI installer

### Linux
- `keedavault_0.2.0_amd64.deb` - Debian/Ubuntu package
- `keedavault_0.2.0_amd64.AppImage` - Universal Linux binary

## Requirements

### For the Workflow to Work

1. **GitHub Secrets**: None required (uses `GITHUB_TOKEN` automatically)
2. **Repository Settings**: 
   - Actions must be enabled
   - Workflow permissions: Read and write

### For macOS Code Signing (Optional)

To sign macOS builds, add these secrets:

- `APPLE_CERTIFICATE` - Base64 encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_SIGNING_IDENTITY` - Your signing identity
- `APPLE_ID` - Your Apple ID
- `APPLE_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Your team ID

## Workflow File

Location: `.github/workflows/release.yml`

## Build Time

Approximate build times:
- macOS (both): ~10-15 minutes
- Windows: ~8-12 minutes
- Linux: ~6-10 minutes
- **Total**: ~30-40 minutes for all platforms

## Troubleshooting

### Build Fails on Windows

**Issue**: Missing dependencies or build tools

**Solution**: The workflow automatically installs required tools. If it still fails, check:
- Rust toolchain is correctly set up
- Node.js version is compatible (20.x)

### Build Fails on Linux

**Issue**: Missing system libraries

**Solution**: The workflow installs required libraries. If issues persist:
```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev \
  libappindicator3-dev librsvg2-dev patchelf
```

### macOS Builds Not Universal

**Note**: We build separate binaries for Intel and Apple Silicon instead of universal binaries because:
- Smaller file sizes (7.1 MB vs ~14 MB)
- Faster downloads
- Better performance (native architecture)

## Testing Locally

To test the build process locally:

### macOS
```bash
npm run tauri build -- --target aarch64-apple-darwin
npm run tauri build -- --target x86_64-apple-darwin
```

### Windows (on Windows machine)
```bash
npm run tauri build
```

### Linux (on Linux machine)
```bash
npm run tauri build
```

## Next Steps

1. **Commit the workflow**:
   ```bash
   git add .github/workflows/release.yml
   git commit -m "ci: Add multi-platform release workflow"
   git push
   ```

2. **Create a release**:
   ```bash
   git tag -a v0.2.0 -m "Release v0.2.0: Touch ID Without Password Prompt"
   git push origin v0.2.0
   ```

3. **Monitor the build**:
   - Go to Actions tab on GitHub
   - Watch the workflow progress
   - Download artifacts when complete

4. **Publish the release**:
   - Go to Releases
   - Edit the draft release
   - Add release notes
   - Publish!

## Benefits

✅ **Automated**: No manual building on multiple machines
✅ **Consistent**: Same build environment every time
✅ **Fast**: Parallel builds for all platforms
✅ **Reliable**: GitHub's infrastructure
✅ **Free**: For public repositories

---

**Note**: The first build might take longer as GitHub Actions caches dependencies. Subsequent builds will be faster.
