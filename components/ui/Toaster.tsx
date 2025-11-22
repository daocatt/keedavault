import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types';

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
      const handler = (e: CustomEvent<ToastMessage>) => {
          const newToast = { ...e.detail, id: e.detail.id || Date.now().toString() };
          setToasts(prev => [...prev, newToast]);
          
          // Auto dismiss
          setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== newToast.id));
          }, 3000);
      };
      
      // Cast to EventListener for TS compatibility
      document.addEventListener('show-toast', handler as unknown as EventListener);
      return () => document.removeEventListener('show-toast', handler as unknown as EventListener);
  }, []);

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div 
            key={toast.id} 
            className="pointer-events-auto flex items-center p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[300px] animate-in slide-in-from-right-full fade-in duration-300"
        >
           {toast.type === 'success' && <CheckCircle size={20} className="text-green-500 mr-3" />}
           {toast.type === 'error' && <AlertCircle size={20} className="text-red-500 mr-3" />}
           {toast.type === 'info' && <Info size={20} className="text-blue-500 mr-3" />}
           <span className="text-sm font-medium text-gray-800 flex-1">{toast.title}</span>
           <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 ml-2">
               <X size={16} />
           </button>
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
    return {
        addToast: (toast: Omit<ToastMessage, 'id'> & { id?: string }) => {
            document.dispatchEvent(new CustomEvent('show-toast', { 
                detail: { ...toast, id: toast.id || Date.now().toString() } 
            }));
        }
    };
};