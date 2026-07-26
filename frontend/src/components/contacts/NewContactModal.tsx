"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';

interface NewContactModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewContactModal({ open, onOpenChange }: NewContactModalProps) {
    const { fetchConversations, setActiveConversation } = useChatStore();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        if (!open) {
            setSearch('');
            setResults([]);
            setSelectedUser(null);
            setError('');
        }
    }, [open]);

    useEffect(() => {
        if (!search.trim()) {
            setResults([]);
            return;
        }
        
        const delay = setTimeout(async () => {
            try {
                const data = await fetchApi(`/users?search=${encodeURIComponent(search)}`);
                setResults(data || []);
            } catch (e) {
                console.error("Failed to search users", e);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [search]);

    const handleStartChat = async () => {
        if (!selectedUser) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetchApi('/conversations', {
                method: 'POST',
                body: JSON.stringify({ 
                    type: 'direct',
                    participant_ids: [selectedUser.id] 
                })
            });
            
            await fetchConversations();
            setActiveConversation(response.id);
            onOpenChange(false);
        } catch (e: any) {
            setError(e.message || "Failed to start chat");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl p-6">
                <DialogHeader>
                    <DialogTitle>New Chat</DialogTitle>
                    <DialogDescription>Search for a user to start chatting.</DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or username"
                            autoComplete="off"
                            className="pl-9"
                        />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {results.map(user => (
                            <div 
                                key={user.id} 
                                onClick={() => setSelectedUser(user)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedUser?.id === user.id 
                                        ? 'bg-[#3A76F0]/10 border border-[#3A76F0]' 
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                                }`}
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar_url || ''} />
                                    <AvatarFallback>{user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm">{user.display_name}</p>
                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                </div>
                            </div>
                        ))}
                        {search && results.length === 0 && (
                            <p className="text-center text-sm text-gray-500 py-4">No users found</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        onClick={handleStartChat} 
                        disabled={!selectedUser || isLoading} 
                        className="bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-full px-6"
                    >
                        {isLoading ? 'Starting...' : 'Start Chat'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
