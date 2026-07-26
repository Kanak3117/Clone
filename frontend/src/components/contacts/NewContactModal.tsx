"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchApi } from '@/lib/api';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import { getAvatarColorClass, getInitials } from '@/lib/avatar';

interface NewContactModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NewContactModal({ open, onOpenChange }: NewContactModalProps) {
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
        if (!search.trim()) return;
        
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

    const handleAddContact = async () => {
        if (!selectedUser) return;
        setIsLoading(true);
        setError('');
        try {
            await fetchApi('/contacts', {
                method: 'POST',
                body: JSON.stringify({ 
                    contact_user_id: selectedUser.id 
                })
            });
            
            onOpenChange(false);
        } catch (e: any) {
            setError(e.message || "Failed to add contact");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] rounded-2xl p-6 bg-[var(--bg-primary)] border-[var(--border-line)]">
                <DialogHeader>
                    <DialogTitle className="text-[var(--text-primary)]">Add New Contact</DialogTitle>
                    <DialogDescription className="text-[var(--text-secondary)]">Search for a user to add to your contacts.</DialogDescription>
                </DialogHeader>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] w-4 h-4" />
                        <Input
                            value={search}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearch(val);
                                if (!val.trim()) setResults([]);
                            }}
                            placeholder="Search by name or username"
                            autoComplete="off"
                            className="pl-9 bg-[var(--surface)] border-none focus-visible:ring-2 focus-visible:ring-[var(--signal-blue)] focus-visible:ring-offset-0 text-[var(--text-primary)]"
                        />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
                        {results.map(user => (
                            <div 
                                key={user.id} 
                                onClick={() => setSelectedUser(user)}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                    selectedUser?.id === user.id 
                                        ? 'bg-[var(--active-tint)] ring-2 ring-[var(--signal-blue)]' 
                                        : 'hover:bg-[var(--hover-tint)] ring-2 ring-transparent'
                                }`}
                            >
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
                </div>

                <DialogFooter>
                    <Button 
                        onClick={handleAddContact} 
                        disabled={!selectedUser || isLoading} 
                        className="bg-[var(--signal-blue)] hover:bg-[var(--signal-blue-hover)] text-white rounded-full px-6 active:scale-[0.98] transition-all"
                    >
                        {isLoading ? 'Adding...' : 'Add Contact'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
