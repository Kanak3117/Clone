"use client";

import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';
import { Input } from '@/components/ui/input';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
}

export function OTPInput({ length = 6, value, onChange, disabled = false }: OTPInputProps) {
    const [otp, setOtp] = useState<string[]>(value.split('').slice(0, length).concat(Array(Math.max(0, length - value.length)).fill('')));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const val = e.target.value;
        if (/[^0-9]/.test(val)) return; // only digits

        const newOtp = [...otp];
        newOtp[index] = val.substring(val.length - 1);
        setOtp(newOtp);
        onChange(newOtp.join(''));

        if (val && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
        if (!pastedData) return;

        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);
        onChange(newOtp.join(''));

        const focusIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
    };

    return (
        <div className="flex gap-2 justify-between">
            {Array.from({ length }).map((_, index) => (
                <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{1}"
                    maxLength={1}
                    value={otp[index] || ''}
                    onChange={(e) => handleChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className="w-12 h-14 text-center text-xl font-semibold bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-[#3A76F0] focus:border-[#3A76F0]"
                />
            ))}
        </div>
    );
}
