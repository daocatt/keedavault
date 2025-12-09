# Touch ID / Face ID Implementation

## Overview
Successfully implemented native macOS biometric authentication (Touch ID / Face ID) using the LocalAuthentication framework.

## Implementation Details

### Backend (Rust)

#### Dependencies Added (`Cargo.toml`)
```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc = "0.2"
block = "0.1"
cocoa = "0.25"
objc-foundation = "0.1"
```

These crates provide safe Rust bindings to Objective-C and macOS frameworks.

#### Build Configuration (`build.rs`)
```rust
#[cfg(target_os = "macos")]
{
  println!("cargo:rustc-link-lib=framework=LocalAuthentication");
  println!("cargo:rustc-link-lib=framework=Foundation");
}
```

Links the LocalAuthentication and Foundation frameworks on macOS.

#### Biometric Module (`src/biometric.rs`)

**Key Functions:**

1. **`check_biometric_available()`**
   - Creates an `LAContext` instance
   - Calls `canEvaluatePolicy:error:` with `LAPolicyDeviceOwnerAuthenticationWithBiometrics` (policy = 2)
   - Returns `true` if Touch ID/Face ID is available and configured
   - Returns `false` if not available or on non-macOS platforms

2. **`authenticate_biometric(reason: String)`**
   - Creates an `LAContext` instance
   - Calls `evaluatePolicy:localizedReason:reply:` with:
     - Policy: `LAPolicyDeviceOwnerAuthenticationWithBiometrics`
     - Reason: User-provided string (e.g., "Unlock database")
     - Reply block: Async callback that receives success/error
   - Uses Rust channels to convert async Objective-C callback to synchronous result
   - 60-second timeout for user interaction
   - Returns `Ok(true)` on successful authentication
   - Returns `Err(message)` with localized error description on failure

**Technical Details:**
- Uses `objc` crate's `msg_send!` macro for Objective-C method calls
- Uses `block` crate's `ConcreteBlock` for creating Objective-C blocks
- Properly handles memory management with `release` calls
- Converts NSString error descriptions to Rust strings safely

### Frontend (TypeScript)

#### Biometric Service (`services/biometricService.ts`)

**API Methods:**

1. **`isAvailable(): Promise<boolean>`**
   - Checks if biometric authentication is available
   - Calls Rust `check_biometric_available` command

2. **`authenticate(reason: string): Promise<boolean>`**
   - Triggers biometric authentication prompt
   - Calls Rust `authenticate_biometric` command
   - Returns `true` if authenticated, `false` otherwise

3. **`storePassword(vaultPath: string, password: string): Promise<void>`**
   - Stores password in macOS Keychain
   - Uses `secure_store_password` command
   - Password is encrypted by macOS Keychain

4. **`getPassword(vaultPath: string): Promise<string | null>`**
   - Retrieves stored password from Keychain
   - Uses `secure_get_password` command
   - Returns `null` if no password stored

5. **`hasStoredPassword(vaultPath: string): Promise<boolean>`**
   - Checks if a password is stored for a vault
   - Uses `secure_has_password` command

6. **`removePassword(vaultPath: string): Promise<void>`**
   - Removes stored password from Keychain
   - Uses `secure_delete_password` command

#### UI Integration (`components/VaultAuthForm.tsx`)

**Features:**

1. **Availability Check**
   - Checks biometric availability on component mount
   - Checks if Touch ID is enabled in settings
   - Checks if password is stored for current vault

2. **Touch ID Button**
   - Only shown when:
     - Biometric is available
     - Touch ID is enabled in settings
     - Password is stored for the vault
     - Vault path is available
   - Displays "Unlock with Touch ID" with fingerprint icon

3. **Authentication Flow**
   ```
   User clicks "Unlock with Touch ID"
   ↓
   Prompt biometric authentication
   ↓
   If successful → Retrieve stored password
   ↓
   Unlock vault with retrieved password
   ↓
   Success callback
   ```

4. **Password Storage**
   - After successful password unlock
   - If Touch ID is enabled in settings
   - Automatically stores password in Keychain
   - Silent failure if storage fails (logged to console)

### Settings Integration

**Location:** Settings → Security → Advanced

**Toggle:** "Quick Unlock (Touch ID)"
- Enables/disables Touch ID functionality
- Stored in UI settings under `security.quickUnlockTouchId`
- Default: `false` (disabled)

## Security Considerations

### Password Storage
- Passwords are stored in macOS Keychain
- Encrypted by the operating system
- Tied to the app's bundle identifier
- Requires biometric authentication to retrieve

### Authentication Policy
- Uses `LAPolicyDeviceOwnerAuthenticationWithBiometrics`
- Requires Touch ID or Face ID (not just passcode)
- Fallback to passcode is NOT allowed
- Each authentication is a separate prompt

### Error Handling
- Authentication errors are properly caught and displayed
- Timeout after 60 seconds of inactivity
- Graceful degradation if biometric not available
- Clear error messages to user

## User Experience

### First-Time Setup
1. User unlocks vault with password
2. If Touch ID is enabled in settings, password is automatically saved
3. Next time, "Unlock with Touch ID" button appears

### Touch ID Unlock Flow
1. User clicks "Unlock with Touch ID" button
2. macOS shows biometric prompt with custom reason
3. User authenticates with Touch ID/Face ID
4. Vault unlocks automatically

### Error States
- **No biometric hardware**: Button doesn't appear
- **Touch ID disabled**: Button doesn't appear
- **No saved password**: Button doesn't appear
- **Authentication failed**: Error message shown
- **Authentication cancelled**: Error message shown
- **Timeout**: Error message shown

## Testing Checklist

- [ ] **Availability Check**
  - [ ] Returns `true` on Mac with Touch ID
  - [ ] Returns `true` on Mac with Face ID
  - [ ] Returns `false` on Mac without biometric
  - [ ] Returns `false` on non-Mac platforms

- [ ] **Authentication**
  - [ ] Shows macOS biometric prompt
  - [ ] Succeeds with correct biometric
  - [ ] Fails with incorrect biometric
  - [ ] Handles cancellation gracefully
  - [ ] Times out after 60 seconds

- [ ] **Password Storage**
  - [ ] Stores password after successful unlock
  - [ ] Retrieves password for Touch ID unlock
  - [ ] Handles missing password gracefully
  - [ ] Removes password when requested

- [ ] **UI Integration**
  - [ ] Button appears when conditions met
  - [ ] Button hidden when Touch ID disabled
  - [ ] Button hidden when no saved password
  - [ ] Error messages display correctly
  - [ ] Unlock succeeds with Touch ID

- [ ] **Settings**
  - [ ] Toggle enables/disables Touch ID
  - [ ] Setting persists across restarts
  - [ ] Changes take effect immediately

## Known Limitations

1. **macOS Only**: Touch ID only works on macOS (by design)
2. **No Passcode Fallback**: Uses biometric-only policy (more secure)
3. **Per-Vault Storage**: Each vault stores its password separately
4. **No Master Password**: Touch ID doesn't replace master password, just stores it

## Future Enhancements

1. **Windows Hello**: Add support for Windows biometric authentication
2. **Linux Support**: Investigate fingerprint reader support on Linux
3. **Biometric Settings**: More granular control over biometric behavior
4. **Auto-lock Integration**: Lock vault when biometric fails multiple times
5. **Keychain Sync**: Investigate iCloud Keychain sync for passwords

## Troubleshooting

### "Touch ID not available"
- Check if Mac has Touch ID hardware
- Ensure Touch ID is configured in System Preferences
- Verify at least one fingerprint is enrolled

### "Authentication failed"
- User may have cancelled the prompt
- Biometric didn't match
- Too many failed attempts (system lockout)

### "No saved password found"
- User hasn't unlocked with password yet
- Touch ID was disabled when password was entered
- Keychain entry was manually deleted

### Build Errors
- Ensure macOS SDK is installed
- Check that LocalAuthentication framework is available
- Verify objc crates are properly installed

## Files Modified

1. `/src-tauri/Cargo.toml` - Added objc dependencies
2. `/src-tauri/build.rs` - Added framework linking
3. `/src-tauri/src/biometric.rs` - Implemented Touch ID
4. `/services/biometricService.ts` - Frontend service (already existed)
5. `/components/VaultAuthForm.tsx` - UI integration (already existed)

## References

- [Apple LocalAuthentication Documentation](https://developer.apple.com/documentation/localauthentication)
- [objc Rust Crate](https://docs.rs/objc/)
- [block Rust Crate](https://docs.rs/block/)
- [macOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
