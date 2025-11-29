import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types';

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            // Allow animation to finish before removing
            setTimeout(() => onDismiss(toast.id), 300);
        }, 3000);

        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div
            className={`pointer-events-auto flex items-center p-3 rounded-xl shadow-xl border backdrop-blur-md min-w-[320px] max-w-[420px] transition-all duration-300 ${isExiting ? 'opacity-0 translate-y-2 scale-95' : 'animate-in slide-in-from-bottom-5 fade-in zoom-in-95'
                }`}
            style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border-light)',
                color: 'var(--color-text-primary)'
            }}
        >
            {toast.type === 'success' && <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full mr-3"><CheckCircle size={16} className="text-green-600 dark:text-green-400" /></div>}
            {toast.type === 'error' && <div className="bg-red-100 dark:bg-red-900/30 p-1 rounded-full mr-3"><AlertCircle size={16} className="text-red-600 dark:text-red-400" /></div>}
            {toast.type === 'info' && <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full mr-3"><Info size={16} className="text-blue-600 dark:text-blue-400" /></div>}
            <div className="flex-1 mr-2">
                <div className="text-sm font-medium">{toast.title}</div>
                {toast.description && (
                    <div className="text-xs mt-0.5 opacity-80">{toast.description}</div>
                )}
            </div>
            <button
                onClick={() => { setIsExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const Toaster: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const lastToastTimeRef = React.useRef<Map<string, number>>(new Map());

    useEffect(() => {
        const handler = (e: CustomEvent<ToastMessage>) => {
            const now = Date.now();
            const lastTime = lastToastTimeRef.current.get(e.detail.title) || 0;

            // Prevent duplicate toasts with same title within 1 second
            if (now - lastTime < 1000) {
                return;
            }

            lastToastTimeRef.current.set(e.detail.title, now);
            const newToast = { ...e.detail, id: e.detail.id || crypto.randomUUID() };
            setToasts(prev => [...prev, newToast]);
        };

        // Cast to EventListener for TS compatibility
        document.addEventListener('show-toast', handler as unknown as EventListener);
        return () => document.removeEventListener('show-toast', handler as unknown as EventListener);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col space-y-2 pointer-events-none items-center">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
            ))}
        </div>
    );
};

export const useToast = () => {
    return {
        addToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => {
            document.dispatchEvent(new CustomEvent('show-toast', {
                detail: { ...toast, id: toast.id || crypto.randomUUID() }
            }));
        }
    };
};