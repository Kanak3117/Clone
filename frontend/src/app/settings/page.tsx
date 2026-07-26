"use client";

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';

const PRESET_AVATARS = [
    'https://api.dicebear.com/9.x/notionists/svg?seed=Felix',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Aneka',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Brooklynn',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Jude',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Adrian',
    'https://api.dicebear.com/9.x/notionists/svg?seed=Zoey'
];

export default function SettingsPage() {
    const router = useRouter();
    const { user, logout, fetchMe } = useAuthStore();
    const [isDark, setIsDark] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    useEffect(() => {
        if (user?.avatar_url) {
            setSelectedAvatar(user.avatar_url);
        } else {
            setSelectedAvatar(PRESET_AVATARS[0]);
        }
    }, [user]);

    const toggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        if (next) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const handleAvatarChange = async (url: string) => {
        setSelectedAvatar(url);
        setIsUpdating(true);
        try {
            await fetchApi('/users/me', {
                method: 'PATCH',
                body: JSON.stringify({ avatar_url: url })
            });
            await fetchMe();
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="flex h-screen bg-white dark:bg-[#121212]">
            <div className="w-full max-w-2xl mx-auto p-6 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/chats" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold">Settings</h1>
                </div>

                <div className="space-y-8">
                    {/* Profile */}
                    <section className="bg-gray-50 dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Profile</h2>
                        
                        <div className="mb-6 space-y-2">
                            <Label>Avatar</Label>
                            <div className="flex flex-wrap gap-3 py-2">
                                {PRESET_AVATARS.map((url, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => handleAvatarChange(url)}
                                        disabled={isUpdating}
                                        className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all ${
                                            selectedAvatar === url 
                                                ? 'border-[#3A76F0] scale-110 shadow-md' 
                                                : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                                        } ${isUpdating ? 'cursor-not-allowed opacity-50' : ''}`}
                                    >
                                        <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="text-gray-500">Display Name</Label>
                                <Input value={user?.display_name || ''} readOnly className="mt-1 bg-white dark:bg-[#252525]" />
                            </div>
                            <div>
                                <Label className="text-gray-500">Username</Label>
                                <Input value={user?.username || ''} readOnly className="mt-1 bg-white dark:bg-[#252525]" />
                            </div>
                        </div>
                    </section>

                    {/* Appearance */}
                    <section className="bg-gray-50 dark:bg-[#1a1a1a] p-6 rounded-2xl shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Dark Mode</span>
                            <Button onClick={toggleTheme} variant="outline" className="rounded-full w-12 h-12 p-0">
                                {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </Button>
                        </div>
                    </section>

                    {/* Actions */}
                    <section className="pt-4">
                        <Button 
                            onClick={async () => {
                                await logout();
                                router.push('/login');
                            }} 
                            variant="destructive" 
                            className="w-full rounded-full h-12"
                        >
                            Log Out
                        </Button>
                    </section>
                </div>
            </div>
        </div>
    );
}
