import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordPromptModalProps {
    isOpen: boolean;
    title?: string;
    description?: string;
    onClose: () => void;
    onConfirm: (password: string) => void;
}

export const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({
    isOpen,
    title = 'Enter Password',
    description = 'Please enter the password to unlock this file.',
    onClose,
    onConfirm
}) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(password);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden border border-gray-200/60 shadow-2xl transform transition-all">
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5">
                    <p className="text-sm text-gray-500 mb-4">{description}</p>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="text-gray-400" />
                        </div>
                        <input
                            ref={inputRef}
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="Password"
                            autoFocus
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <div className="mt-6 flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!password}
                            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Unlock
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
