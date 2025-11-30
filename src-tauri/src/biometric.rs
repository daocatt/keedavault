// Biometric authentication utilities
use tauri::command;

#[cfg(target_os = "macos")]
mod macos {
    use objc::runtime::{Class, Object};
    use objc::{msg_send, sel, sel_impl};
    use objc_foundation::{INSString, NSString};
    use block::ConcreteBlock;
    use std::sync::mpsc::channel;
    use std::time::Duration;

    pub fn check_biometric_available() -> bool {
        unsafe {
            let context_class = match Class::get("LAContext") {
                Some(cls) => cls,
                None => return false,
            };

            let context: *mut Object = msg_send![context_class, alloc];
            let context: *mut Object = msg_send![context, init];

            if context.is_null() {
                return false;
            }

            let policy: i64 = 2; // LAPolicyDeviceOwnerAuthenticationWithBiometrics
            let mut error: *mut Object = std::ptr::null_mut();
            
            let can_evaluate: bool = msg_send![context, canEvaluatePolicy:policy error:&mut error];
            
            let _: () = msg_send![context, release];
            
            can_evaluate
        }
    }

    pub fn authenticate_biometric(reason: &str) -> Result<bool, String> {
        unsafe {
            let context_class = match Class::get("LAContext") {
                Some(cls) => cls,
                None => return Err("LAContext class not available".to_string()),
            };

            let context: *mut Object = msg_send![context_class, alloc];
            let context: *mut Object = msg_send![context, init];

            if context.is_null() {
                return Err("Failed to create LAContext".to_string());
            }

            let policy: i64 = 2; // LAPolicyDeviceOwnerAuthenticationWithBiometrics
            let reason_nsstring = NSString::from_str(reason);

            let (tx, rx) = channel::<Result<bool, String>>();
            
            // Create a block that will be called with the authentication result
            let block = ConcreteBlock::new(move |success: bool, error: *mut Object| {
                if success {
                    let _ = tx.send(Ok(true));
                } else {
                    let error_msg = if !error.is_null() {
                        let desc: *mut Object = msg_send![error, localizedDescription];
                        if !desc.is_null() {
                            let bytes: *const u8 = msg_send![desc, UTF8String];
                            let len: usize = msg_send![desc, lengthOfBytesUsingEncoding:4]; // UTF8 encoding = 4
                            if !bytes.is_null() && len > 0 {
                                let slice = std::slice::from_raw_parts(bytes, len);
                                String::from_utf8_lossy(slice).to_string()
                            } else {
                                "Authentication failed".to_string()
                            }
                        } else {
                            "Authentication failed".to_string()
                        }
                    } else {
                        "Authentication failed".to_string()
                    };
                    let _ = tx.send(Err(error_msg));
                }
            });
            let block = block.copy();

            let _: () = msg_send![context, 
                evaluatePolicy:policy 
                localizedReason:reason_nsstring 
                reply:&*block
            ];

            // Wait for the result with a timeout
            let result = match rx.recv_timeout(Duration::from_secs(60)) {
                Ok(res) => res,
                Err(_) => Err("Authentication timeout".to_string()),
            };

            let _: () = msg_send![context, release];

            result
        }
    }
}

#[command]
pub async fn check_biometric_available() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        Ok(macos::check_biometric_available())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[command]
pub async fn authenticate_biometric(reason: String) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        macos::authenticate_biometric(&reason)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Biometric authentication not supported on this platform".to_string())
    }
}
