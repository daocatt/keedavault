// Biometric Authentication Service
import { invoke } from '@tauri-apps/api/core';

export const biometricService = {
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
     * Uses system keychain via secure_storage commands
     */
    async storePassword(vaultPath: string, password: string): Promise<void> {
        try {
            await invoke('secure_store_password', { vaultPath, password });
        } catch (error) {
            console.error('Failed to store password securely:', error);
            throw error;
        }
    },

    /**
     * Retrieve stored password after biometric authentication
     */
    async getPassword(vaultPath: string): Promise<string | null> {
        try {
            return await invoke<string>('secure_get_password', { vaultPath });
        } catch (error) {
            // It's normal to fail if password not found
            // console.error('Failed to retrieve password:', error);
            return null;
        }
    },

    /**
     * Remove stored password for a vault
     */
    async removePassword(vaultPath: string): Promise<void> {
        try {
            await invoke('secure_delete_password', { vaultPath });
        } catch (error) {
            console.error('Failed to remove password:', error);
        }
    },

    /**
     * Check if a password is stored for a vault
     */
    async hasStoredPassword(vaultPath: string): Promise<boolean> {
        try {
            return await invoke<boolean>('secure_has_password', { vaultPath });
        } catch (error) {
            console.error('Failed to check stored password:', error);
            return false;
        }
    }
};
