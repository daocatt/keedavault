// macOS Keychain implementation using Security Framework directly
use std::ffi::CString;
use std::os::raw::{c_char, c_void};
use tauri::command;

#[cfg(target_os = "macos")]
mod macos_keychain {
    use super::*;

    #[link(name = "Security", kind = "framework")]
    extern "C" {
        fn SecKeychainAddGenericPassword(
            keychain: *const c_void,
            service_name_length: u32,
            service_name: *const c_char,
            account_name_length: u32,
            account_name: *const c_char,
            password_length: u32,
            password_data: *const c_void,
            item_ref: *mut *const c_void,
        ) -> i32;

        fn SecKeychainFindGenericPassword(
            keychain_or_array: *const c_void,
            service_name_length: u32,
            service_name: *const c_char,
            account_name_length: u32,
            account_name: *const c_char,
            password_length: *mut u32,
            password_data: *mut *const c_void,
            item_ref: *mut *const c_void,
        ) -> i32;

        fn SecKeychainItemDelete(item_ref: *const c_void) -> i32;

        fn SecKeychainItemFreeContent(attr_list: *const c_void, data: *const c_void) -> i32;
    }

    const ERR_SEC_SUCCESS: i32 = 0;
    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;
    const ERR_SEC_DUPLICATE_ITEM: i32 = -25299;

    pub fn store_password(service: &str, account: &str, password: &str) -> Result<(), String> {
        unsafe {
            let service_cstr = CString::new(service).map_err(|e| e.to_string())?;
            let account_cstr = CString::new(account).map_err(|e| e.to_string())?;
            let password_cstr = CString::new(password).map_err(|e| e.to_string())?;

            // Try to delete existing item first
            let mut item_ref: *const c_void = std::ptr::null();
            let find_status = SecKeychainFindGenericPassword(
                std::ptr::null(),
                service_cstr.as_bytes().len() as u32,
                service_cstr.as_ptr(),
                account_cstr.as_bytes().len() as u32,
                account_cstr.as_ptr(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut item_ref,
            );

            if find_status == ERR_SEC_SUCCESS && !item_ref.is_null() {
                SecKeychainItemDelete(item_ref);
            }

            // Add new password
            let status = SecKeychainAddGenericPassword(
                std::ptr::null(),
                service_cstr.as_bytes().len() as u32,
                service_cstr.as_ptr(),
                account_cstr.as_bytes().len() as u32,
                account_cstr.as_ptr(),
                password_cstr.as_bytes().len() as u32,
                password_cstr.as_ptr() as *const c_void,
                std::ptr::null_mut(),
            );

            if status == ERR_SEC_SUCCESS {
                Ok(())
            } else {
                Err(format!("Failed to store password, status: {}", status))
            }
        }
    }

    pub fn get_password(service: &str, account: &str) -> Result<String, String> {
        unsafe {
            let service_cstr = CString::new(service).map_err(|e| e.to_string())?;
            let account_cstr = CString::new(account).map_err(|e| e.to_string())?;

            let mut password_length: u32 = 0;
            let mut password_data: *const c_void = std::ptr::null();
            let mut item_ref: *const c_void = std::ptr::null();

            let status = SecKeychainFindGenericPassword(
                std::ptr::null(),
                service_cstr.as_bytes().len() as u32,
                service_cstr.as_ptr(),
                account_cstr.as_bytes().len() as u32,
                account_cstr.as_ptr(),
                &mut password_length,
                &mut password_data,
                &mut item_ref,
            );

            if status == ERR_SEC_SUCCESS {
                let password_slice = std::slice::from_raw_parts(
                    password_data as *const u8,
                    password_length as usize,
                );
                let password = String::from_utf8_lossy(password_slice).to_string();

                // Free the password data
                SecKeychainItemFreeContent(std::ptr::null(), password_data);

                Ok(password)
            } else if status == ERR_SEC_ITEM_NOT_FOUND {
                Err("Password not found".to_string())
            } else {
                Err(format!("Failed to get password, status: {}", status))
            }
        }
    }

    pub fn delete_password(service: &str, account: &str) -> Result<(), String> {
        unsafe {
            let service_cstr = CString::new(service).map_err(|e| e.to_string())?;
            let account_cstr = CString::new(account).map_err(|e| e.to_string())?;

            let mut item_ref: *const c_void = std::ptr::null();

            let find_status = SecKeychainFindGenericPassword(
                std::ptr::null(),
                service_cstr.as_bytes().len() as u32,
                service_cstr.as_ptr(),
                account_cstr.as_bytes().len() as u32,
                account_cstr.as_ptr(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                &mut item_ref,
            );

            if find_status == ERR_SEC_SUCCESS && !item_ref.is_null() {
                let delete_status = SecKeychainItemDelete(item_ref);
                if delete_status == ERR_SEC_SUCCESS {
                    Ok(())
                } else {
                    Err(format!(
                        "Failed to delete password, status: {}",
                        delete_status
                    ))
                }
            } else if find_status == ERR_SEC_ITEM_NOT_FOUND {
                Ok(()) // Already deleted
            } else {
                Err(format!("Failed to find password, status: {}", find_status))
            }
        }
    }

    pub fn has_password(service: &str, account: &str) -> bool {
        get_password(service, account).is_ok()
    }
}

const SERVICE_NAME: &str = "keedavault-biometric";

#[command]
pub async fn secure_store_password_native(
    vault_path: String,
    password: String,
) -> Result<(), String> {
    println!(
        "[Native Keychain] Storing password for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        macos_keychain::store_password(SERVICE_NAME, &vault_path, &password)?;
        println!("[Native Keychain] Password stored successfully");
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Native keychain only supported on macOS".to_string())
    }
}

#[command]
pub async fn secure_get_password_native(vault_path: String) -> Result<String, String> {
    println!(
        "[Native Keychain] Getting password for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        let password = macos_keychain::get_password(SERVICE_NAME, &vault_path)?;
        println!("[Native Keychain] Password retrieved successfully");
        Ok(password)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Native keychain only supported on macOS".to_string())
    }
}

#[command]
pub async fn secure_delete_password_native(vault_path: String) -> Result<(), String> {
    println!(
        "[Native Keychain] Deleting password for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        macos_keychain::delete_password(SERVICE_NAME, &vault_path)?;
        println!("[Native Keychain] Password deleted successfully");
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Native keychain only supported on macOS".to_string())
    }
}

#[command]
pub async fn secure_has_password_native(vault_path: String) -> Result<bool, String> {
    println!(
        "[Native Keychain] Checking if password exists for path: {}",
        vault_path
    );

    #[cfg(target_os = "macos")]
    {
        let has = macos_keychain::has_password(SERVICE_NAME, &vault_path);
        println!("[Native Keychain] Password exists: {}", has);
        Ok(has)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}
