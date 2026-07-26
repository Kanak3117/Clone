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
            <DialogContent className="sm:max-w-[425px] rounded-2xl p-6">
                <DialogHeader>
                    <DialogTitle>New Group</DialogTitle>
                    <DialogDescription>Create a new group conversation.</DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-red-500">{error}</p>}

                {step === 1 ? (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="group-name">Group Name</Label>
                            <Input
                                id="group-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Group Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avatar-url">Avatar URL (optional)</Label>
                            <Input
                                id="avatar-url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users to add..."
                                autoComplete="off"
                                className="pl-9"
                            />
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {results.map(user => (
                                <div 
                                    key={user.id} 
                                    className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                                    onClick={() => toggleUser(user)}
                                >
                                    <Checkbox 
                                        checked={selectedUsers.some(u => u.id === user.id)} 
                                        onCheckedChange={() => toggleUser(user)}
                                    />
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
                        
                        {selectedUsers.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                <p className="text-xs text-gray-500 mb-2">{selectedUsers.length} selected</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map(u => (
                                        <div key={u.id} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                            {u.display_name}
                                            <button onClick={() => toggleUser(u)} className="hover:text-blue-500 font-bold ml-1">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {step === 1 ? (
                        <Button onClick={() => setStep(2)} disabled={!name.trim()} className="bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-full px-6">
                            Next
                        </Button>
                    ) : (
                        <div className="flex justify-between w-full">
                            <Button onClick={() => setStep(1)} variant="ghost" className="rounded-full">Back</Button>
                            <Button onClick={handleCreate} disabled={isLoading} className="bg-[#3A76F0] hover:bg-[#3266d6] text-white rounded-full px-6">
                                {isLoading ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
