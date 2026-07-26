"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types';
import { Search, UserPlus } from 'lucide-react';
import { getAvatarColorClass, getInitials } from '@/lib/avatar';

interface GroupInfoModalProps {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GroupInfoModal({ conversationId, open, onOpenChange }: GroupInfoModalProps) {
    const { conversations, fetchConversations, updateChatColor } = useChatStore();
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

    const CHAT_COLORS = [
        '#3A76F0', // Signal Blue
        '#E64C3C', // Crimson
        '#F24E1E', // Vermilion
        '#D9A441', // Amber
        '#2E8B57', // Forest
        '#20B2AA', // Teal
        '#8A2BE2', // Violet
        '#DDA0DD'  // Plum
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden">
                <div className="bg-[var(--surface)] p-6 text-center flex flex-col items-center border-b border-[var(--border-line)]">
                    <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={conversation.avatar_url || ''} />
                        <AvatarFallback className={`text-white text-3xl ${getAvatarColorClass(conversation.id)}`}>
                            {getInitials(conversation.name)}
                        </AvatarFallback>
                    </Avatar>
                    <DialogTitle className="text-xl font-bold text-[var(--text-primary)]">{conversation.name}</DialogTitle>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {conversation.participants.length} members
                    </p>
                </div>

                <div className="p-4 border-b border-[var(--border-line)]">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-3">Chat Color</h3>
                    <div className="flex flex-wrap gap-3">
                        {CHAT_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => updateChatColor(conversationId, color)}
                                className="w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-transform active:scale-[0.95]"
                                style={{ backgroundColor: color }}
                                aria-label={`Select color ${color}`}
                            >
                                {(conversation.chat_color || '#3A76F0') === color && (
                                    <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="p-4 max-h-[400px] overflow-y-auto scrollbar-thin">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">Members</h3>
                        {isAdmin && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs text-[var(--signal-blue)] hover:text-[var(--signal-blue-hover)] hover:bg-[var(--hover-tint)] active:scale-[0.98] transition-all"
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search users to add..."
                                    autoComplete="off"
                                    className="pl-9 h-9 text-sm bg-[var(--surface)] border-none focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus-visible:ring-offset-0"
                                />
                            </div>
                            {search && (
                                <div className="border border-[var(--border-line)] rounded-lg overflow-hidden max-h-40 overflow-y-auto scrollbar-thin">
                                    {results.filter(u => !conversation.participants.some(p => p.user_id === u.id)).map(user => (
                                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-[var(--hover-tint)] transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.avatar_url || ''} />
                                                    <AvatarFallback className={`text-white text-xs ${getAvatarColorClass(user.id)}`}>
                                                        {getInitials(user.display_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="text-xs">
                                                    <p className="font-medium text-[var(--text-primary)]">{user.display_name}</p>
                                                    <p className="text-[var(--text-secondary)]">@{user.username}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleAddMember(user.id)}
                                                disabled={isLoading}
                                                className="h-7 text-xs bg-[var(--signal-blue)] hover:bg-[var(--signal-blue-hover)] text-white active:scale-[0.98] transition-transform"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    ))}
                                    {results.filter(u => !conversation.participants.some(p => p.user_id === u.id)).length === 0 && (
                                        <p className="text-center text-xs text-[var(--text-secondary)] py-3">No new users found</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        {conversation.participants.map(p => {
                            const isSelf = p.user_id === currentUser?.id;
                            return (
                                <div key={p.id} className="flex items-center justify-between p-2 hover:bg-[var(--hover-tint)] rounded-lg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={p.avatar_url || ''} />
                                            <AvatarFallback className={`text-white ${getAvatarColorClass(p.user_id)}`}>
                                                {getInitials(p.display_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)] text-sm">
                                                {p.display_name} {isSelf && <span className="text-[var(--text-secondary)] font-normal">(You)</span>}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {p.role === 'admin' ? 'Admin' : 'Member'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {isAdmin && !isSelf && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-[#E64C3C] hover:text-[#E64C3C] hover:bg-[#E64C3C]/10 h-8 text-xs active:scale-[0.98] transition-transform"
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
