import React from 'react';
import { ICONS_MAP } from '../constants';
import { Check } from 'lucide-react';

interface IconSelectorProps {
    selectedIcon: number;
    onSelect: (icon: number) => void;
    className?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelect, className = '' }) => {
    return (
        <div className={`flex flex-col ${className}`}>
            <div className="grid grid-cols-6 gap-2 p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {Object.entries(ICONS_MAP).map(([idStr, Icon]) => {
                    const id = parseInt(idStr);
                    const isSelected = selectedIcon === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onSelect(id)}
                            className={`p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 relative group ${isSelected
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-500/20'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:scale-105'
                                }`}
                            title={`Icon ${id}`}
                        >
                            <Icon
                                size={22}
                                strokeWidth={isSelected ? 2.5 : 2}
                                fill={isSelected ? "currentColor" : "none"}
                                fillOpacity={isSelected ? 0.2 : 0}
                            />
                            {isSelected && (
                                <div className="absolute top-0.5 right-0.5 bg-indigo-600 text-white rounded-full p-[1px] shadow-sm">
                                    <Check size={8} strokeWidth={4} />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
