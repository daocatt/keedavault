# Migration Guide: Deprecated to Modern Keychain API

## Overview

This guide explains how to migrate from the deprecated `SecKeychainAddGenericPassword` API to the modern `SecItemAdd` with `SecAccessControl` API.

## Why Migrate?

### Current Issue (Deprecated API)
- ✅ Uses `SecKeychainAddGenericPassword`
- ❌ **Prompts for macOS password** when saving passwords
- ❌ User experience is poor (unexpected password prompt)
- ❌ Not how other password managers work

### After Migration (Modern API)
- ✅ Uses `SecItemAdd` with `SecAccessControl`
- ✅ **NO password prompt** when saving passwords
- ✅ Biometric authentication only when retrieving
- ✅ Matches behavior of Strongbox, KeePassXC, KeePassium

## Migration Steps

### Step 1: Update Frontend Code

Replace `biometricService` with `modernBiometricService` in your components:

```typescript
// Before (deprecated)
import { biometricService } from '../services/biometricService';

// After (modern)
import { modernBiometricService } from '../services/modernBiometricService';
```

### Step 2: Update Function Calls

The API is identical, so you just need to change the service name:

```typescript
// Before
await biometricService.storePassword(vaultPath, password);
await biometricService.getPassword(vaultPath);
await biometricService.removePassword(vaultPath);
await biometricService.hasStoredPassword(vaultPath);

// After
await modernBiometricService.storePassword(vaultPath, password);
await modernBiometricService.getPassword(vaultPath);
await modernBiometricService.removePassword(vaultPath);
await modernBiometricService.hasStoredPassword(vaultPath);
```

### Step 3: Test the Migration

1. **Build the app** with code signing:
   ```bash
   npm run tauri build
   ```

2. **Test Touch ID save** (should NOT prompt for password):
   - Open a database
   - Enable "Quick Unlock with Touch ID"
   - Unlock the database
   - ✅ Password should be saved WITHOUT macOS password prompt

3. **Test Touch ID unlock** (should prompt for biometric):
   - Close the database
   - Click the Touch ID button
   - ✅ Should show Touch ID prompt
   - ✅ Database should unlock after authentication

### Step 4: Clean Up Old Keychain Entries (Optional)

Users who previously used the deprecated API will have old keychain entries. You can provide a migration utility:

```typescript
async function migrateToModernKeychain(vaultPath: string) {
    try {
        // Try to get password from old keychain
        const oldPassword = await biometricService.getPassword(vaultPath);
        
        if (oldPassword) {
            // Store in new keychain (no password prompt!)
            await modernBiometricService.storePassword(vaultPath, oldPassword);
            
            // Remove from old keychain
            await biometricService.removePassword(vaultPath);
            
            console.log('Successfully migrated to modern keychain');
        }
    } catch (error) {
        console.error('Migration failed:', error);
    }
}
```

## Files to Update

### Frontend (TypeScript)
- ✅ `services/modernBiometricService.ts` - Created
- ⏳ `components/VaultAuthForm.tsx` - Update to use modern service
- ⏳ `components/SettingsWindow.tsx` - Update if needed

### Backend (Rust)
- ✅ `src-tauri/src/native_keychain_modern.rs` - Created
- ✅ `src-tauri/src/main.rs` - Commands registered

## Backward Compatibility

### Option 1: Hard Switch (Recommended)
Simply replace all uses of `biometricService` with `modernBiometricService`. Old keychain entries will remain but won't be used.

### Option 2: Automatic Migration
Detect old entries and automatically migrate them:

```typescript
async function ensureModernKeychain(vaultPath: string, password: string) {
    // Check if modern keychain has the password
    const hasModern = await modernBiometricService.hasStoredPassword(vaultPath);
    
    if (!hasModern) {
        // Try to migrate from old keychain
        const oldPassword = await biometricService.getPassword(vaultPath);
        
        if (oldPassword) {
            // Migrate to modern
            await modernBiometricService.storePassword(vaultPath, oldPassword);
            await biometricService.removePassword(vaultPath);
        } else {
            // No old entry, just save to modern
            await modernBiometricService.storePassword(vaultPath, password);
        }
    }
}
```

### Option 3: Fallback Chain
Try modern first, fall back to deprecated:

```typescript
async function getPasswordWithFallback(vaultPath: string): Promise<string | null> {
    // Try modern first
    let password = await modernBiometricService.getPassword(vaultPath);
    
    if (!password) {
        // Fall back to deprecated
        password = await biometricService.getPassword(vaultPath);
        
        if (password) {
            // Migrate to modern
            await modernBiometricService.storePassword(vaultPath, password);
            await biometricService.removePassword(vaultPath);
        }
    }
    
    return password;
}
```

## Testing Checklist

- [ ] Build app with code signing
- [ ] Test Touch ID save (no password prompt)
- [ ] Test Touch ID unlock (biometric prompt)
- [ ] Test with no biometric enrolled (graceful fallback)
- [ ] Test with multiple databases
- [ ] Test migration from old keychain entries
- [ ] Test on macOS 12+
- [ ] Test on macOS 13+
- [ ] Test on macOS 14+

## Troubleshooting

### Error: "Failed to create access control"
- **Cause**: App is not code-signed
- **Solution**: Build with `npm run tauri build` or sign the dev build

### Error: "errSecMissingEntitlement (-34018)"
- **Cause**: Missing keychain entitlements
- **Solution**: Check `entitlements.plist` has `keychain-access-groups`

### Still prompting for password
- **Cause**: Still using old `biometricService`
- **Solution**: Replace with `modernBiometricService`

### Biometric prompt not showing
- **Cause**: Using `kSecUseAuthenticationUISkip` when retrieving
- **Solution**: Only use skip flag when storing, not retrieving

## Rollback Plan

If you need to rollback:

1. Revert to using `biometricService`
2. Old keychain entries are still there
3. No data loss

## Timeline

- **Phase 1** (Current): Modern API implemented, both APIs available
- **Phase 2** (Next release): Switch to modern API by default
- **Phase 3** (Future): Deprecate old API, remove deprecated code

## References

- [Apple: SecItemAdd](https://developer.apple.com/documentation/security/1401659-secitemadd)
- [Apple: SecAccessControl](https://developer.apple.com/documentation/security/secaccesscontrol)
- [Technical Analysis](./TOUCHID_NO_PASSWORD_PROMPT.md)
