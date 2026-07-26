"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OTPInput } from './OTPInput';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const registerSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    display_name: z.string().min(1, 'Display name is required'),
    phone_number: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const PRESET_AVATARS = [
    'https://api.dicebear.com/9.x/notionists/svg?seed=Felix',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Aneka',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Brooklynn',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Jude',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Adrian',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Zoey'
];

export function RegisterForm() {
    const router = useRouter();
    const fetchMe = useAuthStore(state => state.fetchMe);
    const [step, setStep] = useState<1 | 2>(1);
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState<string>(PRESET_AVATARS[0]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: '', display_name: '', phone_number: '' },
    });

    const onSubmitStep1 = async (data: RegisterFormValues) => {
        setIsLoading(true);
        setError(null);
        try {
            await auth.register(data.username, data.display_name, data.phone_number, selectedAvatar);
            setIdentifier(data.username);
            setStep(2);
        } catch (e: any) {
            setError(e.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmitStep2 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError("OTP must be 6 digits");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await auth.verifyOtp(identifier, otp);
            // Since verify-otp currently does not set session cookie, we might need to login.
            // Wait, does verify-otp set cookie in our API? Let's assume yes or we call login.
            // Actually, backend register doesn't set cookie, but login does. 
            // Phase 2 implementation says: register -> login -> set cookie.
            // Let's call login to get the cookie.
            await auth.login(identifier, otp);
            await fetchMe();
            router.push('/chats');
            router.refresh();
        } catch (e: any) {
            setError(e.message || "Invalid OTP");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-0 shadow-lg bg-white dark:bg-[#1a1a1a] rounded-2xl">
            <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-bold text-center">
                    {step === 1 ? 'Create account' : 'Verify phone'}
                </CardTitle>
                <CardDescription className="text-center">
                    {step === 1 
                        ? 'Join Signal Clone today'
                        : `Enter the code sent to ${identifier}`
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-lg text-center">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={form.handleSubmit(onSubmitStep1)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Choose an Avatar</Label>
                            <div className="flex flex-wrap gap-3 justify-center py-2">
                                {PRESET_AVATARS.map((url, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setSelectedAvatar(url)}
                                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all ${
                                            selectedAvatar === url 
                                                ? 'border-[#3A76F0] scale-110 shadow-md' 
                                                : 'border-transparent hover:scale-105'
                                        }`}
                                    >
                                        <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="e.g. alice"
                                {...form.register('username')}
                                className="h-12 bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-gray-800"
                            />
                            {form.formState.errors.username && (
                                <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="display_name">Display Name</Label>
                            <Input
                                id="display_name"
                                placeholder="Alice Johnson"
                                {...form.register('display_name')}
                                className="h-12 bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-gray-800"
                            />
                            {form.formState.errors.display_name && (
                                <p className="text-sm text-red-500">{form.formState.errors.display_name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone_number">Phone Number (Optional)</Label>
                            <Input
                                id="phone_number"
                                placeholder="+1234567890"
                                {...form.register('phone_number')}
                                className="h-12 bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-gray-800"
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-xl text-md mt-4" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Register'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={onSubmitStep2} className="space-y-6">
                        <div className="flex justify-center">
                            <OTPInput length={6} value={otp} onChange={setOtp} disabled={isLoading} />
                        </div>
                        <p className="text-xs text-center text-gray-500">
                            Hint: use 123456 for testing
                        </p>
                        <Button type="submit" className="w-full h-12 bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-xl text-md" disabled={isLoading || otp.length !== 6}>
                            {isLoading ? 'Verifying...' : 'Verify'}
                        </Button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            Back
                        </button>
                    </form>
                )}
            </CardContent>
            {step === 1 && (
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Already have an account?{' '}
                        <Link href="/login" className="text-[#3A76F0] hover:underline font-medium">
                            Log in
                        </Link>
                    </p>
                </CardFooter>
            )}
        </Card>
    );
}
