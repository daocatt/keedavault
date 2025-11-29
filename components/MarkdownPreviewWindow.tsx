import React, { useEffect } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import ReactMarkdown from 'react-markdown';

export const MarkdownPreviewWindow: React.FC = () => {
    const params = new URLSearchParams(window.location.search);
    const text = params.get('text') || '';
    const title = params.get('title') || 'Notes';

    useEffect(() => {
        const win = getCurrentWebviewWindow();
        win.setTitle(title);

        const unlisten = listen('vault-locked', () => {
            win.close();
        });

        return () => {
            unlisten.then(f => f());
        };
    }, [title]);

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900 dark:selection:text-indigo-100" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            {/* Draggable Header Area */}
            <div className="h-12 w-full flex-shrink-0 backdrop-blur-xl z-10 sticky top-0" data-tauri-drag-region style={{ WebkitAppRegion: 'drag', backgroundColor: 'var(--color-bg-primary)', opacity: 0.95 } as React.CSSProperties} />

            <div className="flex-1 overflow-y-auto px-10 pb-10">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-sm font-normal mb-8 break-words leading-tight tracking-tight" style={{ color: 'var(--color-text-secondary)' }}>{title}</h1>
                    <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500 prose-img:rounded-xl prose-code:text-indigo-600 prose-code:bg-indigo-50 dark:prose-code:bg-indigo-900/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown>{text}</ReactMarkdown>
                    </article>
                </div>
            </div>
        </div>
    );
};
