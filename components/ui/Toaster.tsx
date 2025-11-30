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
            className={`pointer-events-auto flex items-center p-3 rounded-xl shadow-lg border backdrop-blur-md min-w-[320px] max-w-[420px] transition-all duration-300 ${isExiting ? 'opacity-0 translate-y-2 scale-95' : 'animate-in slide-in-from-bottom-5 fade-in zoom-in-95'
                }`}
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-border-medium)',
                color: 'var(--color-text-primary)'
            }}
        >
            {toast.type === 'success' && (
                <div className="p-1.5 rounded-lg mr-3" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                    <CheckCircle size={18} strokeWidth={2} />
                </div>
            )}
            {toast.type === 'error' && (
                <div className="p-1.5 rounded-lg mr-3" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <AlertCircle size={18} strokeWidth={2} />
                </div>
            )}
            {toast.type === 'info' && (
                <div className="p-1.5 rounded-lg mr-3" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                    <Info size={18} strokeWidth={2} />
                </div>
            )}
            <div className="flex-1 mr-2">
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{toast.title}</div>
                {toast.description && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{toast.description}</div>
                )}
            </div>
            <button
                onClick={() => { setIsExiting(true); setTimeout(() => onDismiss(toast.id), 300); }}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <X size={14} strokeWidth={2} />
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