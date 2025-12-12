import React, { useState, useEffect } from 'react';
import { X, Database, Folder, File, Calendar, HardDrive, Shield, Globe, Key, Lock, Save, RefreshCw, Info } from 'lucide-react';
import { Vault } from '../types';
import { format } from 'date-fns';
import { useVault } from '../context/VaultContext';
import * as kdbxweb from 'kdbxweb';

// --- Helper functions for encryption parameter display ---

// Convert UUID bytes to normalized string for comparison
const uuidToString = (uuid: any): string => {
    if (!uuid) return '';

    // If it's already a base64 string, return it
    if (typeof uuid === 'string') {
        return uuid;
    }

    // If it has a toBase64 method (like kdbxweb objects might)
    if (uuid.toBase64) {
        return uuid.toBase64();
    }

    // If it has an id property (KdbxUuid)
    if (uuid.id) {
        return uuid.id;
    }

    // If it's a Uint8Array or ArrayBuffer, convert to base64
    let bytes: Uint8Array;
    if (uuid instanceof ArrayBuffer) {
        bytes = new Uint8Array(uuid);
    } else if (uuid instanceof Uint8Array) {
        bytes = uuid;
    } else if (ArrayBuffer.isView(uuid)) {
        bytes = new Uint8Array(uuid.buffer, uuid.byteOffset, uuid.byteLength);
    } else if (uuid.buffer) {
        // Handle typed arrays
        bytes = new Uint8Array(uuid.buffer);
    } else {
        console.log('[Security] Unknown UUID type:', typeof uuid, uuid);
        return String(uuid);
    }

    // Convert bytes to base64
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
};

// Get cipher name from UUID
const getCipherName = (cipherUuid: any): string => {
    const uuid = uuidToString(cipherUuid);
    const cipherMap: Record<string, string> = {
        'McHy5r9xQ1C+WAUhavxa/w==': 'AES-256',
        '1gOKK4tvTLWlJDOaMdu1mg==': 'ChaCha20',
    };
    return cipherMap[uuid] || 'Unknown';
};

// Get KDF name from UUID  
const getKdfName = (kdfUuid: any): string => {
    const uuid = uuidToString(kdfUuid);
    const kdfMap: Record<string, string> = {
        '72Nt34wpREuR96mkA+MKDA==': 'Argon2d',
        'nimLGVbbR3OyPfw+xvCh5g==': 'Argon2id',
        'ydnzmmKKRGC/dA0IwYpP6g==': 'AES-KDF',
    };
    return kdfMap[uuid] || 'Unknown';
};

// Get inner stream encryption name
const getInnerStreamName = (crsAlgorithm: number | undefined): string => {
    const crsMap: Record<number, string> = {
        0: 'None',
        1: 'ArcFour (Legacy)',
        2: 'Salsa20',
        3: 'ChaCha20',
    };
    return crsMap[crsAlgorithm ?? -1] || 'Unknown';
};

// Format large numbers with separators
const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return 'N/A';
    return num.toLocaleString();
};

// Get value from VarDictionary (kdfParameters)
const getKdfParam = (kdfParams: any, key: string): any => {
    if (!kdfParams) return undefined;
    try {
        const value = kdfParams.get(key);
        if (value === undefined) return undefined;
        // Handle Int64 type
        if (value && typeof value === 'object' && 'lo' in value && 'hi' in value) {
            // Int64: combine lo and hi (for memory, usually fits in lo)
            return value.lo;
        }
        return value;
    } catch {
        return undefined;
    }
};

interface DatabasePropertiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    vault: Vault;
    stats: { totalFolders: number; totalEntries: number };
    onChangeCredentials?: () => void;
}

type Tab = 'general' | 'security' | 'browser';

export const DatabasePropertiesModal: React.FC<DatabasePropertiesModalProps> = ({ isOpen, onClose, vault, stats, onChangeCredentials }) => {
    const { saveVault, refreshVault } = useVault();
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [dbName, setDbName] = useState('');
    const [dbDesc, setDbDesc] = useState('');
    const [dbUser, setDbUser] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Security settings state
    const [secIterations, setSecIterations] = useState<number>(10);
    const [secMemory, setSecMemory] = useState<number>(64); // in MB
    const [secParallelism, setSecParallelism] = useState<number>(2);
    const [secCompression, setSecCompression] = useState<number>(1); // 0=None, 1=GZip
    const [secEncryption, setSecEncryption] = useState<string>('ChaCha20');
    const [secKdf, setSecKdf] = useState<string>('Argon2d');
    const [securityChanged, setSecurityChanged] = useState(false);

    useEffect(() => {
        if (isOpen && vault) {
            setDbName(vault.db.meta.name || vault.name || '');
            setDbDesc((vault.db.meta as any).description || '');
            setDbUser(vault.db.meta.defaultUser || '');
            setActiveTab('general');

            // Initialize security settings from database header
            const header = vault.db.header;
            const kdfParams = header.kdfParameters;

            // Compression
            setSecCompression(header.compression ?? 1);

            // Encryption cipher
            const cipherName = getCipherName(header.dataCipherUuid);
            setSecEncryption(cipherName !== 'Unknown' ? cipherName : 'ChaCha20');

            // KDF type
            const kdfUuid = getKdfParam(kdfParams, '$UUID');
            const kdfNameValue = getKdfName(kdfUuid);
            setSecKdf(kdfNameValue.startsWith('Argon2') ? kdfNameValue : 'Argon2d');

            // KDF parameters (Argon2)
            const iterations = getKdfParam(kdfParams, 'I');
            const memory = getKdfParam(kdfParams, 'M');
            const parallelism = getKdfParam(kdfParams, 'P');

            if (iterations !== undefined) setSecIterations(iterations);
            if (memory !== undefined) setSecMemory(Math.round(memory / (1024 * 1024))); // Convert to MB
            if (parallelism !== undefined) setSecParallelism(parallelism);

            setSecurityChanged(false);
            setSaveError(null);
        }
    }, [isOpen, vault]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            // Update DB Meta
            vault.db.meta.name = dbName;
            (vault.db.meta as any).description = dbDesc;
            vault.db.meta.defaultUser = dbUser;

            // Update Vault object name if it changed
            if (dbName && dbName !== vault.name) {
                vault.name = dbName;
            }

            // Mark as modified
            vault.db.meta.nameChanged = new Date();
            (vault.db.meta as any).descriptionChanged = new Date();
            vault.db.meta.defaultUserChanged = new Date();

            // Update security settings if changed
            if (securityChanged) {
                const header = vault.db.header;

                // Update compression
                header.compression = secCompression;

                // Update encryption cipher
                if (secEncryption === 'AES-256') {
                    header.dataCipherUuid = new kdbxweb.KdbxUuid(kdbxweb.Consts.CipherId.Aes);
                } else if (secEncryption === 'ChaCha20') {
                    header.dataCipherUuid = new kdbxweb.KdbxUuid(kdbxweb.Consts.CipherId.ChaCha20);
                }

                // Update KDF type (use db.setKdf as KeeWeb does)
                const currentKdfUuid = getKdfParam(header.kdfParameters, '$UUID');
                const currentKdfName = getKdfName(currentKdfUuid);
                if (secKdf !== currentKdfName) {
                    // Change KDF type
                    switch (secKdf) {
                        case 'Argon2d':
                            vault.db.setKdf(kdbxweb.Consts.KdfId.Argon2d);
                            break;
                        case 'Argon2id':
                            vault.db.setKdf(kdbxweb.Consts.KdfId.Argon2id);
                            break;
                        case 'AES-KDF':
                            vault.db.setKdf(kdbxweb.Consts.KdfId.Aes);
                            break;
                    }
                }

                // Update KDF parameters using kdbxweb.Int64.from() as KeeWeb does
                // https://github.com/keeweb/keeweb/blob/master/app/scripts/models/file-model.js
                const kdfParams = vault.db.header.kdfParameters;
                if (kdfParams && secKdf.startsWith('Argon2')) {
                    const ValueType = kdbxweb.VarDictionary.ValueType;
                    // Memory (M) in bytes
                    kdfParams.set('M', ValueType.UInt64, kdbxweb.Int64.from(secMemory * 1024 * 1024));
                    // Iterations (I)
                    kdfParams.set('I', ValueType.UInt64, kdbxweb.Int64.from(secIterations));
                    // Parallelism (P)
                    kdfParams.set('P', ValueType.UInt32, secParallelism);
                }
            }

            await saveVault(vault.id);
            refreshVault(vault.id);
            onClose();
        } catch (e: any) {
            console.error("Failed to save database properties", e);
            setSaveError(e?.message || 'Failed to save database properties');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRevealInFinder = async () => {
        if (vault.path) {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('reveal_in_finder', { path: vault.path });
            } catch (e) {
                console.error("Failed to open path", e);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div
                className="rounded-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] border shadow-xl"
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderColor: 'var(--color-border-light)'
                }}
            >

                {/* Header - Simple like GroupModal */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Database Settings
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Tabs - Segmented control style */}
                <div className="flex border-b px-4" style={{ borderColor: 'var(--color-border-light)' }}>
                    {[
                        { id: 'general', label: 'General' },
                        { id: 'security', label: 'Security' },
                        { id: 'browser', label: 'Browser' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent hover:text-gray-700'
                                }`}
                            style={activeTab !== tab.id ? { color: 'var(--color-text-secondary)' } : {}}
                            onClick={() => setActiveTab(tab.id as 'general' | 'security' | 'browser')}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            {/* Metadata Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Database Name</label>
                                        <input
                                            type="text"
                                            value={dbName}
                                            onChange={(e) => setDbName(e.target.value)}
                                            className="block w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                            placeholder="My Database"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Default Username</label>
                                        <input
                                            type="text"
                                            value={dbUser}
                                            onChange={(e) => setDbUser(e.target.value)}
                                            className="block w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                            style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                            placeholder="jdoe"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Description</label>
                                    <textarea
                                        value={dbDesc}
                                        onChange={(e) => setDbDesc(e.target.value)}
                                        rows={3}
                                        className="block w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                        style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                        placeholder="Database description..."
                                    />
                                </div>
                            </div>

                            {/* Database Info */}
                            <div className="border rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--color-border-light)' }}>
                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Info</span>
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}><HardDrive size={11} /> Path</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono truncate max-w-[180px] text-[10px]" title={vault.path} style={{ color: 'var(--color-text-primary)' }}>{vault.path || 'In-memory'}</span>
                                            {vault.path && (
                                                <button onClick={handleRevealInFinder} className="text-indigo-600 hover:text-indigo-800">
                                                    <Folder size={11} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}><Calendar size={11} /> Created</span>
                                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-primary)' }}>
                                            {vault.db.getDefaultGroup()?.times?.creationTime ? format(vault.db.getDefaultGroup()!.times.creationTime as Date, 'PP pp') : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}><Folder size={11} /> Groups</span>
                                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-primary)' }}>{stats.totalFolders}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}><File size={11} /> Entries</span>
                                        <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-primary)' }}>{stats.totalEntries}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (() => {
                        // Extract encryption parameters from database header
                        const header = vault.db.header;
                        const kdfParams = header.kdfParameters;

                        const kdfUuid = getKdfParam(kdfParams, '$UUID');
                        const kdfName = getKdfName(kdfUuid);
                        const isArgon2 = kdfName.startsWith('Argon2');

                        // AES-KDF parameter
                        const transformRounds = getKdfParam(kdfParams, 'R') || header.keyEncryptionRounds;

                        // Format version
                        const formatVersion = `KDBX ${header.versionMajor}.${header.versionMinor}`;

                        // Inner stream encryption (read-only)
                        const innerStreamName = getInnerStreamName(header.crsAlgorithm);

                        return (
                            <div className="space-y-4">
                                {/* Credentials Section */}
                                <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Key size={14} className="text-indigo-500" />
                                            <div>
                                                <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Credentials</h4>
                                                <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>Password & key file</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onChangeCredentials}
                                            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md transition-colors"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>

                                {/* Encryption Settings */}
                                <div className="border rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                    <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)' }}>
                                        <div className="flex items-center gap-2">
                                            <Lock size={12} className="text-gray-500" />
                                            <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Encryption Settings</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>{formatVersion}</span>
                                    </div>

                                    <div className="p-3 space-y-3">
                                        {/* Encryption & KDF */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Encryption</label>
                                                <select
                                                    value={secEncryption}
                                                    onChange={(e) => { setSecEncryption(e.target.value); setSecurityChanged(true); }}
                                                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                >
                                                    <option value="AES-256">AES-256</option>
                                                    <option value="ChaCha20">ChaCha20</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Key Derivation</label>
                                                <select
                                                    value={secKdf}
                                                    onChange={(e) => { setSecKdf(e.target.value); setSecurityChanged(true); }}
                                                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                >
                                                    <option value="Argon2d">Argon2d</option>
                                                    <option value="Argon2id">Argon2id</option>
                                                    <option value="AES-KDF">AES-KDF</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Inner Stream & Compression */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Inner Stream</label>
                                                <div
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                >
                                                    {innerStreamName || 'ChaCha20'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Compression</label>
                                                <select
                                                    value={secCompression}
                                                    onChange={(e) => { setSecCompression(Number(e.target.value)); setSecurityChanged(true); }}
                                                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                >
                                                    <option value={0}>None</option>
                                                    <option value={1}>GZip</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* KDF Parameters - Argon2 */}
                                {isArgon2 && (
                                    <div className="border rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                        <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)' }}>
                                            <div className="flex items-center gap-2">
                                                <Shield size={12} className="text-gray-500" />
                                                <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Key Derivation</span>
                                            </div>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-tertiary)' }}>
                                                {secIterations <= 20 ? 'Fast' : secIterations <= 50 ? 'Balanced' : 'Secure'}
                                            </span>
                                        </div>

                                        <div className="p-3 space-y-3">
                                            {/* Iterations */}
                                            <div>
                                                <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Iterations</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={200}
                                                    value={secIterations}
                                                    onChange={(e) => { setSecIterations(Number(e.target.value) || 1); setSecurityChanged(true); }}
                                                    onBlur={(e) => setSecIterations(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                                                    className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                    style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                />
                                            </div>

                                            {/* Memory & Parallelism */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Memory (MB)</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={4096}
                                                        value={secMemory}
                                                        onChange={(e) => { setSecMemory(Number(e.target.value) || 1); setSecurityChanged(true); }}
                                                        onBlur={(e) => setSecMemory(Math.max(1, Math.min(4096, Number(e.target.value) || 1)))}
                                                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                        style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Parallelism</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={8}
                                                        value={secParallelism}
                                                        onChange={(e) => { setSecParallelism(Number(e.target.value) || 1); setSecurityChanged(true); }}
                                                        onBlur={(e) => setSecParallelism(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                                                        className="w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                        style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-medium)' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* AES-KDF Parameters (read-only) */}
                                {kdfName === 'AES-KDF' && transformRounds !== undefined && (
                                    <div className="border rounded-lg p-3" style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Shield size={12} className="text-gray-500" />
                                                <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Key Derivation</span>
                                            </div>
                                            <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{formatNumber(transformRounds)} rounds</span>
                                        </div>
                                    </div>
                                )}

                                {/* Info note */}
                                <p className="text-[10px] px-1" style={{ color: 'var(--color-text-tertiary)' }}>
                                    Higher values increase security but slow down unlock time.
                                </p>

                                {/* Changes Indicator */}
                                {securityChanged && (
                                    <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-amber-300 bg-amber-50">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <p className="text-[10px] text-amber-700">Settings modified — save to apply</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {activeTab === 'browser' && (
                        <div className="flex flex-col items-center justify-center h-40 text-center space-y-3">
                            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                                <Globe size={24} style={{ color: 'var(--color-text-tertiary)' }} />
                            </div>
                            <div>
                                <h4 className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>Browser Integration</h4>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Connect KeedaVault with your browser.</p>
                            </div>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-medium uppercase">
                                Coming Soon
                            </span>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {
                    saveError && (
                        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                            <p className="text-xs text-red-600">Error: {saveError}</p>
                        </div>
                    )
                }

                {/* Footer */}
                <div className="px-4 py-2.5 border-t flex justify-end space-x-2 rounded-b-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-light)' }}>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                        {isSaving && <RefreshCw size={12} className="animate-spin" />}
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
