// Modern Biometric Authentication Service (No Password Prompt!)
// Uses SecItemAdd with SecAccessControl instead of deprecated SecKeychainAddGenericPassword
import { invoke } from '@tauri-apps/api/core';

/**
 * Encode vault path to Base64 for consistent keychain storage
 * This ensures that paths with special characters, quotes, or different formats
 * are always stored and retrieved consistently
 */
function encodeVaultPath(vaultPath: string): string {
    // Remove surrounding quotes if present
    let normalizedPath = vaultPath.trim();
    if (normalizedPath.startsWith('"') && normalizedPath.endsWith('"')) {
        normalizedPath = normalizedPath.slice(1, -1);
    }

    // Encode to Base64
    const encoded = btoa(normalizedPath);
    console.log(`[ModernBiometricService] Path encoding: "${vaultPath}" → "${encoded}"`);
    return encoded;
}

export const modernBiometricService = {
    /**
     * Check if biometric authentication is available on this device
     */
    async isAvailable(): Promise<boolean> {
        try {
            return await invoke<boolean>('check_biometric_available');
        } catch (error) {
            console.error('Failed to check biometric availability:', error);
            return false;
        }
    },

    /**
     * Authenticate using biometric (Touch ID/Face ID)
     */
    async authenticate(reason: string = 'Unlock database'): Promise<boolean> {
        try {
            return await invoke<boolean>('authenticate_biometric', { reason });
        } catch (error) {
            console.error('Biometric authentication failed:', error);
            return false;
        }
    },

    /**
     * Store password for biometric unlock
     * Uses modern SecItemAdd with SecAccessControl
     * ✅ NO PASSWORD PROMPT - This is the key difference!
     */
    async storePassword(vaultPath: string, password: string): Promise<void> {
        try {
            const encodedPath = encodeVaultPath(vaultPath);
            console.log('[ModernBiometricService] Calling secure_store_password_modern with encoded path');
            await invoke('secure_store_password_modern', { vaultPath: encodedPath, password });
            console.log('[ModernBiometricService] Password stored successfully (NO password prompt!)');
        } catch (error) {
            console.error('Failed to store password securely:', error);
            throw error;
        }
    },

    /**
     * Retrieve stored password after biometric authentication
     * Will trigger Touch ID/Face ID prompt
     */
    async getPassword(vaultPath: string): Promise<string | null> {
        try {
            const encodedPath = encodeVaultPath(vaultPath);
            console.log('[ModernBiometricService] Calling secure_get_password_modern with encoded path');
            return await invoke<string>('secure_get_password_modern', { vaultPath: encodedPath });
        } catch (error) {
            // It's normal to fail if password not found
            console.log('[ModernBiometricService] Password not found or error:', error);
            return null;
        }
    },

    /**
     * Remove stored password for a vault
     */
    async removePassword(vaultPath: string): Promise<void> {
        try {
            const encodedPath = encodeVaultPath(vaultPath);
            console.log('[ModernBiometricService] Calling secure_delete_password_modern with encoded path');
            await invoke('secure_delete_password_modern', { vaultPath: encodedPath });
        } catch (error) {
            console.error('Failed to remove password:', error);
        }
    },

    /**
     * Check if a password is stored for a vault
     */
    async hasStoredPassword(vaultPath: string): Promise<boolean> {
        try {
            const encodedPath = encodeVaultPath(vaultPath);
            console.log('[ModernBiometricService] Calling secure_has_password_modern with encoded path');
            const result = await invoke<boolean>('secure_has_password_modern', { vaultPath: encodedPath });
            console.log('[ModernBiometricService] Has password result:', result);
            return result;
        } catch (error) {
            console.error('Failed to check stored password:', error);
            return false;
        }
    }
};
