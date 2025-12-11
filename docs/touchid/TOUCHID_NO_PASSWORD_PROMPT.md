# Touch ID Without Password Prompt - Technical Analysis

## Problem Statement

When enabling Touch ID in KeedaVault, the app currently asks users to enter their macOS password. However, other password managers like **Strongbox**, **KeePassXC**, and **KeePassium** do NOT require this password prompt.

## Root Cause

Our current implementation uses the **deprecated** `SecKeychainAddGenericPassword` API, which always prompts for the macOS keychain password when adding items.

### Current Implementation (Deprecated API)

```rust
// src-tauri/src/native_keychain.rs
fn SecKeychainAddGenericPassword(
    keychain: *const c_void,  // NULL = default keychain
    service_name_length: u32,
    service_name: *const c_char,
    account_name_length: u32,
    account_name: *const c_char,
    password_length: u32,
    password_data: *const c_void,
    item_ref: *mut *const c_void,
) -> i32;
```

**Why it prompts for password:**
- When `keychain` parameter is `NULL` (default keychain)
- The default keychain is protected by the user's macOS login password
- macOS requires authentication to modify the default keychain
- This is a security feature of the deprecated API

## Solution: Modern Keychain Services API

### Use `SecItemAdd` with `SecAccessControl`

The modern approach uses:
1. **`SecAccessControlCreateWithFlags`** - Create access control with biometric flags
2. **`SecItemAdd`** - Add item with the access control object

### Key Components

#### 1. SecAccessControl Flags

```rust
// Access control flags for biometric authentication
kSecAccessControlBiometryAny              // Any enrolled biometric (Touch ID/Face ID)
kSecAccessControlBiometryCurrentSet       // Only currently enrolled biometrics
kSecAccessControlUserPresence             // Biometric OR device passcode
```

#### 2. Accessibility Constants

```rust
// When the item can be accessed
kSecAttrAccessibleWhenUnlockedThisDeviceOnly  // Only when device unlocked, not synced
kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly  // Requires device passcode to be set
```

### Implementation Flow

```
1. Create SecAccessControl object
   ↓
   SecAccessControlCreateWithFlags(
       allocator: kCFAllocatorDefault,
       protection: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
       flags: kSecAccessControlBiometryAny,
       error: &mut error
   )

2. Build query dictionary
   ↓
   {
       kSecClass: kSecClassGenericPassword,
       kSecAttrService: "keedavault-biometric",
       kSecAttrAccount: <vault_path>,
       kSecValueData: <password>,
       kSecAttrAccessControl: <access_control_ref>,  // ← Key difference!
       kSecUseAuthenticationUI: kSecUseAuthenticationUISkip  // No UI during save
   }

3. Add to keychain
   ↓
   SecItemAdd(query, NULL)
```

### Why This Doesn't Prompt for Password

1. **No keychain modification authentication needed**
   - `SecItemAdd` doesn't require keychain password to add items
   - The access control is applied to the **item itself**, not the keychain

2. **Biometric protection is deferred**
   - Protection is enforced when **retrieving** the item
   - When saving, no authentication is needed

3. **Item-level security**
   - Each item has its own `SecAccessControl`
   - The item is protected by biometric authentication
   - The keychain itself doesn't need to be unlocked with a password

## Comparison: Deprecated vs Modern API

| Aspect | Deprecated API | Modern API |
|--------|---------------|------------|
| **Function** | `SecKeychainAddGenericPassword` | `SecItemAdd` |
| **Password Prompt** | ✅ Yes (macOS password) | ❌ No |
| **Biometric Control** | ❌ No (only via keychain ACL) | ✅ Yes (per-item `SecAccessControl`) |
| **When Protected** | Keychain-level | Item-level |
| **Authentication** | When modifying keychain | When retrieving item |
| **Flexibility** | Limited | High (fine-grained control) |

## How Other Apps Handle This

### Strongbox
- Uses `SecItemAdd` with `kSecAccessControlBiometryAny`
- No password prompt when enabling Touch ID
- Biometric authentication only when unlocking database

### KeePassXC
- Uses modern Keychain Services API
- Stores master password with biometric protection
- No macOS password required

### KeePassium
- iOS/macOS app using `SecItemAdd`
- Leverages `kSecAccessControlUserPresence`
- Seamless biometric integration

## Implementation Requirements

### 1. Required Entitlements

```xml
<!-- entitlements.plist -->
<key>keychain-access-groups</key>
<array>
    <string>$(AppIdentifierPrefix)com.keedavault.app</string>
</array>
```

### 2. Code Signing

- App **must be code-signed** to use biometric features
- Unsigned apps will get `errSecMissingEntitlement` (-34018)

### 3. Info.plist (for Face ID)

```xml
<key>NSFaceIDUsageDescription</key>
<string>KeedaVault uses Face ID to securely unlock your password database.</string>
```

## Rust FFI Implementation

### Required Crates

```toml
[dependencies]
core-foundation = "0.9"
core-foundation-sys = "0.8"
security-framework = "2.9"
security-framework-sys = "2.9"
```

### Key Functions to Implement

```rust
extern "C" {
    // Create access control with biometric flags
    fn SecAccessControlCreateWithFlags(
        allocator: CFAllocatorRef,
        protection: CFTypeRef,
        flags: SecAccessControlCreateFlags,
        error: *mut CFErrorRef,
    ) -> SecAccessControlRef;
    
    // Add item to keychain
    fn SecItemAdd(
        attributes: CFDictionaryRef,
        result: *mut CFTypeRef,
    ) -> OSStatus;
    
    // Find item in keychain
    fn SecItemCopyMatching(
        query: CFDictionaryRef,
        result: *mut CFTypeRef,
    ) -> OSStatus;
    
    // Delete item from keychain
    fn SecItemDelete(
        query: CFDictionaryRef,
    ) -> OSStatus;
}
```

### Access Control Flags

```rust
type SecAccessControlCreateFlags = CFOptionFlags;

const kSecAccessControlUserPresence: SecAccessControlCreateFlags = 1 << 0;
const kSecAccessControlBiometryAny: SecAccessControlCreateFlags = 1 << 1;
const kSecAccessControlBiometryCurrentSet: SecAccessControlCreateFlags = 1 << 3;
const kSecAccessControlDevicePasscode: SecAccessControlCreateFlags = 1 << 4;
```

## Migration Strategy

### Phase 1: Implement Modern API
1. Add `SecAccessControl` creation function
2. Implement `SecItemAdd` with access control
3. Implement `SecItemCopyMatching` for retrieval
4. Implement `SecItemDelete` for removal

### Phase 2: Update Service Layer
1. Replace `store_password` to use `SecItemAdd`
2. Replace `get_password` to use `SecItemCopyMatching`
3. Replace `delete_password` to use `SecItemDelete`
4. Keep backward compatibility during transition

### Phase 3: Testing
1. Test on unsigned build (should fail gracefully)
2. Test on signed build with Touch ID
3. Test on signed build with Face ID
4. Test fallback when biometrics unavailable

## Expected Behavior After Fix

### When Enabling Touch ID
1. User enables "Quick Unlock with Touch ID" in settings
2. User unlocks database with password (first time)
3. App saves password to keychain
4. **NO macOS password prompt** ✅
5. Password is stored with biometric protection

### When Unlocking with Touch ID
1. User clicks Touch ID button
2. macOS shows Touch ID prompt
3. User authenticates with fingerprint/face
4. Password is retrieved from keychain
5. Database unlocks automatically

## References

- [Apple: Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Apple: SecAccessControl](https://developer.apple.com/documentation/security/secaccesscontrol)
- [Apple: SecItemAdd](https://developer.apple.com/documentation/security/1401659-secitemadd)
- [Apple: kSecAccessControlBiometryAny](https://developer.apple.com/documentation/security/secaccesscontrolcreateflags/ksecaccesscontrolbiometryany)
- [Storing Keys in the Keychain](https://developer.apple.com/documentation/security/certificate_key_and_trust_services/keys/storing_keys_in_the_keychain)

## Next Steps

1. ✅ Document the issue and solution
2. ⏳ Implement `SecAccessControl` creation
3. ⏳ Implement `SecItemAdd` with biometric protection
4. ⏳ Update Rust FFI bindings
5. ⏳ Test with code-signed build
6. ⏳ Update documentation and release notes
