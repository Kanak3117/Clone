"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types';
import { Search, UserPlus } from 'lucide-react';

interface GroupInfoModalProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GroupInfoModal({ conversationId, open, onOpenChange }: GroupInfoModalProps) {
    const { conversations, fetchConversations } = useChatStore();
    const { user: currentUser } = useAuthStore();
    
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);

    const conversation = conversations.find(c => c.id === conversationId);
    
    useEffect(() => {
        if (!open) {
            setSearch('');
            setResults([]);
            setShowAddMember(false);
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

    if (!conversation) return null;

    const isAdmin = conversation.participants.some(p => p.user_id === currentUser?.id && p.role === 'admin');

    const handleRemoveMember = async (userId: string) => {
        setIsLoading(true);
        try {
            await fetchApi(`/conversations/${conversationId}/members/${userId}`, {
                method: 'DELETE'
            });
            await fetchConversations();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async (userId: string) => {
        setIsLoading(true);
        try {
            await fetchApi(`/conversations/${conversationId}/members`, {
                method: 'POST',
                body: JSON.stringify({ user_id: userId })
            });
            await fetchConversations();
            setSearch('');
            setResults([]);
            setShowAddMember(false);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden">
                <div className="bg-gray-50 dark:bg-[#1a1a1a] p-6 text-center flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={conversation.avatar_url || ''} />
                        <AvatarFallback className="bg-[#3A76F0] text-white text-3xl">
                            {conversation.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <DialogTitle className="text-xl font-bold">{conversation.name}</DialogTitle>
                    <p className="text-sm text-gray-500 mt-1">
                        {conversation.participants.length} members
                    </p>
                </div>
                
                <div className="p-4 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Members</h3>
                        {isAdmin && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs text-[#3A76F0] hover:text-[#3266d6] hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                onClick={() => setShowAddMember(!showAddMember)}
                            >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Add Member
                            </Button>
                        )}
                    </div>
                    
                    {showAddMember && (
                        <div className="mb-4 px-2 space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search users to add..."
                                    autoComplete="off"
                                    className="pl-9 h-9 text-sm"
                                />
                            </div>
                            {search && (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                    {results.filter(u => !conversation.participants.some(p => p.user_id === u.id)).map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.avatar_url || ''} />
                                                    <AvatarFallback className="text-xs">{user.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="text-xs">
                                                    <p className="font-medium">{user.display_name}</p>
                                                    <p className="text-gray-500">@{user.username}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleAddMember(user.id)}
                                                disabled={isLoading}
                                                className="h-7 text-xs bg-[#3A76F0] hover:bg-[#3266d6] text-white"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    ))}
                                    {results.filter(u => !conversation.participants.some(p => p.user_id === u.id)).length === 0 && (
                                        <p className="text-center text-xs text-gray-500 py-3">No new users found</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        {conversation.participants.map(p => {
                            const isSelf = p.user_id === currentUser?.id;
                            return (
                                <div key={p.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={p.avatar_url || ''} />
                                            <AvatarFallback>{p.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {p.display_name} {isSelf && '(You)'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {p.role === 'admin' ? 'Admin' : 'Member'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {isAdmin && !isSelf && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 text-xs"
                                            onClick={() => handleRemoveMember(p.user_id)}
                                            disabled={isLoading}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
