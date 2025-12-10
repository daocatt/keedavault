import React from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { GitHubRelease } from '../services/updateService';
import { open } from '@tauri-apps/plugin-shell';

interface UpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    release: GitHubRelease;
    currentVersion: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, release, currentVersion }) => {
    if (!isOpen) return null;

    const handleDownload = async () => {
        await open(release.html_url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-accent-light)' }}>
                            <Download size={20} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Update Available</h3>
                            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>A new version is ready to download</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-4">
                    {/* Version Info */}
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Current Version</p>
                            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{currentVersion}</p>
                        </div>
                        <div className="text-2xl" style={{ color: 'var(--color-text-tertiary)' }}>→</div>
                        <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>Latest Version</p>
                            <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-accent)' }}>{release.tag_name}</p>
                        </div>
                    </div>

                    {/* Release Name */}
                    <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{release.name}</h4>
                        <div
                            className="text-xs leading-relaxed max-h-48 overflow-y-auto p-3 rounded-lg"
                            style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-secondary)',
                                whiteSpace: 'pre-wrap'
                            }}
                        >
                            {release.body || 'No release notes available.'}
                        </div>
                    </div>

                    {/* Release Date */}
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                        Released {new Date(release.published_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--color-border-light)', backgroundColor: 'var(--color-bg-secondary)' }}>
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: 'var(--color-bg-primary)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border-medium)'
                        }}
                    >
                        Later
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: 'var(--color-accent)',
                            color: 'white'
                        }}
                    >
                        <ExternalLink size={16} />
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
};
