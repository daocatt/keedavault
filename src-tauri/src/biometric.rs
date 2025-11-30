// Biometric authentication utilities
use tauri::command;

#[command]
pub async fn check_biometric_available() -> Result<bool, String> {
    // For now, we'll assume biometric is available on macOS
    // In a real implementation, you'd check the system capabilities
    #[cfg(target_os = "macos")]
    {
        Ok(true)
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
        // Use macOS LocalAuthentication framework
        // This is a placeholder - you'll need to implement actual Touch ID auth
        // For now, we'll return true to simulate successful authentication
        println!("Biometric authentication requested: {}", reason);
        Ok(true)
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Biometric authentication not supported on this platform".to_string())
    }
}
