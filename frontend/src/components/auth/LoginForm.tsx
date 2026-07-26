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

const loginSchema = z.object({
    identifier: z.string().min(1, 'Username or Phone is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
    const router = useRouter();
    const fetchMe = useAuthStore(state => state.fetchMe);
    const [step, setStep] = useState<1 | 2>(1);
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { identifier: '' },
    });

    const onSubmitStep1 = async (data: LoginFormValues) => {
        setIsLoading(true);
        setError(null);
        try {
            // Initiate login request to get OTP... Wait, our mock OTP is always 123456
            // The backend doesn't have an "initiate login" endpoint in phase 1, just a direct login endpoint that takes both
            // Actually, we simulate "requesting OTP" locally for the UI flow
            setIdentifier(data.identifier);
            setStep(2);
        } catch (e: any) {
            setError(e.message || "Failed to continue");
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
                    {step === 1 ? 'Welcome back' : 'Enter code'}
                </CardTitle>
                <CardDescription className="text-center">
                    {step === 1 
                        ? 'Enter your username or phone number'
                        : `Sent to ${identifier}`
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
                            <Label htmlFor="identifier">Username or Phone</Label>
                            <Input
                                id="identifier"
                                placeholder="alice or +1234567890"
                                {...form.register('identifier')}
                                className="h-12 bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-gray-800"
                            />
                            {form.formState.errors.identifier && (
                                <p className="text-sm text-red-500">{form.formState.errors.identifier.message}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full h-12 bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-xl text-md mt-4" disabled={isLoading}>
                            {isLoading ? 'Continuing...' : 'Continue'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={onSubmitStep2} className="space-y-6">
                        <div className="flex justify-center">
                            <OTPInput length={6} value={otp} onChange={setOtp} disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-xl text-md" disabled={isLoading || otp.length !== 6}>
                            {isLoading ? 'Verifying...' : 'Verify'}
                        </Button>
                        <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            Back to login
                        </button>
                    </form>
                )}
            </CardContent>
            {step === 1 && (
                <CardFooter className="flex justify-center">
                    <div className="text-center text-sm mt-4 text-gray-500">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-[#3A76F0] hover:underline">
                            Register
                        </Link>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
