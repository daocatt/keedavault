use keyring::Entry;
use tauri::command;

const SERVICE_NAME: &str = "keedavault-biometric";

#[command]
pub async fn secure_store_password(vault_path: String, password: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| e.to_string())?;
    entry.set_password(&password).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn secure_get_password(vault_path: String) -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| e.to_string())?;
    let password = entry.get_password().map_err(|e| e.to_string())?;
    Ok(password)
}

#[command]
pub async fn secure_delete_password(vault_path: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| e.to_string())?;
    entry.delete_credential().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn secure_has_password(vault_path: String) -> Result<bool, String> {
    let entry = Entry::new(SERVICE_NAME, &vault_path).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
