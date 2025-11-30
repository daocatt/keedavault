use keyring::Entry;
use tauri::command;

const SERVICE_NAME: &str = "keedavault-biometric";

#[command]
pub async fn secure_store_password(vault_path: String, password: String) -> Result<(), String> {
    println!("[Secure Storage] Storing password for path: {}", vault_path);
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| {
        let err_msg = format!("Failed to create keychain entry: {}", e);
        println!("[Secure Storage] ERROR: {}", err_msg);
        err_msg
    })?;
    entry.set_password(&password).map_err(|e| {
        let err_msg = format!("Failed to set password: {}", e);
        println!("[Secure Storage] ERROR: {}", err_msg);
        err_msg
    })?;
    println!("[Secure Storage] Password stored successfully for: {}", vault_path);
    Ok(())
}

#[command]
pub async fn secure_get_password(vault_path: String) -> Result<String, String> {
    println!("[Secure Storage] Getting password for path: {}", vault_path);
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| e.to_string())?;
    let password = entry.get_password().map_err(|e| {
        println!("[Secure Storage] Password not found for: {}", vault_path);
        e.to_string()
    })?;
    println!("[Secure Storage] Password retrieved successfully for: {}", vault_path);
    Ok(password)
}

#[command]
pub async fn secure_delete_password(vault_path: String) -> Result<(), String> {
    println!("[Secure Storage] Deleting password for path: {}", vault_path);
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())?;
    println!("[Secure Storage] Password deleted for: {}", vault_path);
    Ok(())
}

#[command]
pub async fn secure_has_password(vault_path: String) -> Result<bool, String> {
    println!("[Secure Storage] Checking if password exists for path: {}", vault_path);
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => {
            println!("[Secure Storage] Password EXISTS for: {}", vault_path);
            Ok(true)
        },
        Err(_) => {
            println!("[Secure Storage] Password DOES NOT EXIST for: {}", vault_path);
            Ok(false)
        },
    }
}
