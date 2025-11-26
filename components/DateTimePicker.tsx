import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export interface DateTimePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange }) => {
    // Handle date selection
    const handleDateSelect = (date: Date | undefined) => {
        if (!date) {
            onChange(null);
            return;
        }

        // Preserve time from existing value or default to current time/00:00
        const newDate = new Date(date);
        if (value) {
            newDate.setHours(value.getHours());
            newDate.setMinutes(value.getMinutes());
        } else {
            const now = new Date();
            newDate.setHours(now.getHours());
            newDate.setMinutes(now.getMinutes());
        }
        onChange(newDate);
    };

    // Handle time change
    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeStr = e.target.value;
        if (!timeStr) return;

        const [hours, minutes] = timeStr.split(':').map(Number);
        const newDate = value ? new Date(value) : new Date();
        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        onChange(newDate);
    };

    const timeValue = value ? format(value, 'HH:mm') : '';

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative flex items-center cursor-pointer group">
                    {/* Left Icon */}
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CalendarIcon size={16} className={cn("transition-colors", value ? "text-indigo-600" : "text-gray-500")} />
                    </div>

                    {/* Display Input */}
                    <div
                        className={cn(
                            "w-full pl-10 pr-8 py-2.5 text-sm rounded-lg border transition-all bg-white",
                            value
                                ? "border-indigo-200 text-gray-900 hover:border-indigo-300"
                                : "border-gray-300 text-gray-400 hover:border-gray-400"
                        )}
                    >
                        {value ? format(value, 'PPP HH:mm') : "Select expiry date..."}
                    </div>

                    {/* Clear Button */}
                    {value && (
                        <div
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(null);
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 z-10"
                        >
                            <X size={14} />
                        </div>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-border-light bg-bg-primary z-[10000]" align="start">
                <div className="p-3 border-b border-border-light">
                    <Calendar
                        mode="single"
                        selected={value || undefined}
                        onSelect={handleDateSelect}
                        initialFocus
                    />
                </div>
                <div className="p-3 bg-bg-tertiary flex items-center gap-2">
                    <Clock size={16} className="text-gray-500" />
                    <input
                        type="time"
                        className="flex-1 bg-transparent border border-border-medium rounded-md px-2 py-1 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                        value={timeValue}
                        onChange={handleTimeChange}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};
