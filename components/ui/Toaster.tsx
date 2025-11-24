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
            className={`pointer-events-auto flex items-start p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[300px] transition-all duration-300 ${isExiting ? 'opacity-0 translate-x-full' : 'animate-in slide-in-from-right-full fade-in'
                }`}
        >
            {toast.type === 'success' && <CheckCircle size={20} className="text-green-500 mr-3 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-red-500 mr-3 mt-0.5" />}
            {toast.type === 'info' && <Info size={20} className="text-blue-500 mr-3 mt-0.5" />}
            <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{toast.title}</div>
                {toast.description && (
                    <div className="text-xs text-gray-600 mt-1">{toast.description}</div>
                )}
            </div>
            <button onClick={() => { setIsExiting(true); setTimeout(() => onDismiss(toast.id), 300); }} className="text-gray-400 hover:text-gray-600 ml-2">
                <X size={16} />
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
        <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
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