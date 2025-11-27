import kdbxweb from 'kdbxweb';

// Native File System API Types
export interface FileSystemWritableFileStream extends WritableStream {
  write: (data: any) => Promise<void>;
  seek: (position: number) => Promise<void>;
  truncate: (size: number) => Promise<void>;
  close: () => Promise<void>;
}

export interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

// Define simplified interfaces for the application state

export interface Vault {
  id: string;
  name: string;
  filename: string;
  db: kdbxweb.Kdbx;
  groups: VaultGroup[];
  fileHandle?: FileSystemFileHandle;
  path?: string;
  hasKeyFile?: boolean;
  keyFileData?: Uint8Array;
  password?: kdbxweb.ProtectedValue;
}

export interface VaultGroup {
  uuid: string;
  name: string;
  icon: number;
  entries: VaultEntry[];
  subgroups: VaultGroup[];
  expanded?: boolean;
  isRecycleBin?: boolean;
}

export interface VaultEntry {
  uuid: string;
  title: string;
  username: string;
  email?: string; // Email field for direct access
  password?: string;
  url: string;
  notes: string;
  icon: number;
  fields: Record<string, string>; // Custom fields (including Email if set)
  tags: string[];
  creationTime: Date;
  lastModTime: Date;
  otpUrl?: string;
  expiryTime?: Date;
  attachments: { name: string; data: ArrayBuffer }[];
  history?: VaultEntry[];
}

export type ViewMode = 'list' | 'grid';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info';
}

// Gemini specific
export interface PasswordGenerationOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  memorable?: boolean;
  topic?: string;
}

// Data structure for creating/editing entries
export interface EntryFormData {
  uuid?: string; // present if editing
  groupUuid: string;
  title: string;
  username: string;
  email: string;
  password: string;
  url: string;
  notes: string;
  totpSecret: string; // Raw secret key
  expiryTime?: Date;
  customFields?: Record<string, string>;
  attachments?: { name: string; data: ArrayBuffer }[];
}