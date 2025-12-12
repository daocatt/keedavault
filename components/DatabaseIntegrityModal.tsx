import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, CheckCircle, AlertTriangle, RefreshCw, FileText, Clock } from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useToast } from './ui/Toaster';
import { verifyDatabaseFile, restoreFromBackup, listBackups } from '../services/databaseIntegrityService';

interface DatabaseIntegrityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DatabaseIntegrityModal: React.FC<DatabaseIntegrityModalProps> = ({ isOpen, onClose }) => {
    const { vaults, activeVaultId } = useVault();
    const { addToast } = useToast();
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);
    const [backups, setBackups] = useState<string[]>([]);

    const activeVault = vaults.find(v => v.id === activeVaultId);

    useEffect(() => {
        if (isOpen && activeVault?.path) {
            loadBackups();
        }
    }, [isOpen, activeVault]);

    const loadBackups = async () => {
        if (!activeVault?.path) return;
        try {
            const backupList = await listBackups(activeVault.path);
            setBackups(backupList);
        } catch (e) {
            console.error('Failed to load backups:', e);
        }
    };

    const handleVerify = async () => {
        if (!activeVault?.path || !activeVault.db.credentials) {
            addToast({ title: 'Cannot verify: No file path or credentials', type: 'error' });
            return;
        }

        setIsVerifying(true);
        setVerificationResult(null);

        try {
            const result = await verifyDatabaseFile(activeVault.path, activeVault.db.credentials);
            setVerificationResult(result);

            if (result.valid) {
                addToast({
                    title: 'Database verified',
                    description: 'File integrity check passed',
                    type: 'success'
                });
            } else {
                addToast({
                    title: 'Verification failed',
                    description: result.error,
                    type: 'error'
                });
            }
        } catch (e: any) {
            addToast({ title: 'Verification error', description: e.message, type: 'error' });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleRestoreBackup = async (backupPath: string) => {
        if (!activeVault?.path) return;

        const confirmed = confirm(`Restore from backup?\n\nThis will replace your current database with:\n${backupPath}\n\nCurrent database will be backed up first.`);

        if (!confirmed) return;

        try {
            const result = await restoreFromBackup(activeVault.path, backupPath);

            if (result.success) {
                addToast({
                    title: 'Backup restored',
                    description: 'Please reload the vault',
                    type: 'success'
                });
                onClose();
            } else {
                addToast({
                    title: 'Restore failed',
                    description: result.error,
                    type: 'error'
                });
            }
        } catch (e: any) {
            addToast({ title: 'Restore error', description: e.message, type: 'error' });
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl mx-4 rounded-lg shadow-xl"
                style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border-light)',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4"
                    style={{ borderBottom: '1px solid var(--color-border-light)' }}
                >
                    <div className="flex items-center gap-2">
                        <Shield size={20} style={{ color: 'var(--color-primary)' }} />
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            Database Integrity
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-opacity-10"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Current Database Info */}
                    <div className="space-y-2">
                        <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            Current Database
                        </h3>
                        <div
                            className="p-4 rounded-lg"
                            style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                        >
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Name:</span>
                                    <span style={{ color: 'var(--color-text-primary)' }}>{activeVault?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Path:</span>
                                    <span
                                        className="text-xs truncate max-w-md"
                                        style={{ color: 'var(--color-text-primary)' }}
                                        title={activeVault?.path}
                                    >
                                        {activeVault?.path || 'No path'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                Integrity Check
                            </h3>
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying || !activeVault?.path}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                style={{
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white'
                                }}
                            >
                                {isVerifying ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <Shield size={16} />
                                        Verify Now
                                    </>
                                )}
                            </button>
                        </div>

                        {verificationResult && (
                            <div
                                className="p-4 rounded-lg"
                                style={{
                                    backgroundColor: verificationResult.valid
                                        ? 'rgba(34, 197, 94, 0.1)'
                                        : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${verificationResult.valid ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}`
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    {verificationResult.valid ? (
                                        <CheckCircle size={20} style={{ color: 'rgb(34, 197, 94)' }} />
                                    ) : (
                                        <AlertTriangle size={20} style={{ color: 'rgb(239, 68, 68)' }} />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-medium mb-1" style={{
                                            color: verificationResult.valid ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                                        }}>
                                            {verificationResult.valid ? 'Database is valid' : 'Database verification failed'}
                                        </div>
                                        {verificationResult.error && (
                                            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                {verificationResult.error}
                                            </div>
                                        )}
                                        {verificationResult.details && (
                                            <div className="mt-2 text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                <div>Groups: {verificationResult.details.totalGroups}</div>
                                                <div>Entries: {verificationResult.details.totalEntries}</div>
                                                <div>Database: {verificationResult.details.databaseName}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Backup Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                                Backups
                            </h3>
                            <button
                                onClick={loadBackups}
                                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                                style={{
                                    color: 'var(--color-primary)',
                                    backgroundColor: 'var(--color-bg-secondary)'
                                }}
                            >
                                <RefreshCw size={14} />
                                Refresh
                            </button>
                        </div>

                        {backups.length === 0 ? (
                            <div
                                className="p-8 text-center rounded-lg"
                                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                            >
                                <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
                                <div style={{ color: 'var(--color-text-secondary)' }}>
                                    No backups found
                                </div>
                                <div className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                    Backups are created automatically when you save
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {backups.map((backup, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg"
                                        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Clock size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                                            <div className="flex-1 min-w-0">
                                                <div
                                                    className="text-sm truncate"
                                                    style={{ color: 'var(--color-text-primary)' }}
                                                    title={backup}
                                                >
                                                    {backup.split('/').pop()}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreBackup(backup)}
                                            className="px-3 py-1.5 rounded text-sm font-medium"
                                            style={{
                                                backgroundColor: 'var(--color-primary)',
                                                color: 'white'
                                            }}
                                        >
                                            Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info Section */}
                    <div
                        className="p-4 rounded-lg text-sm"
                        style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <div className="font-medium mb-2" style={{ color: 'rgb(59, 130, 246)' }}>
                            Protection Features
                        </div>
                        <ul className="space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                            <li>• Automatic backup before each save</li>
                            <li>• Read-after-write verification</li>
                            <li>• Automatic rollback on corruption</li>
                            <li>• Up to 5 recent backups retained</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="flex justify-end gap-3 p-4"
                    style={{ borderTop: '1px solid var(--color-border-light)' }}
                >
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-medium"
                        style={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            color: 'var(--color-text-primary)'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
