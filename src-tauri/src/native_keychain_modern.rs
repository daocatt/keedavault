// Modern macOS Keychain implementation using SecItemAdd with SecAccessControl
// This approach does NOT prompt for macOS password when saving passwords
use std::ffi::CString;
use std::os::raw::{c_char, c_void};
use std::ptr;
use tauri::command;

#[cfg(target_os = "macos")]
mod macos_keychain_modern {
    use super::*;

    // Core Foundation types
    type CFTypeRef = *const c_void;
    type CFAllocatorRef = *const c_void;
    type CFDictionaryRef = *const c_void;
    type CFMutableDictionaryRef = *mut c_void;
    type CFStringRef = *const c_void;
    type CFDataRef = *const c_void;
    type CFErrorRef = *const c_void;
    type CFIndex = isize;
    type CFOptionFlags = u64;
    type OSStatus = i32;

    // Security Framework types
    type SecAccessControlRef = *const c_void;
    type SecAccessControlCreateFlags = CFOptionFlags;

    // Constants
    const ERR_SEC_SUCCESS: OSStatus = 0;
    const ERR_SEC_ITEM_NOT_FOUND: OSStatus = -25300;
    const ERR_SEC_DUPLICATE_ITEM: OSStatus = -25299;

    // Access Control Flags
    const K_SEC_ACCESS_CONTROL_USER_PRESENCE: SecAccessControlCreateFlags = 1 << 0;
    const K_SEC_ACCESS_CONTROL_BIOMETRY_ANY: SecAccessControlCreateFlags = 1 << 1;
    const K_SEC_ACCESS_CONTROL_BIOMETRY_CURRENT_SET: SecAccessControlCreateFlags = 1 << 3;

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        static kCFAllocatorDefault: CFAllocatorRef;

        fn CFStringCreateWithCString(
            alloc: CFAllocatorRef,
            cStr: *const c_char,
            encoding: u32,
        ) -> CFStringRef;

        fn CFDataCreate(allocator: CFAllocatorRef, bytes: *const u8, length: CFIndex) -> CFDataRef;

        fn CFDictionaryCreateMutable(
            allocator: CFAllocatorRef,
            capacity: CFIndex,
            keyCallBacks: *const c_void,
            valueCallBacks: *const c_void,
        ) -> CFMutableDictionaryRef;

        fn CFDictionarySetValue(
            theDict: CFMutableDictionaryRef,
            key: *const c_void,
            value: *const c_void,
        );

        fn CFRelease(cf: CFTypeRef);

        fn CFErrorCopyDescription(err: CFErrorRef) -> CFStringRef;

        fn CFStringGetCStringPtr(theString: CFStringRef, encoding: u32) -> *const c_char;

        static kCFTypeDictionaryKeyCallBacks: *const c_void;
        static kCFTypeDictionaryValueCallBacks: *const c_void;
    }

    #[link(name = "Security", kind = "framework")]
    extern "C" {
        // Modern Keychain Services API
        fn SecAccessControlCreateWithFlags(
            allocator: CFAllocatorRef,
            protection: CFTypeRef,
            flags: SecAccessControlCreateFlags,
            error: *mut CFErrorRef,
        ) -> SecAccessControlRef;

        fn SecItemAdd(attributes: CFDictionaryRef, result: *mut CFTypeRef) -> OSStatus;

        fn SecItemCopyMatching(query: CFDictionaryRef, result: *mut CFTypeRef) -> OSStatus;

        fn SecItemDelete(query: CFDictionaryRef) -> OSStatus;

        // Keychain attribute keys
        static kSecClass: CFStringRef;
        static kSecClassGenericPassword: CFStringRef;
        static kSecAttrService: CFStringRef;
        static kSecAttrAccount: CFStringRef;
        static kSecValueData: CFStringRef;
        static kSecAttrAccessControl: CFStringRef;
        static kSecReturnData: CFStringRef;
        static kSecMatchLimit: CFStringRef;
        static kSecMatchLimitOne: CFStringRef;
        static kSecUseAuthenticationUI: CFStringRef;
        static kSecUseAuthenticationUISkip: CFStringRef;

        // Accessibility constants
        static kSecAttrAccessibleWhenUnlockedThisDeviceOnly: CFStringRef;
        static kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly: CFStringRef;
    }

    const K_CF_STRING_ENCODING_UTF8: u32 = 0x08000100;

    /// Create a CFString from a Rust string
    unsafe fn create_cfstring(s: &str) -> Result<CFStringRef, String> {
        let c_str = CString::new(s).map_err(|e| e.to_string())?;
        let cf_str = CFStringCreateWithCString(
            kCFAllocatorDefault,
            c_str.as_ptr(),
            K_CF_STRING_ENCODING_UTF8,
        );
        if cf_str.is_null() {
            return Err("Failed to create CFString".to_string());
        }
        Ok(cf_str)
    }

    /// Create CFData from bytes
    unsafe fn create_cfdata(data: &[u8]) -> Result<CFDataRef, String> {
        let cf_data = CFDataCreate(kCFAllocatorDefault, data.as_ptr(), data.len() as CFIndex);
        if cf_data.is_null() {
            return Err("Failed to create CFData".to_string());
        }
        Ok(cf_data)
    }

    /// Store password with biometric protection (NO password prompt!)
    pub fn store_password(service: &str, account: &str, password: &str) -> Result<(), String> {
        unsafe {
            // Create access control with biometric authentication
            let mut error: CFErrorRef = ptr::null();
            let access_control = SecAccessControlCreateWithFlags(
                kCFAllocatorDefault,
                kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                K_SEC_ACCESS_CONTROL_BIOMETRY_ANY | K_SEC_ACCESS_CONTROL_USER_PRESENCE,
                &mut error,
            );

            if access_control.is_null() {
                let err_msg = if !error.is_null() {
                    let desc = CFErrorCopyDescription(error);
                    let c_str = CFStringGetCStringPtr(desc, K_CF_STRING_ENCODING_UTF8);
                    let msg = if !c_str.is_null() {
                        std::ffi::CStr::from_ptr(c_str)
                            .to_string_lossy()
                            .to_string()
                    } else {
                        "Unknown error".to_string()
                    };
                    CFRelease(desc as CFTypeRef);
                    CFRelease(error as CFTypeRef);
                    msg
                } else {
                    "Failed to create access control".to_string()
                };
                return Err(err_msg);
            }

            // Create service and account CFStrings
            let service_cfstr = create_cfstring(service)?;
            let account_cfstr = create_cfstring(account)?;
            let password_data = create_cfdata(password.as_bytes())?;

            // Create query dictionary
            let query = CFDictionaryCreateMutable(
                kCFAllocatorDefault,
                0,
                kCFTypeDictionaryKeyCallBacks,
                kCFTypeDictionaryValueCallBacks,
            );

            if query.is_null() {
                CFRelease(access_control as CFTypeRef);
                CFRelease(service_cfstr as CFTypeRef);
                CFRelease(account_cfstr as CFTypeRef);
                CFRelease(password_data as CFTypeRef);
                return Err("Failed to create query dictionary".to_string());
            }

            // Set query attributes
            CFDictionarySetValue(
                query,
                kSecClass as *const c_void,
                kSecClassGenericPassword as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrService as *const c_void,
                service_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrAccount as *const c_void,
                account_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecValueData as *const c_void,
                password_data as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrAccessControl as *const c_void,
                access_control as *const c_void,
            );

            // Skip authentication UI during save (this prevents password prompt!)
            CFDictionarySetValue(
                query,
                kSecUseAuthenticationUI as *const c_void,
                kSecUseAuthenticationUISkip as *const c_void,
            );

            // Delete existing item first (if any)
            let delete_query = CFDictionaryCreateMutable(
                kCFAllocatorDefault,
                0,
                kCFTypeDictionaryKeyCallBacks,
                kCFTypeDictionaryValueCallBacks,
            );
            CFDictionarySetValue(
                delete_query,
                kSecClass as *const c_void,
                kSecClassGenericPassword as *const c_void,
            );
            CFDictionarySetValue(
                delete_query,
                kSecAttrService as *const c_void,
                service_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                delete_query,
                kSecAttrAccount as *const c_void,
                account_cfstr as *const c_void,
            );

            SecItemDelete(delete_query as CFDictionaryRef);
            CFRelease(delete_query as CFTypeRef);

            // Add new item
            let status = SecItemAdd(query as CFDictionaryRef, ptr::null_mut());

            // Cleanup
            CFRelease(query as CFTypeRef);
            CFRelease(access_control as CFTypeRef);
            CFRelease(service_cfstr as CFTypeRef);
            CFRelease(account_cfstr as CFTypeRef);
            CFRelease(password_data as CFTypeRef);

            if status == ERR_SEC_SUCCESS {
                Ok(())
            } else {
                Err(format!("Failed to store password, status: {}", status))
            }
        }
    }

    /// Retrieve password (will trigger biometric authentication)
    pub fn get_password(service: &str, account: &str) -> Result<String, String> {
        unsafe {
            let service_cfstr = create_cfstring(service)?;
            let account_cfstr = create_cfstring(account)?;

            // Create query dictionary
            let query = CFDictionaryCreateMutable(
                kCFAllocatorDefault,
                0,
                kCFTypeDictionaryKeyCallBacks,
                kCFTypeDictionaryValueCallBacks,
            );

            if query.is_null() {
                CFRelease(service_cfstr as CFTypeRef);
                CFRelease(account_cfstr as CFTypeRef);
                return Err("Failed to create query dictionary".to_string());
            }

            // Set query attributes
            CFDictionarySetValue(
                query,
                kSecClass as *const c_void,
                kSecClassGenericPassword as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrService as *const c_void,
                service_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrAccount as *const c_void,
                account_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecReturnData as *const c_void,
                kCFBooleanTrue as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecMatchLimit as *const c_void,
                kSecMatchLimitOne as *const c_void,
            );

            let mut result: CFTypeRef = ptr::null();
            let status = SecItemCopyMatching(query as CFDictionaryRef, &mut result);

            CFRelease(query as CFTypeRef);
            CFRelease(service_cfstr as CFTypeRef);
            CFRelease(account_cfstr as CFTypeRef);

            if status == ERR_SEC_SUCCESS && !result.is_null() {
                // Extract password data
                let data_ptr = CFDataGetBytePtr(result as CFDataRef);
                let data_len = CFDataGetLength(result as CFDataRef);

                let password_slice = std::slice::from_raw_parts(data_ptr, data_len as usize);
                let password = String::from_utf8_lossy(password_slice).to_string();

                CFRelease(result);
                Ok(password)
            } else if status == ERR_SEC_ITEM_NOT_FOUND {
                Err("Password not found".to_string())
            } else {
                Err(format!("Failed to get password, status: {}", status))
            }
        }
    }

    /// Delete password
    pub fn delete_password(service: &str, account: &str) -> Result<(), String> {
        unsafe {
            let service_cfstr = create_cfstring(service)?;
            let account_cfstr = create_cfstring(account)?;

            let query = CFDictionaryCreateMutable(
                kCFAllocatorDefault,
                0,
                kCFTypeDictionaryKeyCallBacks,
                kCFTypeDictionaryValueCallBacks,
            );

            if query.is_null() {
                CFRelease(service_cfstr as CFTypeRef);
                CFRelease(account_cfstr as CFTypeRef);
                return Err("Failed to create query dictionary".to_string());
            }

            CFDictionarySetValue(
                query,
                kSecClass as *const c_void,
                kSecClassGenericPassword as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrService as *const c_void,
                service_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrAccount as *const c_void,
                account_cfstr as *const c_void,
            );

            let status = SecItemDelete(query as CFDictionaryRef);

            CFRelease(query as CFTypeRef);
            CFRelease(service_cfstr as CFTypeRef);
            CFRelease(account_cfstr as CFTypeRef);

            if status == ERR_SEC_SUCCESS || status == ERR_SEC_ITEM_NOT_FOUND {
                Ok(())
            } else {
                Err(format!("Failed to delete password, status: {}", status))
            }
        }
    }

    /// Check if password exists
    pub fn has_password(service: &str, account: &str) -> bool {
        unsafe {
            let service_cfstr = match create_cfstring(service) {
                Ok(s) => s,
                Err(_) => return false,
            };
            let account_cfstr = match create_cfstring(account) {
                Ok(a) => a,
                Err(_) => {
                    CFRelease(service_cfstr as CFTypeRef);
                    return false;
                }
            };

            let query = CFDictionaryCreateMutable(
                kCFAllocatorDefault,
                0,
                kCFTypeDictionaryKeyCallBacks,
                kCFTypeDictionaryValueCallBacks,
            );

            if query.is_null() {
                CFRelease(service_cfstr as CFTypeRef);
                CFRelease(account_cfstr as CFTypeRef);
                return false;
            }

            CFDictionarySetValue(
                query,
                kSecClass as *const c_void,
                kSecClassGenericPassword as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrService as *const c_void,
                service_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecAttrAccount as *const c_void,
                account_cfstr as *const c_void,
            );
            CFDictionarySetValue(
                query,
                kSecUseAuthenticationUI as *const c_void,
                kSecUseAuthenticationUISkip as *const c_void,
            );

            let mut result: CFTypeRef = ptr::null();
            let status = SecItemCopyMatching(query as CFDictionaryRef, &mut result);

            if !result.is_null() {
                CFRelease(result);
            }
            CFRelease(query as CFTypeRef);
            CFRelease(service_cfstr as CFTypeRef);
            CFRelease(account_cfstr as CFTypeRef);

            status == ERR_SEC_SUCCESS
        }
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    extern "C" {
        static kCFBooleanTrue: CFTypeRef;

        fn CFDataGetBytePtr(theData: CFDataRef) -> *const u8;
        fn CFDataGetLength(theData: CFDataRef) -> CFIndex;
    }
}

const SERVICE_NAME: &str = "keedavault-biometric";

#[command]
pub async fn secure_store_password_modern(
    vault_path: String,
    password: String,
) -> Result<(), String> {
    println!(
        "[Modern Keychain] Storing password for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        macos_keychain_modern::store_password(SERVICE_NAME, &vault_path, &password)?;
        println!("[Modern Keychain] Password stored successfully (NO password prompt!)");
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Modern keychain only supported on macOS".to_string())
    }
}

#[command]
pub async fn secure_get_password_modern(vault_path: String) -> Result<String, String> {
    println!(
        "[Modern Keychain] Getting password for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        let password = macos_keychain_modern::get_password(SERVICE_NAME, &vault_path)?;
        println!("[Modern Keychain] Password retrieved successfully");
        Ok(password)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Modern keychain only supported on macOS".to_string())
    }
}

#[command]
pub async fn secure_delete_password_modern(vault_path: String) -> Result<(), String> {
    println!(
        "[Modern Keychain] Deleting password for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        macos_keychain_modern::delete_password(SERVICE_NAME, &vault_path)?;
        println!("[Modern Keychain] Password deleted successfully");
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Modern keychain only supported on macOS".to_string())
    }
}

#[command]
pub async fn secure_has_password_modern(vault_path: String) -> Result<bool, String> {
    println!(
        "[Modern Keychain] Checking if password exists for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        let has = macos_keychain_modern::has_password(SERVICE_NAME, &vault_path);
        println!("[Modern Keychain] Password exists: {}", has);
        Ok(has)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}
