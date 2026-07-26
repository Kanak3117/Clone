"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchApi } from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { User } from '@/types';
import { Search } from 'lucide-react';
import { getAvatarColorClass, getInitials } from '@/lib/avatar';

interface NewGroupModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewGroupModal({ open, onOpenChange }: NewGroupModalProps) {
    const { fetchConversations, setActiveConversation } = useChatStore();
    const [step, setStep] = useState<1 | 2>(1);
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) {
            setStep(1);
            setName('');
            setAvatarUrl('');
            setSearch('');
            setResults([]);
            setSelectedUsers([]);
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

    const toggleUser = (user: User) => {
        if (selectedUsers.some(u => u.id === user.id)) {
            setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetchApi('/conversations', {
                method: 'POST',
                body: JSON.stringify({ 
                    type: 'group',
                    name, 
                    avatar_url: avatarUrl || null, 
                    participant_ids: selectedUsers.map(u => u.id) 
                })
            });
            
            await fetchConversations();
            setActiveConversation(response.id);
            onOpenChange(false);
        } catch (e: any) {
            setError(e.message || "Failed to create group");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 bg-[var(--bg-primary)] border-[var(--border-line)]">
                <DialogHeader>
                    <DialogTitle className="text-[var(--text-primary)]">New Group</DialogTitle>
                    <DialogDescription className="text-[var(--text-secondary)]">Create a new group conversation.</DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-red-500">{error}</p>}

                {step === 1 ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="group-name" className="text-[var(--text-primary)]">Group Name</Label>
                            <Input
                                id="group-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Group Name"
                                className="bg-[var(--surface)] border-none focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus-visible:ring-offset-0 text-[var(--text-primary)]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatar-url" className="text-[var(--text-primary)]">Avatar URL (optional)</Label>
                            <Input
                                id="avatar-url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://..."
                                className="bg-[var(--surface)] border-none focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus-visible:ring-offset-0 text-[var(--text-primary)]"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users to add..."
                                autoComplete="off"
                                className="pl-9 bg-[var(--surface)] border-none focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus-visible:ring-offset-0 text-[var(--text-primary)]"
                            />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
                            {results.map(user => (
                                <div 
                                    key={user.id} 
                                    className="flex items-center gap-3 p-2 hover:bg-[var(--hover-tint)] rounded-lg cursor-pointer transition-colors"
                                    onClick={() => toggleUser(user)}
                                >
                                    <Checkbox 
                                        checked={selectedUsers.some(u => u.id === user.id)} 
                                        onCheckedChange={() => toggleUser(user)}
                                    />
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={user.avatar_url || ''} />
                                        <AvatarFallback className={`text-white ${getAvatarColorClass(user.id)}`}>
                                            {getInitials(user.display_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-[var(--text-primary)] text-sm">{user.display_name}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">@{user.username}</p>
                                    </div>
                                </div>
                            ))}
                            {search && results.length === 0 && (
                                <p className="text-center text-sm text-[var(--text-secondary)] py-4">No users found</p>
                            )}
                        </div>
                        
                        {selectedUsers.length > 0 && (
                            <div className="pt-2 border-t border-[var(--border-line)]">
                                <p className="text-xs text-[var(--text-secondary)] mb-2">{selectedUsers.length} selected</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map(u => (
                                        <div key={u.id} className="bg-[var(--signal-blue)] text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            {u.display_name}
                                            <button onClick={() => toggleUser(u)} className="hover:opacity-80 font-bold ml-1 active:scale-[0.98] transition-transform">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <Button onClick={() => setStep(2)} disabled={!name.trim()} className="bg-[var(--signal-blue)] hover:bg-[var(--signal-blue-hover)] text-white rounded-full px-6 active:scale-[0.98] transition-all">
                            Next
                        </Button>
                    ) : (
                        <div className="flex justify-between w-full">
                            <Button onClick={() => setStep(1)} variant="ghost" className="rounded-full active:scale-[0.98] transition-all text-[var(--text-primary)] hover:bg-[var(--hover-tint)]">Back</Button>
                            <Button onClick={handleCreate} disabled={isLoading} className="bg-[var(--signal-blue)] hover:bg-[var(--signal-blue-hover)] text-white rounded-full px-6 active:scale-[0.98] transition-all">
                                {isLoading ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
